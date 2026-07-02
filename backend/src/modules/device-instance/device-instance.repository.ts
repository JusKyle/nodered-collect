import { prisma } from '../../config/db'
import { DeviceInstance, DeviceStatus } from '@prisma/client'

export interface DeviceInstanceListItem {
  id: string
  name: string
  description: string | null
  status: DeviceStatus
  enabled: boolean
  templateVersion: number
  collectStatus: string
  modelId: string
  modelName: string
  gatewayId: string | null
  gatewayName: string | null
  group: string | null
  deviceId: string | null
  commConfig: any
  pointCount: number
  lastSyncTime: Date | null
  lastDataTime: Date | null
  createdAt: Date
  updatedAt: Date
}

export const getAllGroups = async (): Promise<string[]> => {
  const instances = await prisma.deviceInstance.findMany({
    where: { group: { not: null } },
    select: { group: true },
    distinct: ['group']
  })
  return instances.map(i => i.group).filter((g): g is string => g !== null)
}

export interface DeviceInstanceListResult {
  list: DeviceInstanceListItem[]
  total: number
  page: number
  pageSize: number
}

export const getDeviceInstances = async (query: {
  page?: number
  pageSize?: number
  gatewayId?: string
  modelId?: string
  status?: string
  keyword?: string
  group?: string
}): Promise<DeviceInstanceListResult> => {
  const page = query.page || 1
  const pageSize = query.pageSize || 20

  const where: any = {}
  if (query.gatewayId) where.gatewayId = query.gatewayId
  if (query.modelId) where.modelId = query.modelId
  if (query.status) where.status = query.status
  if (query.group) where.group = query.group
  if (query.keyword) {
    where.name = { contains: query.keyword, mode: 'insensitive' }
  }

  const [instances, total] = await Promise.all([
    prisma.deviceInstance.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        model: { select: { name: true } },
        gateway: { select: { name: true } },
        _count: { select: { points: true } }
      }
    }),
    prisma.deviceInstance.count({ where })
  ])

  return {
    list: instances.map((inst) => ({
      id: inst.id,
      name: inst.name,
      description: inst.description,
      status: inst.status,
      enabled: inst.enabled,
      templateVersion: inst.templateVersion,
      collectStatus: inst.collectStatus,
      modelId: inst.modelId,
      modelName: inst.model.name,
      gatewayId: inst.gatewayId,
      gatewayName: inst.gateway?.name || null,
      group: inst.group,
      deviceId: inst.deviceId,
      commConfig: inst.commConfig,
      pointCount: inst._count.points,
      lastSyncTime: inst.lastSyncTime,
      lastDataTime: inst.lastDataTime,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt
    })),
    total,
    page,
    pageSize
  }
}

export const createDeviceInstance = async (data: {
  name: string
  modelId: string
  gatewayId: string
  nodeId: string
  config?: object
}): Promise<DeviceInstance> => {
  return prisma.deviceInstance.create({ data })
}

export const createDeviceInstanceFull = async (data: {
  name: string
  modelId: string
  gatewayId?: string
  description?: string
  commConfig?: object
  deviceId?: string
  group?: string
}) => {
  // 获取模型信息和点位
  const model = await prisma.deviceModel.findUnique({
    where: { id: data.modelId }
  })
  if (!model) throw { code: 'MODEL_NOT_FOUND', message: '模板不存在' }

  // 网关可选，如果提供则验证
  if (data.gatewayId) {
    const gateway = await prisma.gateway.findUnique({
      where: { id: data.gatewayId }
    })
    if (!gateway) throw { code: 'GATEWAY_NOT_FOUND', message: '网关不存在' }
  }

  // 自动生成 nodeId
  const nodeId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // 解析模板点位
  const modelPoints = Array.isArray(model.points) ? model.points as any[] : []

  // 创建实例 + 初始化模板点位
  const instance = await prisma.deviceInstance.create({
    data: {
      name: data.name,
      modelId: data.modelId,
      gatewayId: data.gatewayId || null,
      nodeId,
      description: data.description || null,
      commConfig: data.commConfig || undefined,
      deviceId: data.deviceId || null,
      group: data.group || null,
      templateVersion: model.version,
      status: 'OFFLINE',
      collectStatus: 'STOPPED',
      enabled: true,
    },
    include: { points: true }
  })

  // 如果模板有点位，批量创建 DevicePoint
  if (modelPoints.length > 0) {
    await prisma.devicePoint.createMany({
      data: modelPoints.map((p: any, index: number) => ({
        instanceId: instance.id,
        name: p.name || '',
        tag: p.code || p.tag || `point_${index}`,
        dataType: p.dataType || 'FLOAT32',
        address: p.address || '',
        unit: p.unit || null,
        description: p.description || null,
        config: p.config || {},
        enabled: p.enabled !== false,
        source: 'TEMPLATE',
        sort: index,
      }))
    })
  }

  // 重新查询返回包含点位的结果
  return prisma.deviceInstance.findUnique({
    where: { id: instance.id },
    include: { points: true }
  })
}

