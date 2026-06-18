import { Request, Response } from 'express'
import * as service from './gateway.service'
import { createGatewayDto, updateGatewayDto, testConnectionDto } from './gateway.dto'

export const getAllGateways = async (req: Request, res: Response) => {
  const gateways = await service.getAllGateways()
  res.json(gateways)
}

export const getGatewayById = async (req: Request, res: Response) => {
  const { id } = req.params
  const gateway = await service.getGatewayById(id)
  if (!gateway) {
    return res.status(404).json({ message: 'Gateway not found' })
  }
  res.json(gateway)
}

export const createGateway = async (req: Request, res: Response) => {
  const validation = createGatewayDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  const gateway = await service.createGateway(validation.data)
  res.status(201).json(gateway)
}

export const updateGateway = async (req: Request, res: Response) => {
  const { id } = req.params
  const validation = updateGatewayDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  const gateway = await service.updateGateway(id, validation.data)
  res.json(gateway)
}

export const deleteGateway = async (req: Request, res: Response) => {
  const { id } = req.params
  const gateway = await service.deleteGateway(id)
  res.json(gateway)
}

export const testConnection = async (req: Request, res: Response) => {
  const validation = testConnectionDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  const result = await service.testConnection(validation.data)
  res.json(result)
}

export const updateGatewayStatus = async (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body
  if (!status) {
    return res.status(400).json({ message: 'status is required' })
  }
  const gateway = await service.updateGateway(id, { status })
  res.json(gateway)
}