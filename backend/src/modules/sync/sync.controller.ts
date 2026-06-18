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

export const getSyncRecords = async (req: Request, res: Response) => {
  const params = {
    gatewayId: req.query.gatewayId as string,
    status: req.query.status as string,
    type: req.query.type as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    page: parseInt(req.query.page as string) || 1,
    pageSize: parseInt(req.query.pageSize as string) || 20
  }
  const result = await service.getSyncRecords(params)
  res.json(result)
}

export const getSyncRecordDetail = async (req: Request, res: Response) => {
  const { id } = req.params
  const record = await service.getSyncRecordDetail(id)
  if (!record) return res.status(404).json({ message: 'Record not found' })
  res.json(record)
}