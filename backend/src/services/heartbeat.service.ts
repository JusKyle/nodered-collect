import { prisma } from '../config/db'
import { GatewayStatus } from '@prisma/client'
import { redisClient } from '../config/redis'

const HEARTBEAT_KEY_PREFIX = 'heartbeat:'
const TOKEN_EXPIRED_KEY_PREFIX = 'token_expired:'
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 90 * 1000 // 90秒无心跳 = 离线

export const handleHeartbeat = async (gatewayId: string, rawMessage?: string) => {
  // 尝试解析心跳 payload（Node-RED 发来的结构化心跳）
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
      // 解析失败，忽略 payload 只做心跳更新
    }
  }

  // Redis: 记录时间戳（TTL = 2 倍超时，便于 checkGatewayStatus 判断离线）
  await redisClient.set(
    `${HEARTBEAT_KEY_PREFIX}${gatewayId}`,
    Date.now().toString(),
    { EX: 240 }
  )

  // DB: 更新状态 + 元信息
  const updateData: any = {
    lastHeartbeat: new Date()
  }

  // 如果状态是 OFFLINE，收到心跳后自动恢复 ONLINE
  const existingGateway = await prisma.gateway.findUnique({
    where: { id: gatewayId }
  })

  if (existingGateway) {
    // TOKEN_EXPIRED 保持不变，需用户手动更新 token
    if (existingGateway.status === GatewayStatus.OFFLINE) {
      updateData.status = GatewayStatus.ONLINE
    }
    // INITIALIZING 收到心跳 → ONLINE
    if (existingGateway.status === 'INITIALIZING' as any) {
      updateData.status = GatewayStatus.ONLINE
    }
  }

  // 提取的元信息更新
  if (nodeRedVersion) updateData.nodeRedVersion = nodeRedVersion
  if (ip) updateData.ip = ip
  if (flowCount !== null) updateData.flowCount = flowCount

  await prisma.gateway.update({
    where: { id: gatewayId },
    data: updateData
  })
}

export const markGatewayTokenExpired = async (gatewayId: string) => {
  await redisClient.set(`${TOKEN_EXPIRED_KEY_PREFIX}${gatewayId}`, 'true', {
    EX: 86400
  })

  await prisma.gateway.update({
    where: { id: gatewayId },
    data: { status: GatewayStatus.TOKEN_EXPIRED }
  })
}

export const checkGatewayStatus = async () => {
  const gateways = await prisma.gateway.findMany()

  for (const gateway of gateways) {
    const heartbeatTimestamp = await redisClient.get(`${HEARTBEAT_KEY_PREFIX}${gateway.id}`)
    const isTokenExpired = await redisClient.get(`${TOKEN_EXPIRED_KEY_PREFIX}${gateway.id}`)

    // TOKEN_EXPIRED 始终保持，不被心跳自动恢复（需用户测试连接）
    if (isTokenExpired) continue

    const timeout = (gateway.heartbeatTimeout || 90) * 1000

    if (!heartbeatTimestamp) {
      // Redis 中无记录 → 从未发心跳或 TTL 已过期 → 判离线
      if (gateway.status === GatewayStatus.ONLINE) {
        await prisma.gateway.update({
          where: { id: gateway.id },
          data: { status: GatewayStatus.OFFLINE }
        })
      }
    } else {
      const delta = Date.now() - parseInt(heartbeatTimestamp, 10)
      if (delta > timeout) {
        // 超过阈值 → 离线
        if (gateway.status !== GatewayStatus.OFFLINE) {
          await prisma.gateway.update({
            where: { id: gateway.id },
            data: { status: GatewayStatus.OFFLINE }
          })
        }
      } else if (gateway.status === GatewayStatus.OFFLINE) {
        // 还在心跳窗口内，但是 DB 状态是 OFFLINE → 恢复 ONLINE
        await prisma.gateway.update({
          where: { id: gateway.id },
          data: { status: GatewayStatus.ONLINE }
        })
      }
    }
  }
}
