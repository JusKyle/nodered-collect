import { DeviceInstance } from '@prisma/client'
import * as repository from './device-instance.repository'
import { CreateDeviceInstanceDto, UpdateDeviceInstanceDto, BatchCreateDeviceInstancesDto } from './device-instance.dto'

export const createDeviceInstance = async (dto: CreateDeviceInstanceDto): Promise<DeviceInstance> => {
  return repository.createDeviceInstance({
    name: dto.name,
    modelId: dto.modelId,
    gatewayId: dto.gatewayId,
    nodeId: dto.nodeId,
    config: dto.config
  })
}

export const batchCreateDeviceInstances = async (dto: BatchCreateDeviceInstancesDto): Promise<DeviceInstance[]> => {
  return repository.batchCreateDeviceInstances(dto.instances)
}

export const getAllDeviceInstances = async (): Promise<DeviceInstance[]> => {
  return repository.getAllDeviceInstances()
}

export const getDeviceInstanceById = async (id: string): Promise<DeviceInstance | null> => {
  return repository.getDeviceInstanceById(id)
}

export const getDeviceInstancesByGatewayId = async (gatewayId: string): Promise<DeviceInstance[]> => {
  return repository.getDeviceInstancesByGatewayId(gatewayId)
}

export const updateDeviceInstance = async (
  id: string,
  dto: UpdateDeviceInstanceDto
): Promise<DeviceInstance> => {
  return repository.updateDeviceInstance(id, dto)
}

export const deleteDeviceInstance = async (id: string): Promise<DeviceInstance> => {
  return repository.deleteDeviceInstance(id)
}