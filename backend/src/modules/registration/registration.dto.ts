import { z } from 'zod'

export const generateRegistrationCodeDto = z.object({
  gatewayName: z.string(),
  expiresInMinutes: z.number().optional().default(10)
})

export const batchGenerateDto = z.object({
  count: z.number().int().min(1).max(50),
  validityDays: z.number().int().min(1).max(3650)
})

export const registerGatewayDto = z.object({
  code: z.string(),
  address: z.string(),
  port: z.number().optional().default(1880),
  gatewayName: z.string().optional()
})

export const registrationCodeListQueryDto = z.object({
  status: z.enum(['UNUSED', 'USED', 'EXPIRED', 'REVOKED']).optional(),
  code: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20)
})

export type GenerateRegistrationCodeDto = z.infer<typeof generateRegistrationCodeDto>
export type BatchGenerateDto = z.infer<typeof batchGenerateDto>
export type RegisterGatewayDto = z.infer<typeof registerGatewayDto>
export type RegistrationCodeListQuery = z.infer<typeof registrationCodeListQueryDto>
