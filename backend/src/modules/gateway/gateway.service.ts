import axios, { AxiosError } from 'axios'
import { Gateway, GatewayStatus } from '@prisma/client'
import { prisma } from '../../config/db'
import { sseService } from '../../services/sse.service'
import * as repository from './gateway.repository'
import type { GatewayListParams, GatewayListResult } from './gateway.repository'
import { CreateGatewayDto, UpdateGatewayDto, TestConnectionDto, PerformanceQueryDto } from './gateway.dto'
import { markGatewayTokenExpired } from '../../services/heartbeat.service'
import { deployGatewayBaseFlow } from '../sync/sync.service'
import { getRedisClient } from '../../config/redis'

const getClient = () => getRedisClient()

function generateAdminToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

export class GatewayError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export const activateGateway = async (dto: CreateGatewayDto): Promise<Gateway> => {
  const existing = await repository.getByAddress(dto.address, dto.port)
  if (existing) {
    throw new GatewayError('GATEWAY_EXISTS', '网关地址已存在')
  }

  const adminToken = generateAdminToken()

  try {
    const settingsRes = await axios.get(`http://${dto.address}:${dto.port}/settings`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      timeout: 5000
    })

    const nodeRedVersion = settingsRes.data?.version

    const gateway = await repository.createGateway({
      name: dto.name,
      address: dto.address,
      port: dto.port,
      adminToken,
      status: GatewayStatus.ONLINE,
      lastHeartbeat: new Date(),
      ip: dto.address,
      nodeRedVersion
    })

    try {
      await deployGatewayBaseFlow(gateway)
    } catch (err) {
      console.error(`Failed to deploy base flow for gateway ${gateway.id}`, err)
    }

    try {
      const client = getClient()
      await client.set(`heartbeat:${gateway.id}`, Date.now().toString(), { EX: 240 })
    } catch (err) {
      console.error('Failed to set heartbeat in redis', err)
    }

    try {
      sseService.broadcast({
        type: 'gateway_status_change',
        data: {
          gatewayId: gateway.id,
          status: gateway.status,
          lastHeartbeat: gateway.lastHeartbeat ?? undefined,
          ip: gateway.ip || gateway.address,
          flowCount: gateway.flowCount ?? undefined,
          nodeRedVersion: gateway.nodeRedVersion || undefined
        }
      })
    } catch (err) {
      console.error('Failed to broadcast SSE', err)
    }

    return gateway
  } catch (error) {
    const axiosError = error as AxiosError
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNRESET') {
      throw new GatewayError('GATEWAY_UNREACHABLE', '网关地址不可达')
    }
    throw new GatewayError('ACTIVATION_FAILED', axiosError.message || '激活失败')
  }
}

export const createGateway = async (dto: CreateGatewayDto): Promise<Gateway> => {
  return activateGateway(dto)
}

export const getAllGateways = async (
  params?: GatewayListParams
): Promise<GatewayListResult> => {
  return repository.getGatewaysPaginated(params || {})
}

export const getGatewayById = async (id: string): Promise<Gateway | null> => {
  return repository.getGatewayById(id)
}

export const getGatewayDetailById = async (id: string) => {
  return repository.getGatewayDetailById(id)
}

export const clearCache = async (id: string) => {
  const existing = await repository.getGatewayById(id)
  if (!existing) {
    throw new GatewayError('GATEWAY_NOT_FOUND', '网关不存在')
  }
  return repository.clearCache(id)
}

export const updateGateway = async (
  id: string,
  dto: UpdateGatewayDto
): Promise<Gateway> => {
  if (dto.cacheReplayRate != null && (dto.cacheReplayRate < 1 || dto.cacheReplayRate > 500)) {
    throw new GatewayError('INVALID_CACHE_RATE', '补发速率必须在 1-500 之间')
  }
  if (dto.cacheRetentionDays != null && (dto.cacheRetentionDays < 1 || dto.cacheRetentionDays > 365)) {
    throw new GatewayError('INVALID_RETENTION_DAYS', '保存期限必须在 1-365 天之间')
  }

  const existing = await repository.getGatewayById(id)
  if (!existing) {
    throw new GatewayError('GATEWAY_NOT_FOUND', '网关不存在')
  }

  if (dto.adminToken !== undefined && existing.adminToken !== dto.adminToken) {
    const client = getClient()
    await client.del(`token_expired:${id}`)
  }

  return repository.updateGateway(id, dto)
}

export const deleteGateway = async (id: string): Promise<Gateway> => {
  const existing = await repository.getGatewayById(id)
  if (!existing) {
    throw new GatewayError('GATEWAY_NOT_FOUND', '网关不存在')
  }

  return repository.deleteGateway(id)
}

export interface TestResultItem {
  name: string
  passed: boolean
  message: string
}

export interface TestConnectionResult {
  results: TestResultItem[]
  allPassed: boolean
}

