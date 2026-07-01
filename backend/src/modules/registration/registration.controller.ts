import { Request, Response } from 'express'
import * as service from './registration.service'
import {
  generateRegistrationCodeDto,
  registerGatewayDto,
  batchGenerateDto,
  registrationCodeListQueryDto
} from './registration.dto'

export const batchGenerateRegistrationCodes = async (req: Request, res: Response) => {
  const validation = batchGenerateDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ code: 'INVALID_INPUT', error: validation.error })
  }
  try {
    const result = await service.batchGenerateRegistrationCodes(validation.data)
    res.status(201).json(result)
  } catch (error: any) {
    if (error.code === 'INVALID_COUNT' || error.code === 'INVALID_VALIDITY') {
      return res.status(400).json({ code: error.code, message: error.message })
    }
    res.status(500).json({ code: 'INTERNAL_ERROR', message: error.message })
  }
}

export const generateRegistrationCode = async (req: Request, res: Response) => {
  const validation = generateRegistrationCodeDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  const code = await service.generateRegistrationCode(validation.data)
  res.status(201).json(code)
}

export const getRegistrationCodeList = async (req: Request, res: Response) => {
  const validation = registrationCodeListQueryDto.safeParse(req.query)
  if (!validation.success) {
    return res.status(400).json({ code: 'INVALID_QUERY', error: validation.error })
  }
  const result = await service.getRegistrationCodeList(validation.data)
  res.json(result)
}

export const revokeRegistrationCode = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const result = await service.revokeRegistrationCode(id)
    res.json(result)
  } catch (error: any) {
    if (error.code === 'CODE_NOT_FOUND') {
      return res.status(404).json({ code: error.code, message: error.message })
    }
    if (error.code === 'ALREADY_REVOKED') {
      return res.status(400).json({ code: error.code, message: error.message })
    }
    res.status(500).json({ code: 'INTERNAL_ERROR', message: error.message })
  }
}

export const registerGateway = async (req: Request, res: Response) => {
  const validation = registerGatewayDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ code: 'INVALID_INPUT', error: validation.error })
  }
  try {
    const gateway = await service.registerGateway(validation.data)
    res.status(201).json(gateway)
  } catch (error: any) {
    if (['CODE_NOT_FOUND', 'CODE_USED', 'CODE_REVOKED', 'CODE_EXPIRED'].includes(error.code)) {
      return res.status(400).json({ code: error.code, message: error.message })
    }
    res.status(500).json({ code: 'INTERNAL_ERROR', message: error.message })
  }
}
