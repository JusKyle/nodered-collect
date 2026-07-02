import { prisma } from '../config/db'
import { getRedisClient } from '../config/redis'
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

const getClient = () => getRedisClient()

const ensureConnected = async (): Promise<boolean> => {
  const client = getClient()
  if (!client.isReady) {
    try {
      await client.connect()
      console.log('Redis reconnected')
      return true
    } catch {
      return false
    }
  }
  return true
}

export const handleDeviceData = async (
  deviceInstanceId: string,
  rawMessage: string
): Promise<void> => {
  const payload: DataPointPayload = JSON.parse(rawMessage)
  const resolvedInstanceId = payload.deviceInstanceId || deviceInstanceId

  updateInstanceOnline(resolvedInstanceId).catch(() => {})
  await bufferDataPoints(resolvedInstanceId, payload)
  await updateLatestCache(resolvedInstanceId, payload)
}

const bufferDataPoints = async (
  deviceInstanceId: string,
  payload: DataPointPayload
): Promise<void> => {
  if (!await ensureConnected()) return

  const client = getClient()
  const { gatewayId, timestamp, points } = payload

  let resolvedGatewayId = gatewayId
  if (!resolvedGatewayId) {
    const instance = await prisma.deviceInstance.findUnique({
      where: { id: deviceInstanceId },
      select: { gatewayId: true }
    })
    resolvedGatewayId = instance?.gatewayId ?? undefined
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
    await client.rPush(
      `${BUFFER_KEY_PREFIX}${resolvedGatewayId}`,
      JSON.stringify(buffered)
    )
  }
}

export const startBufferFlush = (): NodeJS.Timeout => {
  return setInterval(async () => {
    try {
      if (!await ensureConnected()) return

      const client = getClient()
      const gatewayKeys = await client.keys(`${BUFFER_KEY_PREFIX}*`)
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
  if (!await ensureConnected()) return

  const client = getClient()
  const key = `${BUFFER_KEY_PREFIX}${gatewayId}`
  const rawPoints: string[] = []

  while (rawPoints.length < 500) {
    const item = await client.lPop(key)
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
    for (const raw of rawPoints.reverse()) {
      await client.lPush(key, raw)
    }
  }
}

const updateLatestCache = async (
  deviceInstanceId: string,
  payload: DataPointPayload
): Promise<void> => {
  if (!await ensureConnected()) return

  const client = getClient()
  const { timestamp, points } = payload

  for (const point of points) {
    const key = `${LATEST_KEY_PREFIX}${deviceInstanceId}:${point.code}`
    await client.set(
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

const updateInstanceOnline = async (deviceInstanceId: string): Promise<void> => {
  await prisma.deviceInstance.update({
    where: { id: deviceInstanceId },
    data: {
      status: DeviceStatus.ONLINE,
      lastDataTime: new Date()
    }
  })
}

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

export const getLatestPointValue = async (
  deviceInstanceId: string,
  pointCode: string
): Promise<{ value: string; dataType: string; quality: number; timestamp: number } | null> => {
  if (!await ensureConnected()) return null

  const client = getClient()
  const key = `${LATEST_KEY_PREFIX}${deviceInstanceId}:${pointCode}`
  const data = await client.get(key)
  if (!data) return null
  return JSON.parse(data)
}
