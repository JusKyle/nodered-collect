import { Request, Response } from 'express'
import * as service from './sync.service'
import { createSyncRecordDto, deployConfigDto } from './sync.dto'

export const getAllSyncRecords = async (req: Request, res: Response) => {
  const records = await service.getAllSyncRecords()
  res.json(records)
}

export const getSyncRecordsByGatewayId = async (req: Request, res: Response) => {
  const { gatewayId } = req.params
  const records = await service.getSyncRecordsByGatewayId(gatewayId)
  res.json(records)
}

export const createSyncRecord = async (req: Request, res: Response) => {
  const validation = createSyncRecordDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  const record = await service.createSyncRecord(validation.data)
  res.status(201).json(record)
}

export const deployConfig = async (req: Request, res: Response) => {
  const validation = deployConfigDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  const record = await service.deployConfig(validation.data)
  res.status(201).json(record)
}

export const undeployConfig = async (req: Request, res: Response) => {
  const { deviceInstanceId, gatewayId } = req.body
  if (!deviceInstanceId || !gatewayId) {
    return res.status(400).json({ message: 'deviceInstanceId and gatewayId are required' })
  }
  const record = await service.undeployConfig({ deviceInstanceId, gatewayId })
  res.json(record)
}