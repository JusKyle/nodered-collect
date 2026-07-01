import { Request, Response } from 'express'
import * as service from './gateway.service'
import { createGatewayDto, updateGatewayDto, testConnectionDto, gatewayListQueryDto, performanceQueryDto } from './gateway.dto'

export const getAllGateways = async (req: Request, res: Response) => {
  const validation = gatewayListQueryDto.safeParse(req.query)
  if (!validation.success) {
    return res.status(400).json({ code: 'INVALID_QUERY', error: validation.error })
  }
  const result = await service.getAllGateways(validation.data)
  res.json(result)
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
    return res.status(400).json({ code: 'INVALID_INPUT', error: validation.error })
  }
  try {
    const gateway = await service.activateGateway(validation.data)
    res.status(201).json(gateway)
  } catch (err: any) {
    if (err.code === 'GATEWAY_EXISTS') {
      return res.status(409).json({ code: err.code, message: err.message })
    }
    if (err.code === 'GATEWAY_UNREACHABLE') {
      return res.status(400).json({ code: err.code, message: err.message })
    }
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: err.message })
  }
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
    return res.status(400).json({ code: 'INVALID_INPUT', error: validation.error })
  }
  try {
    const result = await service.testConnection(validation.data)
    res.json(result)
  } catch (err: any) {
    if (err.code === 'GATEWAY_NOT_FOUND') {
      return res.status(404).json({ code: err.code, message: err.message })
    }
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: err.message })
  }
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

export const verifyToken = async (req: Request, res: Response) => {
  const { gatewayId } = req.params
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false })
  }
  const token = authHeader.slice(7)
  const result = await service.verifyAdminToken(gatewayId, token)
  if (result.valid) {
    res.json(result)
  } else {
    res.status(401).json(result)
  }
}

export const getPerformanceHistory = async (req: Request, res: Response) => {
  const validation = performanceQueryDto.safeParse(req.query)
  if (!validation.success) {
    return res.status(400).json({ error: validation.error })
  }
  const data = await service.getPerformanceHistory(validation.data)
  res.json(data)
}