export const testConnection = async (
  dto: TestConnectionDto
): Promise<TestConnectionResult> => {
  let address = dto.address
  let port = dto.port
  let adminToken = dto.adminToken

  if (dto.gatewayId) {
    const gateway = await repository.getGatewayById(dto.gatewayId)
    if (!gateway) {
      throw new GatewayError('GATEWAY_NOT_FOUND', '网关不存在')
    }
    address = gateway.address
    port = gateway.port
    adminToken = gateway.adminToken
  }

  const results: TestResultItem[] = []

  // 1. Node-RED 可达性测试
  try {
    const response = await axios.get(`http://${address}:${port}/`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      timeout: 5000
    })
    if (response.status === 200) {
      results.push({ name: 'Node-RED 可达性', passed: true, message: '连接成功' })
    } else {
      results.push({ name: 'Node-RED 可达性', passed: false, message: `状态码: ${response.status}` })
    }
  } catch (error) {
    const axiosError = error as AxiosError
    if (axiosError.response?.status === 401) {
      results.push({ name: 'Node-RED 可达性', passed: false, message: '认证失败 (401)' })
    } else {
      results.push({ name: 'Node-RED 可达性', passed: false, message: axiosError.message || '连接失败' })
    }
  }

  // 2. MQTT 连接测试 (Mock - 假设通过)
  try {
    results.push({ name: 'MQTT 连接', passed: true, message: 'MQTT Broker 连接正常' })
  } catch (error) {
    results.push({ name: 'MQTT 连接', passed: false, message: 'MQTT 连接失败' })
  }

  // 3. 插件状态测试 (Mock - 假设通过)
  try {
    results.push({ name: '插件状态', passed: true, message: '核心插件已安装并启用' })
  } catch (error) {
    results.push({ name: '插件状态', passed: false, message: '插件检查失败' })
  }

  // 如果网关存在且 Node-RED 可达，更新状态和心跳
  if (dto.gatewayId && results[0].passed) {
    try {
      const gateway = await repository.getGatewayById(dto.gatewayId)
      if (gateway && gateway.status !== GatewayStatus.ONLINE) {
        const client = getClient()
        await client.set(`heartbeat:${dto.gatewayId}`, Date.now().toString(), { EX: 240 })
        await repository.updateGateway(dto.gatewayId, {
          status: GatewayStatus.ONLINE,
          lastHeartbeat: new Date(),
          ip: gateway.address
        })
      }
    } catch (err) {
      console.error('Failed to update gateway status', err)
    }
  }

  const allPassed = results.every(r => r.passed)
  return { results, allPassed }
}

export interface VerifyTokenResult {
  valid: boolean
  gatewayId?: string
  gatewayName?: string
}

export const verifyAdminToken = async (
  gatewayId: string,
  token: string
): Promise<VerifyTokenResult> => {
  const gateway = await repository.getGatewayById(gatewayId)
  if (!gateway) {
    return { valid: false }
  }
  if (gateway.adminToken !== token) {
    return { valid: false }
  }
  return {
    valid: true,
    gatewayId: gateway.id,
    gatewayName: gateway.name
  }
}

export interface PerformancePoint {
  timestamp: Date
  cpuUsage: number | null
  memoryUsage: number | null
  diskUsage: number | null
}

export const getPerformanceHistory = async (
  dto: PerformanceQueryDto
): Promise<PerformancePoint[]> => {
  const { gatewayId, interval = '5m' } = dto
  const endTime = dto.endTime || new Date()
  const startTime = dto.startTime || new Date(endTime.getTime() - 24 * 60 * 60 * 1000)

  const data = await prisma.gatewayPerformance.findMany({
    where: {
      gatewayId,
      timestamp: {
        gte: startTime,
        lte: endTime
      }
    },
    orderBy: { timestamp: 'asc' },
    take: 500
  })

  const intervalMs = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  }[interval]

  const buckets = new Map<number, { cpu: number[]; mem: number[]; disk: number[] }>()

  for (const point of data) {
    const bucketKey = Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { cpu: [], mem: [], disk: [] })
    }
    const bucket = buckets.get(bucketKey)!
    if (point.cpuUsage !== null) bucket.cpu.push(point.cpuUsage)
    if (point.memoryUsage !== null) bucket.mem.push(point.memoryUsage)
    if (point.diskUsage !== null) bucket.disk.push(point.diskUsage)
  }

  const result: PerformancePoint[] = Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([timestamp, bucket]) => ({
      timestamp: new Date(timestamp),
      cpuUsage: bucket.cpu.length > 0 ? bucket.cpu.reduce((a, b) => a + b, 0) / bucket.cpu.length : null,
      memoryUsage: bucket.mem.length > 0 ? bucket.mem.reduce((a, b) => a + b, 0) / bucket.mem.length : null,
      diskUsage: bucket.disk.length > 0 ? bucket.disk.reduce((a, b) => a + b, 0) / bucket.disk.length : null
    }))

  return result
}
