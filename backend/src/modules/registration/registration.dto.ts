import { z } from 'zod'

export const generateRegistrationCodeDto = z.object({
  gatewayName: z.string(),
  expiresInMinutes: z.number().optional().default(10)
})

export const registerGatewayDto = z.object({
  code: z.string(),
  address: z.string(),
  port: z.number().optional().default(1880),
  adminToken: z.string()
})

export type GenerateRegistrationCodeDto = z.infer<typeof generateRegistrationCodeDto>
export type RegisterGatewayDto = z.infer<typeof registerGatewayDto>