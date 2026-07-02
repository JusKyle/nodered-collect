import { prisma } from '../../config/db'
import { getLatestPointValue } from '../../services/data-collection.service'

// ============================================================
// 1. 获取设备实例所有点位的最新值（优先 Redis latest cache → 降级 DB）
// ============================================================
export const getCurrentData = async (instanceId: string) => {
  const instance = await prisma.deviceInstance.findUnique({
    where: { id: instanceId },
    include: {
      model: { select: { points: true } },
      gateway: { select: { name: true } }
    }
  })

  if (!instance) {
    throw new Error('Device instance not found')
  }

  const modelPoints: any[] = (instance.model.points as any) || []
  const config = instance.config as any
  const customPoints: any[] = config?.customPoints || []
  const allPoints = [...modelPoints, ...customPoints]

  // 优先从 Redis latest cache 读取
  const pointsPromises = allPoints.map(async (point: any) => {
    const cached = await getLatestPointValue(instanceId, point.code)
    if (cached) {
      return {
        code: point.code,
        name: point.name,
        value: cached.value,
        dataType: cached.dataType,
        quality: cached.quality,
        timestamp: new Date(cached.timestamp).toISOString()
      }
    }

    // 降级：从 DB 读取最新一条
    const dbPoint = await prisma.deviceDataPoint.findFirst({
      where: { deviceInstanceId: instanceId, pointCode: point.code },
      orderBy: { timestamp: 'desc' },
      select: {
        value: true,
        dataType: true,
        quality: true,
        timestamp: true
      }
    })

    return {
      code: point.code,
      name: point.name,
      value: dbPoint?.value ?? null,
      dataType: point.dataType || dbPoint?.dataType || 'string',
      quality: dbPoint?.quality ?? -1,
      timestamp: dbPoint?.timestamp?.toISOString() ?? null
    }
  })

  const points = await Promise.all(pointsPromises)

  return {
    deviceInstanceId: instance.id,
    deviceName: instance.name,
    gatewayName: instance.gateway?.name ?? null,
    status: instance.status,
    lastDataTime: instance.lastDataTime?.toISOString() ?? null,
    points
  }
}

// ============================================================
// 2. 获取设备点位历史数据（分页）
// ============================================================
export const getHistoryData = async (
  instanceId: string,
  options: {
    pointCode?: string
    start?: string
    end?: string
    page?: number
    pageSize?: number
  }
) => {
  const {
    pointCode,
    start,
    end,
    page = 1,
    pageSize = 100
  } = options

  const resolvedPageSize = Math.min(Math.max(1, pageSize), 1000)
  const skip = (Math.max(1, page) - 1) * resolvedPageSize

  const where: any = { deviceInstanceId: instanceId }
  if (pointCode) where.pointCode = pointCode
  if (start || end) {
    where.timestamp = {}
    if (start) where.timestamp.gte = new Date(start)
    if (end) where.timestamp.lte = new Date(end)
  }

  const [records, total] = await Promise.all([
    prisma.deviceDataPoint.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: resolvedPageSize,
      select: {
        value: true,
        timestamp: true,
        quality: true
      }
    }),
    prisma.deviceDataPoint.count({ where })
  ])

  return {
    deviceInstanceId: instanceId,
    pointCode: pointCode || null,
    interval: 'raw',
    records: records.map(r => ({
      value: r.value,
      timestamp: r.timestamp.toISOString(),
      quality: r.quality
    })),
    pagination: {
      total,
      page,
      pageSize: resolvedPageSize
    }
  }
}

// ============================================================
// 3. 批量获取所有实例最新值
// ============================================================
export const getLatestData = async (options: {
  gatewayId?: string
  modelId?: string
  page?: number
  pageSize?: number
}) => {
  const { gatewayId, modelId, page = 1, pageSize = 50 } = options
  const skip = (Math.max(1, page) - 1) * pageSize

  const where: any = {}
  if (gatewayId) where.gatewayId = gatewayId
  if (modelId) where.modelId = modelId

  const [instances, total] = await Promise.all([
    prisma.deviceInstance.findMany({
      where,
      include: {
        model: { select: { points: true, name: true } },
        gateway: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.deviceInstance.count({ where })
  ])

  const instancesWithPoints = await Promise.all(
    instances.map(async (instance) => {
      const config = instance.config as any
      const allPoints: any[] = [
        ...((instance.model.points as any[]) || []),
        ...((config?.customPoints as any[]) || [])
      ]
      const latestPoints = await Promise.all(
        allPoints.slice(0, 10).map(async (point: any) => {
          const cached = await getLatestPointValue(instance.id, point.code)
          return {
            code: point.code,
            value: cached?.value ?? null,
            timestamp: cached?.timestamp ? new Date(cached.timestamp).toISOString() : null
          }
        })
      )

      return {
        deviceInstanceId: instance.id,
        name: instance.name,
        modelName: instance.model.name,
        gatewayName: instance.gateway?.name ?? null,
        status: instance.status,
        lastDataTime: instance.lastDataTime?.toISOString() ?? null,
        points: latestPoints
      }
    })
  )

  return {
    instances: instancesWithPoints,
    pagination: { total, page, pageSize }
  }
}
