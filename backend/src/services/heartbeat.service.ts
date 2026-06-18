import { prisma } from '../config/db'
import { GatewayStatus } from '@prisma/client'
import { getRedisClient } from '../config/redis'

const HEARTBEAT_KEY_PREFIX = 'heartbeat:'
const TOKEN_EXPIRED_KEY_PREFIX = 'token_expired:'
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 90 * 1000

const getClient = () => getRedisClient()

export const handleHeartbeat = async (gatewayId: string, rawMessage?: string) => {
  let payload: any = null
  let nodeRedVersion: string | null = null
  let ip: string | null = null
  let flowCount: number | null = null

  if (rawMessage && rawMessage.trim()) {
    try {
      payload = JSON.parse(rawMessage)
      nodeRedVersion = payload.nodeRedVersion || null
      ip = payload.ip || null
      flowCount = typeof payload.flowCount === 'number' ? payload.flowCount : null
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

  await prisma.gateway.update({
    where: { id: gatewayId },
    data: updateData
  })
}

export const markGatewayTokenExpired = async (gatewayId: string) => {
  const client = getClient()
  await client.set(`${TOKEN_EXPIRED_KEY_PREFIX}${gatewayId}`, 'true', {
    EX: 86400
  })

  await prisma.gateway.update({
    where: { id: gatewayId },
    data: { status: GatewayStatus.TOKEN_EXPIRED }
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
        await prisma.gateway.update({
          where: { id: gateway.id },
          data: { status: GatewayStatus.OFFLINE }
        })
      }
    } else {
      const delta = Date.now() - parseInt(heartbeatTimestamp, 10)
      if (delta > timeout) {
        if (gateway.status !== GatewayStatus.OFFLINE) {
          await prisma.gateway.update({
            where: { id: gateway.id },
            data: { status: GatewayStatus.OFFLINE }
          })
        }
      } else if (gateway.status === GatewayStatus.OFFLINE) {
        await prisma.gateway.update({
          where: { id: gateway.id },
          data: { status: GatewayStatus.ONLINE }
        })
      }
    }
  }
}
