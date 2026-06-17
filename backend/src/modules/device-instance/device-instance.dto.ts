import { z } from 'zod'

export const createDeviceInstanceDto = z.object({
  name: z.string(),
  modelId: z.string(),
  gatewayId: z.string(),
  nodeId: z.string(),
  config: z.record(z.string(), z.any()).optional()
})

export const updateDeviceInstanceDto = z.object({
  name: z.string().optional(),
  modelId: z.string().optional(),
  gatewayId: z.string().optional(),
  nodeId: z.string().optional(),
  config: z.record(z.string(), z.any()).optional()
})

export const batchCreateDeviceInstancesDto = z.object({
  instances: z.array(createDeviceInstanceDto)
})

export type CreateDeviceInstanceDto = z.infer<typeof createDeviceInstanceDto>
export type UpdateDeviceInstanceDto = z.infer<typeof updateDeviceInstanceDto>
export type BatchCreateDeviceInstancesDto = z.infer<typeof batchCreateDeviceInstancesDto>