export const batchCreateDeviceInstances = async (
  data: Array<{
    name: string
    modelId: string
    gatewayId: string
    nodeId: string
    config?: object
  }>
): Promise<DeviceInstance[]> => {
  return prisma.$transaction(data.map((item) => prisma.deviceInstance.create({ data: item })))
}

export const getAllDeviceInstances = async (): Promise<DeviceInstance[]> => {
  return prisma.deviceInstance.findMany({ include: { model: true, gateway: true } })
}

export const getDeviceInstanceById = async (id: string) => {
  return prisma.deviceInstance.findUnique({
    where: { id },
    include: {
      model: true,
      gateway: true,
      _count: { select: { points: true } },
    }
  })
}

export const getDeviceInstancesByGatewayId = async (gatewayId: string): Promise<DeviceInstance[]> => {
  return prisma.deviceInstance.findMany({
    where: { gatewayId },
    include: { model: true }
  })
}

export const getDeviceInstanceDetail = async (id: string) => {
  const instance = await prisma.deviceInstance.findUnique({
    where: { id },
    include: {
      model: { select: { name: true, version: true, points: true } },
      gateway: { select: { id: true, name: true, status: true, lastHeartbeat: true, nodeRedVersion: true } },
      _count: { select: { points: true } }
    }
  })
  if (!instance) return null

  const templatePointCount = Array.isArray(instance.model.points) ? instance.model.points.length : 0
  const devicePointCount = instance._count.points

  return {
    id: instance.id,
    name: instance.name,
    description: instance.description,
    gatewayId: instance.gatewayId,
    gateway: instance.gateway ? {
      id: instance.gateway.id,
      name: instance.gateway.name,
      status: instance.gateway.status,
      lastHeartbeat: instance.gateway.lastHeartbeat,
      nodeRedVersion: instance.gateway.nodeRedVersion,
    } : null,
    gatewayName: instance.gateway?.name || null,
    modelId: instance.modelId,
    modelName: instance.model.name,
    group: instance.group,
    deviceId: instance.deviceId,
    status: instance.status,
    templateVersion: instance.templateVersion,
    latestTemplateVersion: instance.model.version,
    enabled: instance.enabled,
    commConfig: instance.commConfig,
    collectStatus: instance.collectStatus,
    totalPointCount: templatePointCount + devicePointCount,
    templatePointCount,
    devicePointCount,
    nodeId: instance.nodeId,
    lastSyncTime: instance.lastSyncTime,
    lastDataTime: instance.lastDataTime,
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
  }
}

export const updateDeviceInstance = async (
  id: string,
  data: { name?: string; description?: string; commConfig?: object }
) => {
  return prisma.deviceInstance.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.commConfig !== undefined && { commConfig: data.commConfig as any }),
    }
  })
}

export const deleteDeviceInstance = async (id: string) => {
  return prisma.deviceInstance.delete({ where: { id } })
}

export const changeGateway = async (id: string, gatewayId: string): Promise<DeviceInstance> => {
  return prisma.deviceInstance.update({
    where: { id },
    data: { gatewayId, status: 'OFFLINE' }
  })
}

export const updateDeviceInstanceStatus = async (
  id: string,
  status: DeviceStatus,
  lastSyncTime?: Date
): Promise<DeviceInstance> => {
  return prisma.deviceInstance.update({
    where: { id },
    data: { status, lastSyncTime }
  })
}

export const getDeviceInstanceWithModel = async (id: string) => {
  return prisma.deviceInstance.findUnique({
    where: { id },
    include: { model: true }
  })
}

