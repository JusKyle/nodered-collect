import { prisma } from '../config/db'
import { GatewayStatus } from '@prisma/client'
import { redisClient } from '../config/redis'

const HEARTBEAT_KEY_PREFIX = 'heartbeat:'
const TOKEN_EXPIRED_KEY_PREFIX = 'token_expired:'
const HEARTBEAT_TIMEOUT_MS = 90 * 1000 // 90 seconds

export const handleHeartbeat = async (gatewayId: string) => {
  await redisClient.set(`${HEARTBEAT_KEY_PREFIX}${gatewayId}`, Date.now().toString(), {
    EX: 120 // 2 minutes TTL
  })

  await prisma.gateway.update({
    where: { id: gatewayId },
    data: {
      status: GatewayStatus.ONLINE,
      lastHeartbeat: new Date()
    }
  })
}

export const markGatewayTokenExpired = async (gatewayId: string) => {
  await redisClient.set(`${TOKEN_EXPIRED_KEY_PREFIX}${gatewayId}`, 'true', {
    EX: 86400 // 24 hours
  })

  await prisma.gateway.update({
    where: { id: gatewayId },
    data: {
      status: GatewayStatus.TOKEN_EXPIRED
    }
  })
}

export const checkGatewayStatus = async () => {
  const gateways = await prisma.gateway.findMany()

  for (const gateway of gateways) {
    const heartbeat = await redisClient.get(`${HEARTBEAT_KEY_PREFIX}${gateway.id}`)
    const isTokenExpired = await redisClient.get(`${TOKEN_EXPIRED_KEY_PREFIX}${gateway.id}`)

    // Token expired takes precedence
    if (isTokenExpired && gateway.status !== GatewayStatus.TOKEN_EXPIRED) {
      await prisma.gateway.update({
        where: { id: gateway.id },
        data: { status: GatewayStatus.TOKEN_EXPIRED }
      })
      continue
    }

    // No heartbeat received
    if (!heartbeat) {
      // If was ONLINE or just started, mark as OFFLINE
      if (gateway.status === GatewayStatus.ONLINE) {
        await prisma.gateway.update({
          where: { id: gateway.id },
          data: { status: GatewayStatus.OFFLINE }
        })
      }
    } else {
      // Has heartbeat - if was OFFLINE, auto recover to ONLINE
      if (gateway.status === GatewayStatus.OFFLINE) {
        await prisma.gateway.update({
          where: { id: gateway.id },
          data: {
            status: GatewayStatus.ONLINE,
            lastHeartbeat: new Date(parseInt(heartbeat))
          }
        })
      }
    }
  }
}