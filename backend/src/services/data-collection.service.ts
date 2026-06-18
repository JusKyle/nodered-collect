import { prisma } from '../config/db'
import { redisClient } from '../config/redis'
import { DeviceStatus } from '@prisma/client'

const BUFFER_KEY_PREFIX = 'data:buffer:'
const LATEST_KEY_PREFIX = 'data:latest:'
const BUFFER_FLUSH_INTERVAL = 5000
const OFFLINE_THRESHOLD_MS = 90 * 1000

export interface DataPointPayload {
  gatewayId?: string
  deviceInstanceId: string
  timestamp: number
  points: Array<{
    code: string
    name: string
    value: string
    dataType: string
    quality?: number
  }>
}

interface BufferedPoint {
  deviceInstanceId: string
  gatewayId: string
  pointCode: string
  pointName: string
  value: string
  dataType: string
  timestamp: string
  quality: number
}

// ============================================================
// 1. MQTT 消息处理入口
// ============================================================
export const handleDeviceData = async (
  deviceInstanceId: string,
  rawMessage: string
): Promise<void> => {
  const payload: DataPointPayload = JSON.parse(rawMessage)

  // 解析出来的 instanceId 必须和 topic 里的匹配
  const resolvedInstanceId = payload.deviceInstanceId || deviceInstanceId

  // 1) 更新实例数据时间 + 标记 ONLINE（异步不阻塞）
  updateInstanceOnline(resolvedInstanceId).catch(() => {
    // 实例不存在时静默忽略
  })

  // 2) 写入 Redis 缓冲
  await bufferDataPoints(resolvedInstanceId, payload)

  // 3) 立即更新 Redis latest cache
  await updateLatestCache(resolvedInstanceId, payload)
}

const ensureRedisConnected = async (): Promise<boolean> => {
  if (!redisClient.isReady) {
    try {
      await redisClient.connect()
      console.log('Redis reconnected')
      return true
    } catch {
      return false
    }
  }
  return true
}

// ============================================================
// 2. 数据缓冲写入
// ============================================================
const bufferDataPoints = async (
  deviceInstanceId: string,
  payload: DataPointPayload
): Promise<void> => {
  if (!await ensureRedisConnected()) return
  const { gatewayId, timestamp, points } = payload

  // 优先用 payload 中的 gatewayId，否则从 DB 查
  let resolvedGatewayId = gatewayId
  if (!resolvedGatewayId) {
    const instance = await prisma.deviceInstance.findUnique({
      where: { id: deviceInstanceId },
      select: { gatewayId: true }
    })
    resolvedGatewayId = instance?.gatewayId
  }

  if (!resolvedGatewayId) return

  for (const point of points) {
    const buffered: BufferedPoint = {
      deviceInstanceId,
      gatewayId: resolvedGatewayId,
      pointCode: point.code,
      pointName: point.name,
      value: point.value,
      dataType: point.dataType,
      timestamp: new Date(timestamp).toISOString(),
      quality: point.quality ?? 0
    }
    await redisClient.rPush(
      `${BUFFER_KEY_PREFIX}${resolvedGatewayId}`,
      JSON.stringify(buffered)
    )
  }
}

// ============================================================
// 3. 定时批量 flush（每 5s 执行一次）
// ============================================================
export const startBufferFlush = (): NodeJS.Timeout => {
  return setInterval(async () => {
    try {
      if (!await ensureRedisConnected()) return
      const gatewayKeys = await redisClient.keys(`${BUFFER_KEY_PREFIX}*`)
      for (const key of gatewayKeys) {
        const gatewayId = key.replace(BUFFER_KEY_PREFIX, '')
        await flushGatewayBuffer(gatewayId)
      }
    } catch (err) {
      console.error('Buffer flush error:', err)
    }
  }, BUFFER_FLUSH_INTERVAL)
}

const flushGatewayBuffer = async (gatewayId: string): Promise<void> => {
  if (!await ensureRedisConnected()) return
  const key = `${BUFFER_KEY_PREFIX}${gatewayId}`
  const rawPoints: string[] = []

  // 批量取出，最多 500 条/次
  while (rawPoints.length < 500) {
    const item = await redisClient.lPop(key)
    if (!item) break
    rawPoints.push(item)
  }

  if (rawPoints.length === 0) return

  const points = rawPoints.map(r => JSON.parse(r) as BufferedPoint)

  try {
    await prisma.deviceDataPoint.createMany({
      data: points.map(p => ({
        deviceInstanceId: p.deviceInstanceId,
        gatewayId: p.gatewayId,
        pointCode: p.pointCode,
        pointName: p.pointName,
        value: p.value,
        dataType: p.dataType,
        timestamp: new Date(p.timestamp),
        quality: p.quality ?? 0
      }))
    })
  } catch (err) {
    console.error(`Failed to flush buffer for gateway ${gatewayId}`, err)
    // 回推缓冲
    for (const raw of rawPoints.reverse()) {
      await redisClient.lPush(key, raw)
    }
  }
}

// ============================================================
// 4. Redis latest cache（支撑快速查询）
// ============================================================
const updateLatestCache = async (
  deviceInstanceId: string,
  payload: DataPointPayload
): Promise<void> => {
  if (!await ensureRedisConnected()) return
  const { timestamp, points } = payload

  for (const point of points) {
    const key = `${LATEST_KEY_PREFIX}${deviceInstanceId}:${point.code}`
    await redisClient.set(
      key,
      JSON.stringify({
        value: point.value,
        dataType: point.dataType,
        quality: point.quality ?? 0,
        timestamp
      }),
      { EX: 300 }
    )
  }
}

// ============================================================
// 5. 实例在线状态更新
// ============================================================
const updateInstanceOnline = async (deviceInstanceId: string): Promise<void> => {
  await prisma.deviceInstance.update({
    where: { id: deviceInstanceId },
    data: {
      status: DeviceStatus.ONLINE,
      lastDataTime: new Date()
    }
  })
}

// ============================================================
// 6. 数据超时检测（实例 OFFLINE 判定）
// ============================================================
export const startOfflineChecker = (): NodeJS.Timeout => {
  return setInterval(async () => {
    try {
      const instances = await prisma.deviceInstance.findMany({
        where: {
          status: DeviceStatus.ONLINE,
          lastDataTime: { not: null }
        },
        select: { id: true, lastDataTime: true }
      })

      const now = Date.now()
      for (const instance of instances) {
        if (!instance.lastDataTime) continue
        const delta = now - instance.lastDataTime.getTime()
        if (delta > OFFLINE_THRESHOLD_MS) {
          await prisma.deviceInstance.update({
            where: { id: instance.id },
            data: { status: DeviceStatus.OFFLINE }
          }).catch(() => {})
        }
      }
    } catch (err) {
      console.error('Offline checker error:', err)
    }
  }, 30 * 1000)
}

// ============================================================
// 7. 读取 Redis latest cache（供 API 层降级查询用）
// ============================================================
export const getLatestPointValue = async (
  deviceInstanceId: string,
  pointCode: string
): Promise<{ value: string; dataType: string; quality: number; timestamp: number } | null> => {
  if (!await ensureRedisConnected()) return null
  const key = `${LATEST_KEY_PREFIX}${deviceInstanceId}:${pointCode}`
  const data = await redisClient.get(key)
  if (!data) return null
  return JSON.parse(data)
}
