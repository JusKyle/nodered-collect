import { prisma } from '../config/db'
import { GatewayStatus } from '@prisma/client'
import { getRedisClient } from '../config/redis'
import { sseService } from './sse.service'

const HEARTBEAT_KEY_PREFIX = 'heartbeat:'
const TOKEN_EXPIRED_KEY_PREFIX = 'token_expired:'
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 90 * 1000

const getClient = () => getRedisClient()

export const handleHeartbeat = async (gatewayId: string, rawMessage?: string) => {
  let payload: any = null
  let nodeRedVersion: string | null = null
  let ip: string | null = null
  let flowCount: number | null = null
  let hasPerfData = false
  let cpuUsage: number | undefined
  let memoryUsage: number | undefined
  let diskUsage: number | undefined
  let diskFreeBytes: bigint | undefined

  if (rawMessage && rawMessage.trim()) {
    try {
      payload = JSON.parse(rawMessage)
      nodeRedVersion = payload.nodeRedVersion || null
      ip = payload.ip || null
      flowCount = typeof payload.flowCount === 'number' ? payload.flowCount : null

      if (typeof payload.cpuUsage === 'number' || typeof payload.memoryUsage === 'number') {
        hasPerfData = true
        cpuUsage = payload.cpuUsage
        memoryUsage = payload.memoryUsage
        diskUsage = payload.diskUsage
        if (typeof payload.diskFreeBytes === 'number') {
          diskFreeBytes = BigInt(payload.diskFreeBytes)
        }
      }
    } catch (err) {
    }
  }

  const client = getClient()
  await client.set(
    `${HEARTBEAT_KEY_PREFIX}${gatewayId}`,
    Date.now().toString(),
    { EX: 240 }
  )

  const updateData: any = {
    lastHeartbeat: new Date()
  }

  const existingGateway = await prisma.gateway.findUnique({
    where: { id: gatewayId }
  })

  if (existingGateway) {
    if (existingGateway.status === GatewayStatus.OFFLINE) {
      updateData.status = GatewayStatus.ONLINE
    }
    if (existingGateway.status === 'INITIALIZING' as any) {
      updateData.status = GatewayStatus.ONLINE
    }
  }

  if (nodeRedVersion) updateData.nodeRedVersion = nodeRedVersion
  if (ip) updateData.ip = ip
  if (flowCount !== null) updateData.flowCount = flowCount

  const updated = await prisma.gateway.update({
    where: { id: gatewayId },
    data: updateData
  })

  if (hasPerfData) {
    await prisma.gatewayPerformance.create({
      data: {
        gatewayId,
        cpuUsage,
        memoryUsage,
        diskUsage,
        diskFreeBytes,
        timestamp: new Date()
      }
    })
  }

  sseService.broadcast({
    type: 'gateway_status_change',
    data: {
      gatewayId: updated.id,
      status: updated.status,
      lastHeartbeat: updated.lastHeartbeat ?? undefined,
      ip: updated.ip || undefined,
      flowCount: updated.flowCount ?? undefined,
      nodeRedVersion: updated.nodeRedVersion || undefined
    }
  })
}

export const markGatewayTokenExpired = async (gatewayId: string) => {
  const client = getClient()
  await client.set(`${TOKEN_EXPIRED_KEY_PREFIX}${gatewayId}`, 'true', {
    EX: 86400
  })

  const updated = await prisma.gateway.update({
    where: { id: gatewayId },
    data: { status: GatewayStatus.TOKEN_EXPIRED }
  })

  sseService.broadcast({
    type: 'gateway_status_change',
    data: {
      gatewayId: updated.id,
      status: updated.status,
      lastHeartbeat: updated.lastHeartbeat ?? undefined
    }
  })
}

export const checkGatewayStatus = async () => {
  const gateways = await prisma.gateway.findMany()
  const client = getClient()

  for (const gateway of gateways) {
    const heartbeatTimestamp = await client.get(`${HEARTBEAT_KEY_PREFIX}${gateway.id}`)
    const isTokenExpired = await client.get(`${TOKEN_EXPIRED_KEY_PREFIX}${gateway.id}`)

    if (isTokenExpired) continue

    const timeout = (gateway.heartbeatTimeout || 90) * 1000

    if (!heartbeatTimestamp) {
      if (gateway.status === GatewayStatus.ONLINE) {
        const updated = await prisma.gateway.update({
          where: { id: gateway.id },
          data: { status: GatewayStatus.OFFLINE }
        })
        sseService.broadcast({
          type: 'gateway_status_change',
          data: {
            gatewayId: updated.id,
            status: updated.status,
            lastHeartbeat: updated.lastHeartbeat ?? undefined
          }
        })
      }
    } else {
      const delta = Date.now() - parseInt(heartbeatTimestamp, 10)
      if (delta > timeout) {
        if (gateway.status !== GatewayStatus.OFFLINE) {
          const updated = await prisma.gateway.update({
            where: { id: gateway.id },
            data: { status: GatewayStatus.OFFLINE }
          })
          sseService.broadcast({
            type: 'gateway_status_change',
            data: {
              gatewayId: updated.id,
              status: updated.status,
              lastHeartbeat: updated.lastHeartbeat ?? undefined
            }
          })
        }
      } else if (gateway.status === GatewayStatus.OFFLINE) {
        const updated = await prisma.gateway.update({
          where: { id: gateway.id },
          data: { status: GatewayStatus.ONLINE }
        })
        sseService.broadcast({
          type: 'gateway_status_change',
          data: {
            gatewayId: updated.id,
            status: updated.status,
            lastHeartbeat: updated.lastHeartbeat ?? undefined
          }
        })
      }
    }
  }
}
