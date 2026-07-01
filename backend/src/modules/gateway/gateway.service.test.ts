import * as service from './gateway.service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

jest.mock('axios', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn()
    }
  }
})

import axios from 'axios'
const mockedAxios = axios as jest.Mocked<typeof axios>

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
  })
}))

jest.mock('../sync/sync.service', () => ({
  deployGatewayBaseFlow: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('../../services/sse.service', () => ({
  sseService: {
    broadcast: jest.fn()
  }
}))

jest.mock('../../services/heartbeat.service', () => ({
  markGatewayTokenExpired: jest.fn().mockResolvedValue(undefined)
}))

beforeEach(async () => {
  jest.clearAllMocks()
  await prisma.$executeRaw`TRUNCATE TABLE "GatewayCacheStatus" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "GatewayPerformance" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "RegistrationCode" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "DeviceDataPoint" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "SyncRecord" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "DeviceInstance" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "Gateway" CASCADE`
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('activateGateway', () => {
  it('AC-003: 正常激活网关，返回 gateway 含 adminToken', async () => {
    ;(mockedAxios.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: { version: '3.1.0' }
    })

    const gateway = await service.activateGateway({
      name: '测试网关',
      address: '127.0.0.1',
      port: 1880
    })

    expect(gateway.id).toBeDefined()
    expect(gateway.adminToken).toMatch(/^[0-9a-f]{32}$/)
    expect(gateway.status).toBe('ONLINE')
    expect(gateway.name).toBe('测试网关')
  })

  it('AC-003b: 网关不可达，抛出 GATEWAY_UNREACHABLE', async () => {
    ;(mockedAxios.get as jest.Mock).mockRejectedValue({
      code: 'ECONNREFUSED',
      message: 'Connection refused'
    })

    await expect(
      service.activateGateway({ name: '测试', address: '192.168.99.99', port: 1880 })
    ).rejects.toMatchObject({ code: 'GATEWAY_UNREACHABLE' })
  })

  it('AC-003c: 重复激活相同地址，抛出 GATEWAY_EXISTS', async () => {
    ;(mockedAxios.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: { version: '3.1.0' }
    })

    await service.activateGateway({ name: '网关1', address: '127.0.0.1', port: 1880 })

    await expect(
      service.activateGateway({ name: '网关2', address: '127.0.0.1', port: 1880 })
    ).rejects.toMatchObject({ code: 'GATEWAY_EXISTS' })
  })

  it('AC-003: adminToken 是 32 位十六进制', async () => {
    ;(mockedAxios.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: { version: '3.1.0' }
    })

    const gateway = await service.activateGateway({
      name: '测试',
      address: '192.168.1.100',
      port: 1880
    })

    expect(gateway.adminToken).toMatch(/^[0-9a-f]{32}$/)
    expect(gateway.adminToken.length).toBe(32)
  })
})

describe('testConnection', () => {
  const testGateway = {
    name: '测试网关',
    address: '127.0.0.1',
    port: 1880,
    adminToken: 'abc123'
  }

  beforeEach(async () => {
    await prisma.gateway.create({ data: testGateway as any })
  })

  it('AC-004: 返回三项测试结果，allPassed 为 true', async () => {
    const gateway = await prisma.gateway.findFirstOrThrow()
    ;(mockedAxios.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: { version: '3.1.0' }
    })

    const result = await service.testConnection({ gatewayId: gateway.id, port: 1880 })

    expect(result.results).toBeDefined()
    expect(result.results.length).toBe(3)
    expect(result.allPassed).toBe(true)
    result.results.forEach((r: any) => {
      expect(r.name).toBeDefined()
      expect(typeof r.passed).toBe('boolean')
      expect(r.message).toBeDefined()
    })
  })

  it('AC-012: 一项失败时 allPassed=false，其他项仍返回', async () => {
    const gateway = await prisma.gateway.findFirstOrThrow()
    ;(mockedAxios.get as jest.Mock).mockRejectedValue({
      code: 'ECONNREFUSED',
      message: 'Connection refused'
    })

    const result = await service.testConnection({ gatewayId: gateway.id, port: 1880 })

    expect(result.allPassed).toBe(false)
    expect(result.results.length).toBe(3)
  })

  it('AC-004: 网关不存在时抛出 404', async () => {
    await expect(
      service.testConnection({ gatewayId: 'non-existent-id', port: 1880 })
    ).rejects.toMatchObject({ code: 'GATEWAY_NOT_FOUND' })
  })

  it('AC-004: 每项结果有 name、passed、message 字段', async () => {
    const gateway = await prisma.gateway.findFirstOrThrow()
    ;(mockedAxios.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: { version: '3.1.0' }
    })

    const result = await service.testConnection({ gatewayId: gateway.id, port: 1880 })
    const names = result.results.map((r: any) => r.name)

    expect(names).toContain('Node-RED 可达性')
  })
})
