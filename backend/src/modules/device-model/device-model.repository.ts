import { prisma } from '../../config/db'
import { DeviceModel, ModelVersion, ModelStatus, Prisma, DataType } from '@prisma/client'

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
  version: number
  createdAt: Date
  updatedAt: Date
  pointCount: number
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
      include: { _count: { select: { pointModels: true } } }
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
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      pointCount: model._count.pointModels
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
    where: { id },
    include: { pointModels: { orderBy: { sort: 'asc' } } }
  })
  if (!model) return null

  return {
    id: model.id,
    modelDI: model.model,
    name: model.name,
    protocol: model.protocol,
    version: model.version,
    description: model.description,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    points: model.pointModels
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
  data: { name?: string; vendor?: string; model?: string; protocol?: string; description?: string; points?: object[]; status?: ModelStatus; version?: number }
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
  tag?: string
  dataType?: DataType | string
  address?: string
  unit?: string
  description?: string
  config?: object
}

export const getModelPoints = async (
  modelId: string,
  query: { name?: string; page: number; pageSize: number }
) => {
  const where: Prisma.PointModelWhereInput = {
    modelId,
    ...(query.name
      ? {
          OR: [
            { name: { contains: query.name, mode: 'insensitive' } },
            { tag: { contains: query.name, mode: 'insensitive' } }
          ]
        }
      : {})
  }

  const [list, total] = await Promise.all([
    prisma.pointModel.findMany({
      where,
      orderBy: { sort: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    }),
    prisma.pointModel.count({ where })
  ])

  return { list, total, page: query.page, pageSize: query.pageSize }
}

export const findPointByTag = async (modelId: string, tag: string) => {
  return prisma.pointModel.findUnique({ where: { modelId_tag: { modelId, tag } } })
}

export const getPointById = async (id: string) => {
  return prisma.pointModel.findUnique({ where: { id } })
}

export const createPointWithVersion = async (modelId: string, data: PointInput) => {
  return prisma.$transaction(async (tx) => {
    const lastPoint = await tx.pointModel.findFirst({ where: { modelId }, orderBy: { sort: 'desc' } })
    const point = await tx.pointModel.create({
      data: {
        modelId,
        name: data.name!,
        tag: data.tag!,
        dataType: data.dataType as DataType,
        address: data.address || '',
        unit: data.unit,
        description: data.description,
        config: data.config || {},
        sort: lastPoint ? lastPoint.sort + 1 : 0
      }
    })
    await tx.deviceModel.update({ where: { id: modelId }, data: { version: { increment: 1 } } })
    return point
  })
}

export const updatePointWithVersion = async (modelId: string, pointId: string, data: PointInput) => {
  return prisma.$transaction(async (tx) => {
    const point = await tx.pointModel.update({
      where: { id: pointId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.tag !== undefined ? { tag: data.tag } : {}),
        ...(data.dataType !== undefined ? { dataType: data.dataType as DataType } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.config !== undefined ? { config: data.config } : {})
      }
    })
    await tx.deviceModel.update({ where: { id: modelId }, data: { version: { increment: 1 } } })
    return point
  })
}

export const deletePointWithVersion = async (modelId: string, pointId: string): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    await tx.pointModel.delete({ where: { id: pointId } })
    const points = await tx.pointModel.findMany({ where: { modelId }, orderBy: { sort: 'asc' } })
    await Promise.all(points.map((point, index) => tx.pointModel.update({ where: { id: point.id }, data: { sort: index } })))
    await tx.deviceModel.update({ where: { id: modelId }, data: { version: { increment: 1 } } })
  })
}

export const createModelVersion = async (data: {
  modelId: string
  version: number
  points: object[]
}): Promise<ModelVersion> => {
  return prisma.modelVersion.create({ data })
}

export const duplicateDeviceModelWithPoints = async (id: string, name: string): Promise<DeviceModel> => {
  return prisma.$transaction(async (tx) => {
    const originalModel = await tx.deviceModel.findUnique({ where: { id }, include: { pointModels: true } })
    if (!originalModel) {
      throw { code: 'DEVICE_MODEL_NOT_FOUND', message: 'Device model not found' }
    }
    const copiedModel = await tx.deviceModel.create({
      data: {
        name,
        vendor: originalModel.vendor,
        model: `${originalModel.model}_copy_${Date.now()}`,
        protocol: originalModel.protocol,
        description: originalModel.description,
        points: [],
        version: 1
      }
    })
    if (originalModel.pointModels.length > 0) {
      await tx.pointModel.createMany({
        data: originalModel.pointModels.map((point) => ({
          modelId: copiedModel.id,
          name: point.name,
          tag: point.tag,
          dataType: point.dataType,
          address: point.address,
          unit: point.unit,
          description: point.description,
          config: point.config || {},
          sort: point.sort
        }))
      })
    }
    return copiedModel
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

export const importPoints = async (id: string, points: object[]): Promise<DeviceModel> => {
  await prisma.$transaction(async (tx) => {
    const lastPoint = await tx.pointModel.findFirst({ where: { modelId: id }, orderBy: { sort: 'desc' } })
    await tx.pointModel.createMany({
      data: points.map((point: any, index) => ({
        modelId: id,
        name: point.name,
        tag: point.tag || point.code,
        dataType: point.dataType,
        address: point.address,
        unit: point.unit,
        description: point.description,
        config: point.config || {},
        sort: (lastPoint ? lastPoint.sort + 1 : 0) + index
      }))
    })
    await tx.deviceModel.update({ where: { id }, data: { version: { increment: 1 } } })
  })

  return prisma.deviceModel.findUniqueOrThrow({ where: { id } })
}

export const getAllModelPoints = async (modelId: string) => {
  return prisma.pointModel.findMany({ where: { modelId }, orderBy: { sort: 'asc' } })
}
