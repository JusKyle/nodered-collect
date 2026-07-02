import { prisma } from '../../config/db'
import { DeviceModel, ModelVersion, ModelStatus, Prisma } from '@prisma/client'

export interface DeviceModelListQuery {
  name?: string
  protocol?: string
  page: number
  pageSize: number
}

export interface DeviceModelListItem {
  id: string
  modelDI: string
  name: string
  protocol: string
  version: string
  status: string
  createdAt: Date
  updatedAt: Date
  pointCount: number
  instanceCount: number
}

export const createDeviceModel = async (data: {
  name: string
  vendor: string
  model: string
  protocol: string
  description?: string
  points: object[]
}): Promise<DeviceModel> => {
  return prisma.deviceModel.create({ data })
}

export const getDeviceModels = async (query: DeviceModelListQuery): Promise<{
  list: DeviceModelListItem[]
  total: number
  page: number
  pageSize: number
}> => {
  const where: Prisma.DeviceModelWhereInput = {
    ...(query.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}),
    ...(query.protocol ? { protocol: query.protocol } : {})
  }

  const [models, total] = await Promise.all([
    prisma.deviceModel.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        model: true,
        name: true,
        protocol: true,
        version: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        points: true,
        _count: { select: { deviceInstances: true } }
      }
    }),
    prisma.deviceModel.count({ where })
  ])

  return {
    list: models.map((model) => ({
      id: model.id,
      modelDI: model.model,
      name: model.name,
      protocol: model.protocol,
      version: model.version,
      status: model.status,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      pointCount: Array.isArray(model.points) ? model.points.length : 0,
      instanceCount: model._count.deviceInstances
    })),
    total,
    page: query.page,
    pageSize: query.pageSize
  }
}

export const getAllDeviceModels = async (): Promise<DeviceModel[]> => {
  return prisma.deviceModel.findMany()
}

export const findDeviceModelByModelDI = async (modelDI: string): Promise<Pick<DeviceModel, 'id'> | null> => {
  return prisma.deviceModel.findFirst({ where: { model: modelDI }, select: { id: true } })
}

export const getDeviceModelById = async (id: string): Promise<DeviceModel | null> => {
  return prisma.deviceModel.findUnique({ where: { id } })
}

export const getDeviceModelDetailById = async (id: string) => {
  const model = await prisma.deviceModel.findUnique({
    where: { id }
  })
  if (!model) return null

  return {
    id: model.id,
    modelDI: model.model,
    name: model.name,
    vendor: model.vendor,
    protocol: model.protocol,
    version: model.version,
    description: model.description,
    status: model.status,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    points: model.points
  }
}

export const updateDeviceModelBasic = async (
  id: string,
  data: { name?: string; model?: string; description?: string }
): Promise<DeviceModel> => {
  return prisma.deviceModel.update({ where: { id }, data })
}

export const updateDeviceModel = async (
  id: string,
  data: { name?: string; vendor?: string; model?: string; protocol?: string; description?: string; points?: object[]; status?: ModelStatus; version?: string }
): Promise<DeviceModel> => {
  return prisma.deviceModel.update({ where: { id }, data })
}

export const deleteDeviceModel = async (id: string): Promise<DeviceModel> => {
  const usage = await getDeviceModelUsage(id)
  if (usage > 0) {
    throw { code: 'DEVICE_MODEL_IN_USE', message: '该模板已有实例关联，无法删除' }
  }
  return prisma.deviceModel.delete({ where: { id } })
}

export const getDeviceModelUsage = async (id: string): Promise<number> => {
  return prisma.deviceInstance.count({ where: { modelId: id } })
}

export interface PointInput {
  name?: string
  code?: string
  dataType?: string
  address?: string
  unit?: string
  description?: string
  readWrite?: string
}

// points 存储在 DeviceModel 的 JSON 字段中，以下函数直接操作该字段

export const getModelPoints = async (
  modelId: string,
  query: { name?: string; page: number; pageSize: number }
) => {
  const model = await prisma.deviceModel.findUnique({ where: { id: modelId } })
  if (!model) throw { code: 'MODEL_NOT_FOUND', message: '模板不存在' }

  let points = (model.points as any[]) || []
  if (query.name) {
    const keyword = query.name.toLowerCase()
    points = points.filter((p: any) =>
      (p.name && p.name.toLowerCase().includes(keyword)) ||
      (p.code && p.code.toLowerCase().includes(keyword))
    )
  }

  const total = points.length
  const start = (query.page - 1) * query.pageSize
  const list = points.slice(start, start + query.pageSize)

  return { list, total, page: query.page, pageSize: query.pageSize }
}

