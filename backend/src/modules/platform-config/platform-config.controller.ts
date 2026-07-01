import { Request, Response } from 'express'
import * as service from './platform-config.service'
import { updatePlatformConfigDto } from './platform-config.service'

export const getPlatformConfig = async (req: Request, res: Response) => {
  const config = await service.getPlatformConfig()
  res.json(config)
}

export const updatePlatformConfig = async (req: Request, res: Response) => {
  const validation = updatePlatformConfigDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ code: 'INVALID_INPUT', error: validation.error })
  }
  try {
    const config = await service.updatePlatformConfig(validation.data)
    res.json(config)
  } catch (error: any) {
    res.status(500).json({ code: 'INTERNAL_ERROR', message: error.message })
  }
}

export const getEffectiveCacheConfig = async (req: Request, res: Response) => {
  const { gatewayId } = req.query
  const config = await service.getEffectiveCacheConfig(
    gatewayId ? String(gatewayId) : undefined
  )
  res.json(config)
}
