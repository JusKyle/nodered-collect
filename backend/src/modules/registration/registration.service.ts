import crypto from 'crypto'
import { prisma } from '../../config/db'
import { RegistrationCode, Gateway, CodeStatus } from '@prisma/client'
import { GenerateRegistrationCodeDto, RegisterGatewayDto, BatchGenerateDto, RegistrationCodeListQuery } from './registration.dto'

export class RegistrationCodeError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export interface BatchGenerateResult {
  codes: RegistrationCode[]
  batchId: string
}

export const batchGenerateRegistrationCodes = async (
  dto: BatchGenerateDto
): Promise<BatchGenerateResult> => {
  const { count, validityDays } = dto

  if (count < 1 || count > 50) {
    throw new RegistrationCodeError('INVALID_COUNT', '数量必须在 1-50 之间')
  }

  if (validityDays < 1 || validityDays > 3650) {
    throw new RegistrationCodeError('INVALID_VALIDITY', '有效期必须在 1-3650 天之间')
  }

  const batchId = crypto.randomBytes(8).toString('hex')
  const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)

  const codes: RegistrationCode[] = []

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(16).toString('hex')
    const record = await prisma.registrationCode.create({
      data: {
        code,
        batchId,
        expiresAt,
        status: 'UNUSED'
      }
    })
    codes.push(record)
  }

  return { codes, batchId }
}

export const generateRegistrationCode = async (dto: GenerateRegistrationCodeDto): Promise<RegistrationCode> => {
  const result = await batchGenerateRegistrationCodes({ count: 1, validityDays: Math.ceil(dto.expiresInMinutes / 1440) })
  return result.codes[0]
}

export const registerGateway = async (dto: RegisterGatewayDto): Promise<Gateway> => {
  const registrationCode = await prisma.registrationCode.findUnique({
    where: { code: dto.code }
  })

  if (!registrationCode) {
    throw new RegistrationCodeError('CODE_NOT_FOUND', '注册码不存在')
  }

  if (registrationCode.status === 'USED') {
    throw new RegistrationCodeError('CODE_USED', '注册码已使用')
  }

  if (registrationCode.status === 'REVOKED') {
    throw new RegistrationCodeError('CODE_REVOKED', '注册码已作废')
  }

  if (registrationCode.status === 'EXPIRED' || new Date() > registrationCode.expiresAt) {
    throw new RegistrationCodeError('CODE_EXPIRED', '注册码已过期')
  }

  const adminToken = crypto.randomBytes(16).toString('hex')

  const gateway = await prisma.gateway.create({
    data: {
      name: dto.gatewayName || '未命名网关',
      address: dto.address,
      port: dto.port,
      adminToken,
      status: 'OFFLINE'
    }
  })

  await prisma.registrationCode.update({
    where: { code: dto.code },
    data: {
      status: 'USED',
      gatewayId: gateway.id,
      usedAt: new Date()
    }
  })

  return gateway
}

export interface RegistrationCodeListResult {
  list: RegistrationCode[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const getRegistrationCodeList = async (
  query: RegistrationCodeListQuery
): Promise<RegistrationCodeListResult> => {
  const { status, code, page = 1, pageSize = 20 } = query
  const where: any = {}
  if (status) where.status = status
  if (code) where.code = { contains: code, mode: 'insensitive' }

  const [list, total] = await Promise.all([
    prisma.registrationCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.registrationCode.count({ where })
  ])

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

export const revokeRegistrationCode = async (id: string): Promise<RegistrationCode> => {
  const existing = await prisma.registrationCode.findUnique({ where: { id } })
  if (!existing) {
    throw new RegistrationCodeError('CODE_NOT_FOUND', '注册码不存在')
  }
  if (existing.status === 'REVOKED') {
    throw new RegistrationCodeError('ALREADY_REVOKED', '注册码已作废')
  }

  return prisma.registrationCode.update({
    where: { id },
    data: { status: 'REVOKED', revokedAt: new Date() }
  })
}
