import { prisma } from '../config/db'
import { GatewayStatus } from '@prisma/client'
import { redisClient } from '../config/redis'

export const handleHeartbeat = async (gatewayId: string) => {
  await redisClient.set(`heartbeat:${gatewayId}`, Date.now().toString(), {
    EX: 60
  })

  await prisma.gateway.update({
    where: { id: gatewayId },
    data: {
      status: GatewayStatus.ONLINE,
      lastHeartbeat: new Date()
    }
  })
}

export const checkGatewayStatus = async () => {
  const gateways = await prisma.gateway.findMany()

  for (const gateway of gateways) {
    const heartbeat = await redisClient.get(`heartbeat:${gateway.id}`)
    if (!heartbeat) {
      await prisma.gateway.update({
        where: { id: gateway.id },
        data: { status: GatewayStatus.OFFLINE }
      })
    }
  }
}