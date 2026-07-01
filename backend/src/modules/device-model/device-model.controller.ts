import { Request, Response } from 'express'
import * as service from './device-model.service'
import { createDeviceModelDto, updateDeviceModelDto } from './device-model.dto'

export const getAllDeviceModels = async (req: Request, res: Response) => {
  const page = Number(req.query.page || 1)
  const pageSize = Number(req.query.pageSize || 20)
  const result = await service.getDeviceModels({
    name: req.query.name as string | undefined,
    protocol: req.query.protocol as string | undefined,
    page,
    pageSize
  })
  res.json({ success: true, data: result })
}

export const getDeviceModelById = async (req: Request, res: Response) => {
  const { id } = req.params
  const model = await service.getDeviceModelById(id)
  if (!model) {
    return res.status(404).json({ message: 'Device model not found' })
  }
  res.json({ success: true, data: model })
}

export const createDeviceModel = async (req: Request, res: Response) => {
  const validation = createDeviceModelDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }

  try {
    const model = await service.createDeviceModel(validation.data)
    res.status(201).json({ success: true, data: model })
  } catch (error: any) {
    if (error?.code === 'MODEL_DI_EXISTS') {
      return res.status(409).json({ code: error.code, message: error.message })
    }
    throw error
  }
}

export const updateDeviceModelBasic = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const model = await service.updateDeviceModelBasic(id, req.body)
    res.json({ success: true, data: model })
  } catch (error: any) {
    if (error?.code === 'DEVICE_MODEL_NOT_FOUND') {
      return res.status(404).json({ code: error.code, message: error.message })
    }
    if (error?.code === 'MODEL_DI_EXISTS') {
      return res.status(409).json({ code: error.code, message: error.message })
    }
    throw error
  }
}

export const updateDeviceModel = async (req: Request, res: Response) => {
  const { id } = req.params
  const validation = updateDeviceModelDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  const model = await service.updateDeviceModel(id, validation.data)
  res.json(model)
}

const handleDeviceModelError = (res: Response, error: any) => {
  if (error?.code === 'DEVICE_MODEL_NOT_FOUND' || error?.code === 'POINT_NOT_FOUND') {
    return res.status(404).json({ code: error.code, message: error.message })
  }
  if (error?.code === 'POINT_TAG_EXISTS' || error?.code === 'MODEL_DI_EXISTS') {
    return res.status(409).json({ code: error.code, message: error.message })
  }
  if (error?.code === 'INVALID_POINT_PAYLOAD' || error?.code === 'DEVICE_MODEL_IN_USE' || error?.code === 'INVALID_PROTOCOL_CONFIG') {
    return res.status(400).json({ code: error.code, message: error.message })
  }
  throw error
}

export const getModelPoints = async (req: Request, res: Response) => {
  try {
    const result = await service.getModelPoints(req.params.id, {
      name: req.query.name as string | undefined,
      page: Number(req.query.page || 1),
      pageSize: Number(req.query.pageSize || 20)
    })
    res.json({ success: true, data: result })
  } catch (error: any) {
    return handleDeviceModelError(res, error)
  }
}

export const exportPoints = async (req: Request, res: Response) => {
  try {
    const points = await service.exportPoints(req.params.id)
    const header = '点位名称,点位标识,数据类型,地址,单位,描述\n'
    const rows = points.map((point: any) => [point.name, point.tag, point.dataType, point.address, point.unit || '', point.description || ''].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="points.csv"')
    res.send(`\uFEFF${header}${rows}`)
  } catch (error: any) {
    return handleDeviceModelError(res, error)
  }
}

export const createPoint = async (req: Request, res: Response) => {
  try {
    const point = await service.createPoint(req.params.id, req.body)
    res.status(201).json({ success: true, data: point })
  } catch (error: any) {
    return handleDeviceModelError(res, error)
  }
}

export const updatePoint = async (req: Request, res: Response) => {
  try {
    const point = await service.updatePoint(req.params.id, req.params.pointId, req.body)
    res.json({ success: true, data: point })
  } catch (error: any) {
    return handleDeviceModelError(res, error)
  }
}

export const deletePoint = async (req: Request, res: Response) => {
  try {
    await service.deletePoint(req.params.id, req.params.pointId)
    res.json({ success: true })
  } catch (error: any) {
    return handleDeviceModelError(res, error)
  }
}

export const deleteDeviceModel = async (req: Request, res: Response) => {
  const { id } = req.params
  const model = await service.deleteDeviceModel(id)
  res.json(model)
}

export const getDeviceModelUsage = async (req: Request, res: Response) => {
  const { id } = req.params
  const usage = await service.getDeviceModelUsage(id)
  res.json({ usage })
}

export const importPoints = async (req: Request, res: Response) => {
  const { id } = req.params
  const { points } = req.body
  if (!Array.isArray(points)) {
    return res.status(400).json({ message: 'points must be an array' })
  }
  const model = await service.importPoints(id, points)
  res.json(model)
}

export const duplicateModel = async (req: Request, res: Response) => {
  const { id } = req.params
  const { newName } = req.body
  const model = await service.duplicateModel(id, newName)
  res.status(201).json(model)
}

export const getVersionHistory = async (req: Request, res: Response) => {
  const { id } = req.params
  const versions = await service.getVersionHistory(id)
  res.json(versions)
}

export const updateModelStatus = async (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body
  if (status !== 'ENABLED' && status !== 'DISABLED') {
    return res.status(400).json({ message: 'status must be ENABLED or DISABLED' })
  }
  const model = await service.updateModelStatus(id, status)
  res.json(model)
}