export const updateInstanceConfig = async (id: string, config: object): Promise<DeviceInstance> => {
  return prisma.deviceInstance.update({
    where: { id },
    data: { config }
  })
}

export const toggleDeviceEnabled = async (id: string, enabled: boolean): Promise<DeviceInstance> => {
  const status = enabled ? 'OFFLINE' : 'DISABLED'
  return prisma.deviceInstance.update({
    where: { id },
    data: { enabled, status }
  })
}

// ========== 设备级点位 CRUD ==========

export const getDevicePoints = async (instanceId: string) => {
  return prisma.devicePoint.findMany({
    where: { instanceId, source: 'DEVICE' },
    orderBy: { sort: 'asc' }
  })
}

export const createDevicePoint = async (instanceId: string, data: {
  name: string; tag: string; dataType: string; address: string;
  unit?: string; description?: string; config?: any;
}) => {
  // 检查 tag 唯一性（包括 TEMPLATE 和 DEVICE 点位）
  const existing = await prisma.devicePoint.findFirst({
    where: { instanceId, tag: data.tag }
  })
  if (existing) throw { code: 'TAG_CONFLICT', message: `标识 "${data.tag}" 已存在` }

  const maxSort = await prisma.devicePoint.findFirst({
    where: { instanceId },
    orderBy: { sort: 'desc' },
    select: { sort: true }
  })

  return prisma.devicePoint.create({
    data: {
      instanceId,
      name: data.name,
      tag: data.tag,
      dataType: data.dataType as any,
      address: data.address,
      unit: data.unit || null,
      description: data.description || null,
      config: data.config || {},
      enabled: true,
      source: 'DEVICE',
      sort: (maxSort?.sort || 0) + 1,
    }
  })
}

export const updateDevicePoint = async (pointId: string, data: Partial<{
  name: string; tag: string; dataType: string; address: string;
  unit: string; description: string; config: any; enabled: boolean;
}>) => {
  const updateData: any = { ...data }
  if (data.dataType) updateData.dataType = data.dataType as any
  return prisma.devicePoint.update({ where: { id: pointId }, data: updateData })
}

export const deleteDevicePoint = async (pointId: string) => {
  return prisma.devicePoint.delete({ where: { id: pointId } })
}

// ========== 模板点位 & 模板升级 ==========

export interface TemplatePointItem {
  id: string
  name: string
  tag: string
  dataType: string
  address: string
  unit: string | null
  description: string | null
  source: 'TEMPLATE'
}

export const batchCreateDevices = async (params: {
  gatewayId: string; modelId: string; count: number;
  namePrefix: string; startIndex?: number;
}) => {
  const { gatewayId, modelId, count, namePrefix, startIndex = 1 } = params

  // 校验数量
  if (count < 1 || count > 100) {
    throw new Error('批量创建数量必须在1-100之间')
  }

  const model = await prisma.deviceModel.findUnique({ where: { id: modelId } })
  if (!model) throw new Error('模板不存在')

  const gateway = await prisma.gateway.findUnique({ where: { id: gatewayId } })
  if (!gateway) throw new Error('网关不存在')

  const modelPoints = Array.isArray(model.points) ? model.points as any[] : []
  const instances = []

  for (let i = 0; i < count; i++) {
    const nodeId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const name = `${namePrefix}-${startIndex + i}`

    const instance = await prisma.deviceInstance.create({
      data: {
        name, modelId, gatewayId, nodeId,
        templateVersion: model.version,
        status: 'OFFLINE', collectStatus: 'STOPPED', enabled: true,
      },
      include: { points: true }
    })

    // 初始化模板点位
    if (modelPoints.length > 0) {
      await prisma.devicePoint.createMany({
        data: modelPoints.map((p: any, idx: number) => ({
          instanceId: instance.id,
          name: p.name || '', tag: p.code || p.tag || `point_${idx}`,
          dataType: p.dataType || 'FLOAT32', address: p.address || '',
          unit: p.unit || null, description: p.description || null,
          config: p.config || {}, enabled: p.enabled !== false,
          source: 'TEMPLATE', sort: idx,
        }))
      })
    }

    const fullInstance = await prisma.deviceInstance.findUnique({
      where: { id: instance.id }, include: { points: true }
    })
    instances.push(fullInstance)
  }

  return { successCount: instances.length, instances }
}

