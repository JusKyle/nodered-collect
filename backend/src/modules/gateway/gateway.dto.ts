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
  address: z.string().optional(),
  port: z.number().optional().default(1880),
  adminToken: z.string().optional()
}).refine(
  (data) => data.gatewayId || (data.address && data.adminToken),
  'Either gatewayId is required, or address and adminToken must both be provided'
)

export type CreateGatewayDto = z.infer<typeof createGatewayDto>
export type UpdateGatewayDto = z.infer<typeof updateGatewayDto>
export type TestConnectionDto = z.infer<typeof testConnectionDto>