import { DeviceInstance, DeviceStatus } from '@prisma/client'
import * as repository from './device-instance.repository'
import { CreateDeviceInstanceDto, UpdateDeviceInstanceDto, BatchCreateDeviceInstancesDto } from './device-instance.dto'

export const getDeviceInstances = async (query: {
  page?: number
  pageSize?: number
  gatewayId?: string
  modelId?: string
  status?: string
  keyword?: string
  group?: string
}) => {
  return repository.getDeviceInstances(query)
}

export const getAllGroups = async (): Promise<string[]> => {
  return repository.getAllGroups()
}

export const createDeviceInstance = async (dto: CreateDeviceInstanceDto): Promise<DeviceInstance> => {
  return repository.createDeviceInstance({
    name: dto.name,
    modelId: dto.modelId,
    gatewayId: dto.gatewayId,
    nodeId: dto.nodeId,
    config: dto.config
  })
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
  if (!data.name || data.name.trim() === '') {
    throw new Error('设备名称不能为空')
  }
  return repository.createDeviceInstanceFull(data)
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

export const getDeviceInstanceDetail = async (id: string) => {
  return repository.getDeviceInstanceDetail(id)
}

export const updateDeviceInstance = async (
  id: string,
  data: { name?: string; description?: string; commConfig?: object }
) => {
  return repository.updateDeviceInstance(id, data)
}

export const updateDeviceInstanceStatus = async (
  id: string,
  status: DeviceStatus,
  lastSyncTime?: Date
): Promise<DeviceInstance> => {
  return repository.updateDeviceInstanceStatus(id, status, lastSyncTime)
}

export const deleteDeviceInstance = async (id: string) => {
  return repository.deleteDeviceInstance(id)
}

export const changeGateway = async (id: string, gatewayId: string): Promise<DeviceInstance> => {
  return repository.changeGateway(id, gatewayId)
}

export const syncPoints = async (id: string): Promise<DeviceInstance> => {
  const instanceWithModel = await repository.getDeviceInstanceWithModel(id)
  if (!instanceWithModel || !instanceWithModel.model) {
    throw new Error('Instance or model not found')
  }

  // Merge points: update inherited points from model, keep custom points
  const modelPoints = (instanceWithModel.model.points as any[]) || []
  const customPoints = (instanceWithModel.config as any)?.customPoints || []

  // Merge: modelPoints update, customPoints retained
  const mergedConfig = {
    points: modelPoints,
    customPoints
  }

  return repository.updateInstanceConfig(id, mergedConfig)
}

export const enableDevice = async (id: string): Promise<DeviceInstance> => {
  const instance = await repository.getDeviceInstanceById(id)
  if (!instance) throw new Error('Device instance not found')
  if (instance.enabled) throw new Error('Device is already enabled')
  return repository.toggleDeviceEnabled(id, true)
}

export const disableDevice = async (id: string): Promise<DeviceInstance> => {
  const instance = await repository.getDeviceInstanceById(id)
  if (!instance) throw new Error('Device instance not found')
  if (!instance.enabled) throw new Error('Device is already disabled')
  return repository.toggleDeviceEnabled(id, false)
}

// ========== 设备级点位 ==========

export const getDevicePoints = async (instanceId: string) => {
  return repository.getDevicePoints(instanceId)
}

export const createDevicePoint = async (instanceId: string, data: {
  name: string; tag: string; dataType: string; address: string;
  unit?: string; description?: string; config?: any;
}) => {
  return repository.createDevicePoint(instanceId, data)
}

export const updateDevicePoint = async (pointId: string, data: Partial<{
  name: string; tag: string; dataType: string; address: string;
  unit: string; description: string; config: any; enabled: boolean;
}>) => {
  return repository.updateDevicePoint(pointId, data)
}

export const deleteDevicePoint = async (pointId: string) => {
  return repository.deleteDevicePoint(pointId)
}

// ========== 合并点位 & 下发配置 ==========

export const getMergedPoints = async (instanceId: string) => {
  return repository.getMergedPoints(instanceId)
}

export const getDeviceConfigForDeploy = async (instanceId: string) => {
  return repository.getDeviceConfigForDeploy(instanceId)
}

// ========== 模板点位 & 模板升级 ==========

export const getTemplatePoints = async (instanceId: string) => {
  return repository.getTemplatePoints(instanceId)
}

export const upgradeTemplateVersion = async (instanceId: string) => {
  return repository.upgradeTemplateVersion(instanceId)
}

// ========== 通讯诊断 ==========

export const getDeviceDiagnostics = async (instanceId: string) => {
  return repository.getDeviceDiagnostics(instanceId)
}

// ========== 批量操作 ==========

export const batchCreateDevices = async (params: {
  gatewayId: string; modelId: string; count: number;
  namePrefix: string; startIndex?: number;
}) => {
  if (!params.namePrefix || params.namePrefix.trim() === '') {
    throw new Error('名称前缀不能为空')
  }
  return repository.batchCreateDevices(params)
}

export const batchUpgradeTemplate = async (instanceIds: string[]) => {
  if (!instanceIds || instanceIds.length === 0) {
    throw new Error('请选择至少一个设备')
  }
  return repository.batchUpgradeTemplate(instanceIds)
}

// ========== 实时数据 & 历史数据 ==========

export const getDeviceRealtimeData = async (instanceId: string) => {
  return repository.getDeviceRealtimeData(instanceId)
}

export const getDeviceHistoryData = async (
  instanceId: string,
  params: { startTime?: string; endTime?: string; tags?: string[]; page?: number; pageSize?: number }
) => {
  return repository.getDeviceHistoryData(instanceId, params)
}