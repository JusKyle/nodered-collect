import { prisma } from '../../config/db'
import { DeviceModel } from '@prisma/client'

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
  data: { name?: string; vendor?: string; model?: string; protocol?: string; description?: string; points?: object[] }
): Promise<DeviceModel> => {
  return prisma.deviceModel.update({ where: { id }, data })
}

export const deleteDeviceModel = async (id: string): Promise<DeviceModel> => {
  return prisma.deviceModel.delete({ where: { id } })
}

export const getDeviceModelUsage = async (id: string): Promise<number> => {
  return prisma.deviceInstance.count({ where: { modelId: id } })
}