import { DeviceModel, ModelVersion, ModelStatus } from '@prisma/client'
import * as repository from './device-model.repository'
import { CreateDeviceModelDto, UpdateDeviceModelDto } from './device-model.dto'
import { validateProtocolConfig } from './protocol-config'

interface CreateDeviceModelInput extends Omit<CreateDeviceModelDto, 'points'> {
  points?: CreateDeviceModelDto['points']
}

export interface DeviceModelListQuery {
  name?: string
  protocol?: string
  page?: number
  pageSize?: number
}

export const createDeviceModel = async (dto: CreateDeviceModelInput): Promise<DeviceModel> => {
  const modelDI = dto.modelDI || dto.model!
  const existingModel = await repository.findDeviceModelByModelDI(modelDI)
  if (existingModel) {
    throw { code: 'MODEL_DI_EXISTS', message: '模型ID已存在' }
  }

  return repository.createDeviceModel({
    name: dto.name,
    vendor: dto.vendor || '',
    model: modelDI,
    protocol: dto.protocol,
    description: dto.description,
    points: dto.points || []
  })
}

export const getDeviceModels = async (query: DeviceModelListQuery) => {
  return repository.getDeviceModels({
    name: query.name,
    protocol: query.protocol,
    page: query.page || 1,
    pageSize: query.pageSize || 20
  })
}

export const getAllDeviceModels = async (): Promise<DeviceModel[]> => {
  return repository.getAllDeviceModels()
}

export const getDeviceModelById = async (id: string) => {
  return repository.getDeviceModelDetailById(id)
}

export const updateDeviceModelBasic = async (
  id: string,
  dto: { name?: string; modelDI?: string; description?: string; protocol?: string }
): Promise<DeviceModel> => {
  const currentModel = await repository.getDeviceModelById(id)
  if (!currentModel) {
    throw { code: 'DEVICE_MODEL_NOT_FOUND', message: 'Device model not found' }
  }

  if (dto.modelDI && dto.modelDI !== currentModel.model) {
    const existingModel = await repository.findDeviceModelByModelDI(dto.modelDI)
    if (existingModel && existingModel.id !== id) {
      throw { code: 'MODEL_DI_EXISTS', message: '模型ID已存在' }
    }
  }

  return repository.updateDeviceModelBasic(id, {
    ...(dto.name !== undefined ? { name: dto.name } : {}),
    ...(dto.modelDI !== undefined ? { model: dto.modelDI } : {}),
    ...(dto.description !== undefined ? { description: dto.description } : {})
  })
}

export const updateDeviceModel = async (
  id: string,
  dto: UpdateDeviceModelDto
): Promise<DeviceModel> => {
  const currentModel = await repository.getDeviceModelById(id)
  if (!currentModel) {
    throw new Error('Device model not found')
  }

  // 保存当前版本到 ModelVersion 表
  await repository.createModelVersion({
    modelId: id,
    version: currentModel.version,
    points: (currentModel.points as object[]) || []
  })

  return repository.updateDeviceModel(id, dto)
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

export const getModelPoints = async (
  modelId: string,
  query: { name?: string; page?: number; pageSize?: number }
) => {
  const model = await repository.getDeviceModelById(modelId)
  if (!model) {
    throw { code: 'DEVICE_MODEL_NOT_FOUND', message: 'Device model not found' }
  }

  return repository.getModelPoints(modelId, {
    name: query.name,
    page: query.page || 1,
    pageSize: query.pageSize || 20
  })
}

export const createPoint = async (modelId: string, dto: PointInput) => {
  const model = await repository.getDeviceModelById(modelId)
  if (!model) {
    throw { code: 'DEVICE_MODEL_NOT_FOUND', message: 'Device model not found' }
  }
  if (!dto.name || !dto.dataType) {
    throw { code: 'INVALID_POINT_PAYLOAD', message: 'name and dataType are required' }
  }

  return repository.createPoint(modelId, dto)
}

export const updatePoint = async (modelId: string, pointIndex: number, dto: PointInput) => {
  return repository.updatePoint(modelId, pointIndex, dto)
}

export const deletePoint = async (modelId: string, pointIndex: number) => {
  await repository.deletePoint(modelId, pointIndex)
}

export const deleteDeviceModel = async (id: string): Promise<DeviceModel> => {
  return repository.deleteDeviceModel(id)
}

export const getDeviceModelUsage = async (id: string): Promise<number> => {
  return repository.getDeviceModelUsage(id)
}

export const importPoints = async (id: string, points: any[]): Promise<DeviceModel> => {
  return repository.importPoints(id, points)
}

export const exportPoints = async (id: string) => {
  const model = await repository.getDeviceModelById(id)
  if (!model) {
    throw { code: 'DEVICE_MODEL_NOT_FOUND', message: 'Device model not found' }
  }
  return repository.getAllModelPoints(id)
}

export const duplicateModel = async (id: string, newName?: string): Promise<DeviceModel> => {
  const originalModel = await repository.getDeviceModelById(id)
  if (!originalModel) {
    throw new Error('Device model not found')
  }

  const name = newName || `${originalModel.name}_副本`
  return repository.duplicateDeviceModel(id, name)
}

export const getVersionHistory = async (id: string): Promise<ModelVersion[]> => {
  return repository.getModelVersions(id)
}

export const updateModelStatus = async (id: string, status: 'ENABLED' | 'DISABLED'): Promise<DeviceModel> => {
  return repository.updateModelStatus(id, status as ModelStatus)
}