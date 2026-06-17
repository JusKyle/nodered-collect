import crypto from 'crypto'
import { prisma } from '../../config/db'
import { RegistrationCode, Gateway } from '@prisma/client'
import { GenerateRegistrationCodeDto, RegisterGatewayDto } from './registration.dto'

export const generateRegistrationCode = async (dto: GenerateRegistrationCodeDto): Promise<RegistrationCode> => {
  const code = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + dto.expiresInMinutes * 60 * 1000)

  return prisma.registrationCode.create({
    data: {
      code,
      gatewayName: dto.gatewayName,
      expiresAt
    }
  })
}

export const registerGateway = async (dto: RegisterGatewayDto): Promise<Gateway> => {
  const registrationCode = await prisma.registrationCode.findUnique({
    where: { code: dto.code }
  })

  if (!registrationCode) {
    throw new Error('Invalid registration code')
  }

  if (registrationCode.used) {
    throw new Error('Registration code has been used')
  }

  if (new Date() > registrationCode.expiresAt) {
    throw new Error('Registration code has expired')
  }

  const gateway = await prisma.gateway.create({
    data: {
      name: registrationCode.gatewayName,
      address: dto.address,
      port: dto.port,
      adminToken: dto.adminToken
    }
  })

  await prisma.registrationCode.update({
    where: { code: dto.code },
    data: { used: true }
  })

  return gateway
}