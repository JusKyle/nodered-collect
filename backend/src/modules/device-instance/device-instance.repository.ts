import { prisma } from '../../config/db'
import { DeviceInstance, DeviceStatus } from '@prisma/client'

export const createDeviceInstance = async (data: {
  name: string
  modelId: string
  gatewayId: string
  nodeId: string
  config?: object
}): Promise<DeviceInstance> => {
  return prisma.deviceInstance.create({ data })
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

export const getDeviceInstanceById = async (id: string): Promise<DeviceInstance | null> => {
  return prisma.deviceInstance.findUnique({ where: { id }, include: { model: true, gateway: true } })
}

export const getDeviceInstancesByGatewayId = async (gatewayId: string): Promise<DeviceInstance[]> => {
  return prisma.deviceInstance.findMany({
    where: { gatewayId },
    include: { model: true }
  })
}

export const updateDeviceInstance = async (
  id: string,
  data: { name?: string; modelId?: string; gatewayId?: string; nodeId?: string; config?: object; status?: DeviceStatus }
): Promise<DeviceInstance> => {
  return prisma.deviceInstance.update({ where: { id }, data })
}

export const deleteDeviceInstance = async (id: string): Promise<DeviceInstance> => {
  return prisma.deviceInstance.delete({ where: { id } })
}

export const changeGateway = async (id: string, gatewayId: string): Promise<DeviceInstance> => {
  return prisma.deviceInstance.update({
    where: { id },
    data: { gatewayId, status: 'PENDING_SYNC' }
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