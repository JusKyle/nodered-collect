import { z } from 'zod'

export const createGatewayDto = z.object({
  name: z.string(),
  address: z.string(),
  port: z.number().optional().default(1880)
})

export const updateGatewayDto = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  port: z.number().optional(),
  adminToken: z.string().optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'TOKEN_EXPIRED', 'ERROR']).optional(),
  lastHeartbeat: z.date().optional(),
  ip: z.string().optional(),
  nodeRedVersion: z.string().optional(),
  flowCount: z.number().optional(),
  cacheEnabled: z.boolean().nullable().optional(),
  cacheRetentionDays: z.number().nullable().optional(),
  cacheReplayRate: z.number().nullable().optional()
})

export const gatewayListQueryDto = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'TOKEN_EXPIRED', 'ERROR']).optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20)
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
export type GatewayListQueryDto = z.infer<typeof gatewayListQueryDto>
export type TestConnectionDto = z.infer<typeof testConnectionDto>