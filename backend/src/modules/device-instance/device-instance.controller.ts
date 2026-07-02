import { Request, Response } from 'express'
import * as service from './device-instance.service'
import { createDeviceInstanceDto, updateDeviceInstanceDto, batchCreateDeviceInstancesDto } from './device-instance.dto'

export const getDeviceInstances = async (req: Request, res: Response) => {
  const query = {
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    gatewayId: req.query.gatewayId as string | undefined,
    modelId: req.query.modelId as string | undefined,
    status: req.query.status as string | undefined,
    keyword: req.query.keyword as string | undefined,
    group: req.query.group as string | undefined,
  }
  const result = await service.getDeviceInstances(query)
  res.json({ data: result })
}

export const getGroups = async (req: Request, res: Response) => {
  try {
    const groups = await service.getAllGroups()
    res.json({ data: groups })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const getAllDeviceInstances = async (req: Request, res: Response) => {
  const instances = await service.getAllDeviceInstances()
  res.json(instances)
}

export const getDeviceInstanceById = async (req: Request, res: Response) => {
  const { id } = req.params
  const instance = await service.getDeviceInstanceDetail(id)
  if (!instance) {
    return res.status(404).json({ message: 'Device instance not found' })
  }
  res.json({ data: instance })
}

export const getDeviceInstancesByGatewayId = async (req: Request, res: Response) => {
  const { gatewayId } = req.params
  const instances = await service.getDeviceInstancesByGatewayId(gatewayId)
  res.json(instances)
}

export const createDeviceInstance = async (req: Request, res: Response) => {
  const validation = createDeviceInstanceDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  const instance = await service.createDeviceInstance(validation.data)
  res.status(201).json(instance)
}

export const createDeviceInstanceFull = async (req: Request, res: Response) => {
  const { name, modelId, gatewayId, description, commConfig, deviceId, group } = req.body
  if (!name || !modelId) {
    return res.status(400).json({ message: 'name, modelId are required' })
  }
  try {
    const instance = await service.createDeviceInstanceFull({
      name, modelId,
      gatewayId: gatewayId || undefined,
      description, commConfig,
      deviceId: deviceId || undefined,
      group: group || undefined,
    })
    res.status(201).json({ data: instance })
  } catch (error: any) {
    if (error.code === 'MODEL_NOT_FOUND' || error.code === 'GATEWAY_NOT_FOUND') {
      return res.status(400).json({ message: error.message })
    }
    res.status(500).json({ message: error.message })
  }
}

export const batchCreateDeviceInstances = async (req: Request, res: Response) => {
  const validation = batchCreateDeviceInstancesDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  const instances = await service.batchCreateDeviceInstances(validation.data)
  res.status(201).json(instances)
}

export const updateDeviceInstance = async (req: Request, res: Response) => {
  const { id } = req.params
  // 只提取允许更新的字段：name、description、commConfig
  const { name, description, commConfig } = req.body
  if (name === undefined && description === undefined && commConfig === undefined) {
    return res.status(400).json({ message: 'At least one of name, description, commConfig is required' })
  }
  try {
    const instance = await service.updateDeviceInstance(id, {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(commConfig !== undefined && { commConfig }),
    })
    res.json({ data: instance })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Device instance not found' })
    }
    res.status(500).json({ message: error.message })
  }
}

export const deleteDeviceInstance = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const instance = await service.deleteDeviceInstance(id)
    res.json({ data: instance })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Device instance not found' })
    }
    res.status(500).json({ message: error.message })
  }
}

export const changeGateway = async (req: Request, res: Response) => {
  const { id } = req.params
  const { gatewayId } = req.body
  if (!gatewayId) return res.status(400).json({ message: 'gatewayId is required' })
  const instance = await service.changeGateway(id, gatewayId)
  res.json(instance)
}

export const syncPoints = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const instance = await service.syncPoints(id)
    res.json(instance)
  } catch (error: any) {
    if (error.message === 'Instance or model not found') {
      return res.status(404).json({ message: error.message })
    }
    res.status(500).json({ message: error.message })
  }
}

export const enableDevice = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const instance = await service.enableDevice(id)
    res.json({ data: instance })
  } catch (error: any) {
    if (error.message === 'Device instance not found') {
      return res.status(404).json({ message: error.message })
    }
    res.status(400).json({ message: error.message })
  }
}

export const disableDevice = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const instance = await service.disableDevice(id)
    res.json({ data: instance })
  } catch (error: any) {
    if (error.message === 'Device instance not found') {
      return res.status(404).json({ message: error.message })
    }
    res.status(400).json({ message: error.message })
  }
}

// ========== 设备级点位 ==========

export const getDevicePoints = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const points = await service.getDevicePoints(id)
    res.json({ data: points })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const createDevicePoint = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, tag, dataType, address, unit, description, config } = req.body
  if (!name || !tag || !dataType || !address) {
    return res.status(400).json({ message: 'name, tag, dataType, address are required' })
  }
  try {
    const point = await service.createDevicePoint(id, { name, tag, dataType, address, unit, description, config })
    res.status(201).json({ data: point })
  } catch (error: any) {
    if (error.code === 'TAG_CONFLICT') {
      return res.status(409).json({ code: error.code, message: error.message })
    }
    res.status(500).json({ message: error.message })
  }
}

