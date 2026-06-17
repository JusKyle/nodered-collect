import { Request, Response } from 'express'
import * as service from './registration.service'
import { generateRegistrationCodeDto, registerGatewayDto } from './registration.dto'

export const generateRegistrationCode = async (req: Request, res: Response) => {
  const validation = generateRegistrationCodeDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  const code = await service.generateRegistrationCode(validation.data)
  res.status(201).json(code)
}

export const registerGateway = async (req: Request, res: Response) => {
  const validation = registerGatewayDto.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json(validation.error)
  }
  try {
    const gateway = await service.registerGateway(validation.data)
    res.status(201).json(gateway)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}