export const createPoint = async (modelId: string, data: PointInput) => {
  const model = await prisma.deviceModel.findUnique({ where: { id: modelId } })
  if (!model) throw { code: 'MODEL_NOT_FOUND', message: '模板不存在' }

  const points = (model.points as any[]) || []
  const newPoint = {
    name: data.name || '',
    code: data.code || '',
    dataType: data.dataType || 'FLOAT',
    address: data.address || '',
    unit: data.unit || '',
    description: data.description || '',
    readWrite: data.readWrite || 'R'
  }
  points.push(newPoint)

  const newVersion = model.version + 1
  await prisma.modelVersion.create({
    data: { modelId, version: model.version, points: model.points as any }
  })

  return prisma.deviceModel.update({
    where: { id: modelId },
    data: { points, version: newVersion }
  })
}

export const updatePoint = async (modelId: string, pointIndex: number, data: PointInput) => {
  const model = await prisma.deviceModel.findUnique({ where: { id: modelId } })
  if (!model) throw { code: 'MODEL_NOT_FOUND', message: '模板不存在' }

  const points = (model.points as any[]) || []
  if (pointIndex < 0 || pointIndex >= points.length) {
    throw { code: 'POINT_NOT_FOUND', message: '点位不存在' }
  }

  points[pointIndex] = {
    ...points[pointIndex],
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.code !== undefined ? { code: data.code } : {}),
    ...(data.dataType !== undefined ? { dataType: data.dataType } : {}),
    ...(data.address !== undefined ? { address: data.address } : {}),
    ...(data.unit !== undefined ? { unit: data.unit } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.readWrite !== undefined ? { readWrite: data.readWrite } : {})
  }

  const newVersion = model.version + 1
  await prisma.modelVersion.create({
    data: { modelId, version: model.version, points: model.points as any }
  })

  return prisma.deviceModel.update({
    where: { id: modelId },
    data: { points, version: newVersion }
  })
}

export const deletePoint = async (modelId: string, pointIndex: number): Promise<void> => {
  const model = await prisma.deviceModel.findUnique({ where: { id: modelId } })
  if (!model) throw { code: 'MODEL_NOT_FOUND', message: '模板不存在' }

  const points = (model.points as any[]) || []
  if (pointIndex < 0 || pointIndex >= points.length) {
    throw { code: 'POINT_NOT_FOUND', message: '点位不存在' }
  }

  points.splice(pointIndex, 1)

  const newVersion = model.version + 1
  await prisma.modelVersion.create({
    data: { modelId, version: model.version, points: model.points as any }
  })

  await prisma.deviceModel.update({
    where: { id: modelId },
    data: { points, version: newVersion }
  })
}

export const createModelVersion = async (data: {
  modelId: string
  version: number
  points: any
}): Promise<ModelVersion> => {
  return prisma.modelVersion.create({ data })
}

export const duplicateDeviceModel = async (id: string, name: string): Promise<DeviceModel> => {
  const originalModel = await prisma.deviceModel.findUnique({ where: { id } })
  if (!originalModel) {
    throw { code: 'DEVICE_MODEL_NOT_FOUND', message: 'Device model not found' }
  }

  return prisma.deviceModel.create({
    data: {
      name,
      vendor: originalModel.vendor,
      model: `${originalModel.model}_copy_${Date.now()}`,
      protocol: originalModel.protocol,
      description: originalModel.description,
      points: originalModel.points as any,
      status: ModelStatus.ENABLED,
      version: 1
    }
  })
}

export const getModelVersions = async (modelId: string): Promise<ModelVersion[]> => {
  return prisma.modelVersion.findMany({
    where: { modelId },
    orderBy: { createdAt: 'desc' }
  })
}

export const updateModelStatus = async (id: string, status: ModelStatus): Promise<DeviceModel> => {
  return prisma.deviceModel.update({ where: { id }, data: { status } })
}

export const importPoints = async (id: string, newPoints: object[]): Promise<DeviceModel> => {
  const model = await prisma.deviceModel.findUnique({ where: { id } })
  if (!model) throw { code: 'MODEL_NOT_FOUND', message: '模板不存在' }

  const existingPoints = (model.points as any[]) || []
  const mergedPoints = [...existingPoints, ...newPoints]

  return prisma.deviceModel.update({
    where: { id },
    data: { points: mergedPoints }
  })
}

export const getAllModelPoints = async (modelId: string) => {
  const model = await prisma.deviceModel.findUnique({ where: { id: modelId } })
  if (!model) return []
  return (model.points as any[]) || []
}