export const batchUpgradeTemplate = async (instanceIds: string[]) => {
  let successCount = 0
  const failures: { instanceId: string; reason: string }[] = []

  for (const id of instanceIds) {
    try {
      await upgradeTemplateVersion(id)
      successCount++
    } catch (error: any) {
      failures.push({ instanceId: id, reason: error.message || String(error) })
    }
  }

  return { successCount, failCount: failures.length, failures }
}

export const getTemplatePoints = async (instanceId: string): Promise<TemplatePointItem[] | null> => {
  const instance = await prisma.deviceInstance.findUnique({
    where: { id: instanceId }
  })
  if (!instance) return null

  const points = await prisma.devicePoint.findMany({
    where: { instanceId, source: 'TEMPLATE' },
    orderBy: { sort: 'asc' }
  })

  return points.map(p => ({
    id: p.id,
    name: p.name,
    tag: p.tag,
    dataType: p.dataType,
    address: p.address,
    unit: p.unit,
    description: p.description,
    source: 'TEMPLATE' as const,
  }))
}

// ========== 合并点位 & 下发配置 ==========

export const getMergedPoints = async (instanceId: string) => {
  const instance = await prisma.deviceInstance.findUnique({
    where: { id: instanceId }
  })
  if (!instance) throw { code: 'INSTANCE_NOT_FOUND', message: '设备实例不存在' }

  const allPoints = await prisma.devicePoint.findMany({
    where: { instanceId },
    orderBy: { sort: 'asc' }
  })

  // 合并逻辑：DEVICE 覆盖 TEMPLATE
  const pointMap = new Map<string, any>()
  for (const p of allPoints) {
    if (p.source === 'TEMPLATE') {
      pointMap.set(p.tag, p)
    }
  }
  for (const p of allPoints) {
    if (p.source === 'DEVICE') {
      pointMap.set(p.tag, p) // 覆盖同 tag 的模板点位
    }
  }

  return Array.from(pointMap.values()).sort((a, b) => a.sort - b.sort)
}

export const getDeviceConfigForDeploy = async (instanceId: string) => {
  const instance = await prisma.deviceInstance.findUnique({
    where: { id: instanceId },
    include: { model: { select: { protocol: true } } }
  })
  if (!instance) throw { code: 'INSTANCE_NOT_FOUND', message: '设备实例不存在' }
  if (!instance.enabled) throw { code: 'DEVICE_DISABLED', message: '设备已禁用，无法下发配置' }

  const mergedPoints = await getMergedPoints(instanceId)

  return {
    instanceId: instance.id,
    instanceName: instance.name,
    protocol: instance.model.protocol,
    commConfig: instance.commConfig,
    nodeId: instance.nodeId,
    points: mergedPoints.map((p: any) => ({
      tag: p.tag,
      name: p.name,
      dataType: p.dataType,
      address: p.address,
      unit: p.unit,
      config: p.config,
      enabled: p.enabled,
      source: p.source,
    }))
  }
}

// ========== 通讯诊断 ==========

export const getDeviceDiagnostics = async (instanceId: string) => {
  const instance = await prisma.deviceInstance.findUnique({ where: { id: instanceId } })
  if (!instance) throw { code: 'INSTANCE_NOT_FOUND', message: '设备实例不存在' }

  // 从 Redis 读取诊断数据
  let diagData: { responseTime?: number } | null = null
  try {
    const { getRedisClient } = await import('../../config/redis')
    const redis = getRedisClient()
    if ((redis as any).isReady) {
      const raw = await redis.get(`device:${instanceId}:diagnostics`)
      if (raw) diagData = JSON.parse(raw)
    }
  } catch { /* Redis unavailable */ }

  // 从数据库统计最近24小时数据
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const errorCount = await prisma.deviceDataPoint.count({
    where: { deviceInstanceId: instanceId, quality: { not: 0 }, timestamp: { gte: oneDayAgo } }
  })
  const requestCount = await prisma.deviceDataPoint.count({
    where: { deviceInstanceId: instanceId, timestamp: { gte: oneDayAgo } }
  })

  // 最近错误（quality > 0，最近24小时）
  const lastErrors = await prisma.deviceDataPoint.findMany({
    where: { deviceInstanceId: instanceId, quality: { not: 0 }, timestamp: { gte: oneDayAgo } },
    orderBy: { timestamp: 'desc' },
    take: 5,
  })

  return {
    connectionStatus: instance.status === 'ONLINE' || instance.status === 'COLLECTING'
      ? 'CONNECTED' : instance.status === 'DISABLED' ? 'UNKNOWN' : 'DISCONNECTED',
    lastConnectTime: instance.lastDataTime?.toISOString() || null,
    lastDisconnectTime: null,
    errorCount,
    lastErrors: lastErrors.map(e => ({
      timestamp: e.timestamp,
      tag: e.pointCode,
      value: e.value,
    })),
    responseTime: diagData?.responseTime || null,
    requestCount,
  }
}

