import { Request, Response } from 'express'
import * as service from './device-model.service'
import { createDeviceModelDto, updateDeviceModelDto } from './device-model.dto'

export const getAllDeviceModels = async (req: Request, res: Response) => {
  const models = await service.getAllDeviceModels()
  res.json(models)
}

export const getDeviceModelById = async (req: Request, res: Response) => {
  const { id } = req.params
  const model = await service.getDeviceModelById(id)
  if (!model) {
    return res.status(404).json({ message: 'Device model not found' })
  }
  res.json(model)
}

export const createDeviceModel = async (req: Request, res: Response) => {
  const validation = createDeviceModelDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  const model = await service.createDeviceModel(validation.data)
  res.status(201).json(model)
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