export const updateDevicePoint = async (req: Request, res: Response) => {
  const { pointId } = req.params
  const { name, tag, dataType, address, unit, description, config, enabled } = req.body
  try {
    const point = await service.updateDevicePoint(pointId, {
      ...(name !== undefined && { name }),
      ...(tag !== undefined && { tag }),
      ...(dataType !== undefined && { dataType }),
      ...(address !== undefined && { address }),
      ...(unit !== undefined && { unit }),
      ...(description !== undefined && { description }),
      ...(config !== undefined && { config }),
      ...(enabled !== undefined && { enabled }),
    })
    res.json({ data: point })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Device point not found' })
    }
    res.status(500).json({ message: error.message })
  }
}

export const deleteDevicePoint = async (req: Request, res: Response) => {
  const { pointId } = req.params
  try {
    const point = await service.deleteDevicePoint(pointId)
    res.json({ data: point })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Device point not found' })
    }
    res.status(500).json({ message: error.message })
  }
}

// ========== 合并点位 & 下发配置 ==========

export const getMergedPoints = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const points = await service.getMergedPoints(id)
    res.json({ data: points })
  } catch (error: any) {
    if (error.code === 'INSTANCE_NOT_FOUND') {
      return res.status(404).json({ code: error.code, message: error.message })
    }
    res.status(500).json({ message: error.message })
  }
}

export const getDeviceConfigForDeploy = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const config = await service.getDeviceConfigForDeploy(id)
    res.json({ data: config })
  } catch (error: any) {
    if (error.code === 'INSTANCE_NOT_FOUND') {
      return res.status(404).json({ code: error.code, message: error.message })
    }
    if (error.code === 'DEVICE_DISABLED') {
      return res.status(400).json({ code: error.code, message: error.message })
    }
    res.status(500).json({ message: error.message })
  }
}

// ========== 模板点位 & 模板升级 ==========

export const getTemplatePoints = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const points = await service.getTemplatePoints(id)
    if (points === null) {
      return res.status(404).json({ message: '设备实例不存在' })
    }
    res.json({ data: points })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}

export const upgradeTemplateVersion = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const instance = await service.upgradeTemplateVersion(id)
    res.json({ data: instance })
  } catch (error: any) {
    if (error.message === '设备实例不存在') {
      return res.status(404).json({ message: error.message })
    }
    if (error.message === '已经是最新版本，无需升级') {
      return res.status(400).json({ message: error.message })
    }
    res.status(500).json({ message: error.message })
  }
}

// ========== 通讯诊断 ==========

export const getDeviceDiagnostics = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const diagnostics = await service.getDeviceDiagnostics(id)
    res.json({ data: diagnostics })
  } catch (error: any) {
    if (error.code === 'INSTANCE_NOT_FOUND') {
      return res.status(404).json({ code: error.code, message: error.message })
    }
    res.status(500).json({ message: error.message })
  }
}

// ========== 批量操作 ==========

export const batchCreateDevices = async (req: Request, res: Response) => {
  const { gatewayId, modelId, count, namePrefix, startIndex } = req.body
  if (!gatewayId || !modelId || !count || !namePrefix) {
    return res.status(400).json({ message: 'gatewayId, modelId, count, namePrefix are required' })
  }
  try {
    const result = await service.batchCreateDevices({
      gatewayId, modelId, count: Number(count), namePrefix,
      startIndex: startIndex ? Number(startIndex) : undefined
    })
    res.status(201).json({ data: result })
  } catch (error: any) {
    if (error.message === '批量创建数量必须在1-100之间' ||
        error.message === '模板不存在' ||
        error.message === '网关不存在' ||
        error.message === '名称前缀不能为空') {
      return res.status(400).json({ message: error.message })
    }
    res.status(500).json({ message: error.message })
  }
}

export const batchUpgradeTemplate = async (req: Request, res: Response) => {
  const { instanceIds } = req.body
  if (!instanceIds || !Array.isArray(instanceIds) || instanceIds.length === 0) {
    return res.status(400).json({ message: 'instanceIds is required and must be a non-empty array' })
  }
  try {
    const result = await service.batchUpgradeTemplate(instanceIds)
    res.json({ data: result })
  } catch (error: any) {
    if (error.message === '请选择至少一个设备') {
      return res.status(400).json({ message: error.message })
    }
    res.status(500).json({ message: error.message })
  }
}

// ========== 实时数据 & 历史数据 ==========

export const getDeviceRealtimeData = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const data = await service.getDeviceRealtimeData(id)
    res.json({ data })
  } catch (error: any) {
    if (error.code === 'INSTANCE_NOT_FOUND') {
      return res.status(404).json({ code: error.code, message: error.message })
    }
    res.status(500).json({ message: error.message })
  }
}

export const getDeviceHistoryData = async (req: Request, res: Response) => {
  const { id } = req.params
  const { startTime, endTime, tags, page, pageSize } = req.query
  try {
    const result = await service.getDeviceHistoryData(id, {
      startTime: startTime as string | undefined,
      endTime: endTime as string | undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
    res.json({ data: result })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}