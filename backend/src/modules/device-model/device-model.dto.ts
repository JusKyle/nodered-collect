import { z } from 'zod'

const pointSchema = z.object({
  name: z.string(),
  code: z.string().optional(),
  address: z.string(),
  type: z.string(),
  dataType: z.string().optional(),
  unit: z.string().optional(),
  description: z.string().optional()
})

export const createDeviceModelDto = z.object({
  name: z.string(),
  vendor: z.string(),
  model: z.string(),
  protocol: z.string(),
  description: z.string().optional(),
  points: z.array(pointSchema).optional().default([])
})

export const updateDeviceModelDto = z.object({
  name: z.string().optional(),
  vendor: z.string().optional(),
  model: z.string().optional(),
  protocol: z.string().optional(),
  description: z.string().optional(),
  points: z.array(pointSchema).optional()
})

export type CreateDeviceModelDto = z.infer<typeof createDeviceModelDto>
export type UpdateDeviceModelDto = z.infer<typeof updateDeviceModelDto>