export const upgradeTemplateVersion = async (instanceId: string) => {
  // 查找实例（含模型）
  const instance = await prisma.deviceInstance.findUnique({
    where: { id: instanceId },
    include: { model: true }
  })
  if (!instance) throw new Error('设备实例不存在')

  // 检查是否有新版本
  if (instance.model.version <= instance.templateVersion) {
    throw new Error('已经是最新版本，无需升级')
  }

  // 解析模型最新点位
  const modelPoints = Array.isArray(instance.model.points) ? instance.model.points as any[] : []

  // 事务：删除旧 TEMPLATE 点位 → 创建新 TEMPLATE 点位 → 更新实例版本和状态
  await prisma.$transaction(async (tx) => {
    // 删除旧的 TEMPLATE 点位
    await tx.devicePoint.deleteMany({
      where: { instanceId, source: 'TEMPLATE' }
    })

    // 从模型重新创建 TEMPLATE 点位
    if (modelPoints.length > 0) {
      await tx.devicePoint.createMany({
        data: modelPoints.map((p: any, index: number) => ({
          instanceId,
          name: p.name || '',
          tag: p.code || p.tag || `point_${index}`,
          dataType: p.dataType || 'FLOAT32',
          address: p.address || '',
          unit: p.unit || null,
          description: p.description || null,
          config: p.config || {},
          enabled: p.enabled !== false,
          source: 'TEMPLATE',
          sort: index,
        }))
      })
    }

    // 更新实例：templateVersion + status=OFFLINE
    await tx.deviceInstance.update({
      where: { id: instanceId },
      data: {
        templateVersion: instance.model.version,
        status: 'OFFLINE',
      }
    })
  })

  // 返回更新后的实例
  return prisma.deviceInstance.findUnique({
    where: { id: instanceId },
    include: { points: true }
  })
}

// ========== 实时数据 & 历史数据 ==========

export const getDeviceRealtimeData = async (instanceId: string) => {
  const instance = await prisma.deviceInstance.findUnique({ where: { id: instanceId } })
  if (!instance) throw { code: 'INSTANCE_NOT_FOUND', message: '设备实例不存在' }

  // 从 Redis 读取实时数据
  const { getRedisClient } = await import('../../config/redis')
  const client = getRedisClient()
  const dataKey = `device:${instanceId}:data`
  const rawData = await client.get(dataKey)

  if (!rawData) return null

  const values = JSON.parse(rawData)
  const lastUpdate = Math.max(...Object.values(values).map((v: any) => v.timestamp || 0))

  return { values, lastUpdate }
}

export const getDeviceHistoryData = async (
  instanceId: string,
  params: { startTime?: string; endTime?: string; tags?: string[]; page?: number; pageSize?: number }
) => {
  const page = params.page || 1
  const pageSize = params.pageSize || 100

  const where: any = { deviceInstanceId: instanceId }
  if (params.startTime || params.endTime) {
    where.timestamp = {}
    if (params.startTime) where.timestamp.gte = new Date(params.startTime)
    if (params.endTime) where.timestamp.lte = new Date(params.endTime)
  }
  if (params.tags && params.tags.length > 0) where.pointCode = { in: params.tags }

  const [records, total] = await Promise.all([
    prisma.deviceDataPoint.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: { timestamp: 'desc' },
    }),
    prisma.deviceDataPoint.count({ where })
  ])

  return { list: records, total, page, pageSize }
}