import { z } from 'zod'

export const createGatewayDto = z.object({
  name: z.string(),
  address: z.string(),
  port: z.number().optional().default(1880),
  adminToken: z.string()
})

export const updateGatewayDto = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  port: z.number().optional(),
  adminToken: z.string().optional()
})

export const testConnectionDto = z.object({
  gatewayId: z.string().optional(),
  address: z.string(),
  port: z.number().optional().default(1880),
  adminToken: z.string()
})

export type CreateGatewayDto = z.infer<typeof createGatewayDto>
export type UpdateGatewayDto = z.infer<typeof updateGatewayDto>
export type TestConnectionDto = z.infer<typeof testConnectionDto>