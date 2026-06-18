import { DeviceModel, ModelVersion, ModelStatus } from '@prisma/client'
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
  // 1. 获取当前模型
  const currentModel = await repository.getDeviceModelById(id)
  if (!currentModel) {
    throw new Error('Device model not found')
  }

  // 2. 保存当前版本到 ModelVersion 表
  await repository.createModelVersion({
    modelId: id,
    version: currentModel.version,
    points: currentModel.points as object[]
  })

  // 3. 递增版本号 (v1.0 → v1.1)
  const currentVersion = currentModel.version
  const versionMatch = currentVersion.match(/v(\d+)\.(\d+)/)
  let newVersion = 'v1.1'
  if (versionMatch) {
    const major = parseInt(versionMatch[1], 10)
    const minor = parseInt(versionMatch[2], 10)
    newVersion = `v${major}.${minor + 1}`
  }

  // 4. 更新模型数据
  return repository.updateDeviceModel(id, {
    ...dto,
    version: newVersion
  })
}

export const deleteDeviceModel = async (id: string): Promise<DeviceModel> => {
  return repository.deleteDeviceModel(id)
}

export const getDeviceModelUsage = async (id: string): Promise<number> => {
  return repository.getDeviceModelUsage(id)
}

export const importPoints = async (id: string, points: any[]): Promise<DeviceModel> => {
  // 1. 获取当前模型
  // 2. 合并点位（去重：按 code 判断）
  // 3. 更新模型的 points 字段
  // 4. 返回更新后的模型
  return repository.importPoints(id, points)
}

export const duplicateModel = async (id: string, newName?: string): Promise<DeviceModel> => {
  // 1. 获取原模型
  const originalModel = await repository.getDeviceModelById(id)
  if (!originalModel) {
    throw new Error('Device model not found')
  }

  // 2. 创建新模型，名称为 `${原名称}_副本` 或传入的 newName
  const name = newName || `${originalModel.name}_副本`

  // 3. 复制所有点位（编码不变）
  // 4. 版本号初始化为 v1.0
  return repository.createDeviceModel({
    name,
    vendor: originalModel.vendor,
    model: originalModel.model,
    protocol: originalModel.protocol,
    description: originalModel.description || undefined,
    points: originalModel.points as object[]
  })
}

export const getVersionHistory = async (id: string): Promise<ModelVersion[]> => {
  // 返回该模型的所有历史版本
  return repository.getModelVersions(id)
}

export const updateModelStatus = async (id: string, status: 'ENABLED' | 'DISABLED'): Promise<DeviceModel> => {
  // 更新模型状态
  return repository.updateModelStatus(id, status as ModelStatus)
}