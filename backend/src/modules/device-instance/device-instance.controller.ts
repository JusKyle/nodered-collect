import { Request, Response } from 'express'
import * as service from './device-instance.service'
import { createDeviceInstanceDto, updateDeviceInstanceDto, batchCreateDeviceInstancesDto } from './device-instance.dto'

export const getAllDeviceInstances = async (req: Request, res: Response) => {
  const instances = await service.getAllDeviceInstances()
  res.json(instances)
}

export const getDeviceInstanceById = async (req: Request, res: Response) => {
  const { id } = req.params
  const instance = await service.getDeviceInstanceById(id)
  if (!instance) {
    return res.status(404).json({ message: 'Device instance not found' })
  }
  res.json(instance)
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
  const validation = updateDeviceInstanceDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  const instance = await service.updateDeviceInstance(id, validation.data)
  res.json(instance)
}

export const deleteDeviceInstance = async (req: Request, res: Response) => {
  const { id } = req.params
  const instance = await service.deleteDeviceInstance(id)
  res.json(instance)
}