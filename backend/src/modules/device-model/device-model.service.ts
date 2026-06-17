import { DeviceModel } from '@prisma/client'
import * as repository from './device-model.repository'
import { CreateDeviceModelDto, UpdateDeviceModelDto } from './device-model.dto'

export const createDeviceModel = async (dto: CreateDeviceModelDto): Promise<DeviceModel> => {
  return repository.createDeviceModel({
    name: dto.name,
    vendor: dto.vendor,
    model: dto.model,
    protocol: dto.protocol,
    description: dto.description,
    points: dto.points
  })
}

export const getAllDeviceModels = async (): Promise<DeviceModel[]> => {
  return repository.getAllDeviceModels()
}

export const getDeviceModelById = async (id: string): Promise<DeviceModel | null> => {
  return repository.getDeviceModelById(id)
}

export const updateDeviceModel = async (
  id: string,
  dto: UpdateDeviceModelDto
): Promise<DeviceModel> => {
  return repository.updateDeviceModel(id, dto)
}

export const deleteDeviceModel = async (id: string): Promise<DeviceModel> => {
  return repository.deleteDeviceModel(id)
}

export const getDeviceModelUsage = async (id: string): Promise<number> => {
  return repository.getDeviceModelUsage(id)
}