import { z } from 'zod'

export const createSyncRecordDto = z.object({
  type: z.enum(['DEPLOY', 'HEARTBEAT', 'CONFIG_SYNC', 'DATA_UPLOAD']),
  gatewayId: z.string(),
  deviceInstanceId: z.string().optional(),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED']),
  message: z.string().optional(),
  payload: z.record(z.string(), z.any()).optional()
})

export const deployConfigDto = z.object({
  gatewayId: z.string(),
  deviceInstanceId: z.string()
})

export type CreateSyncRecordDto = z.infer<typeof createSyncRecordDto>
export type DeployConfigDto = z.infer<typeof deployConfigDto>