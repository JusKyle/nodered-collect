import { prisma } from '../../config/db'
import { DeviceModel, ModelVersion, ModelStatus } from '@prisma/client'

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

export const getAllDeviceModels = async (): Promise<DeviceModel[]> => {
  return prisma.deviceModel.findMany()
}

export const getDeviceModelById = async (id: string): Promise<DeviceModel | null> => {
  return prisma.deviceModel.findUnique({ where: { id } })
}

export const updateDeviceModel = async (
  id: string,
  data: { name?: string; vendor?: string; model?: string; protocol?: string; description?: string; points?: object[]; status?: ModelStatus; version?: string }
): Promise<DeviceModel> => {
  return prisma.deviceModel.update({ where: { id }, data })
}

export const deleteDeviceModel = async (id: string): Promise<DeviceModel> => {
  return prisma.deviceModel.delete({ where: { id } })
}

export const getDeviceModelUsage = async (id: string): Promise<number> => {
  return prisma.deviceInstance.count({ where: { modelId: id } })
}

export const createModelVersion = async (data: {
  modelId: string
  version: string
  points: object[]
}): Promise<ModelVersion> => {
  return prisma.modelVersion.create({ data })
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
  const model = await prisma.deviceModel.findUnique({ where: { id } })
  if (!model) {
    throw new Error('Device model not found')
  }

  const existingPoints = model.points as object[]
  const existingCodes = new Set(existingPoints.map((p: any) => p.code))

  const mergedPoints = [...existingPoints]
  for (const point of points) {
    const pointCode = (point as any).code
    if (!existingCodes.has(pointCode)) {
      mergedPoints.push(point)
      existingCodes.add(pointCode)
    }
  }

  return prisma.deviceModel.update({
    where: { id },
    data: { points: mergedPoints }
  })
}