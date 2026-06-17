import { z } from 'zod'

export const createDeviceModelDto = z.object({
  name: z.string(),
  protocol: z.string(),
  description: z.string().optional(),
  points: z.array(z.object({
    name: z.string(),
    address: z.string(),
    type: z.string(),
    unit: z.string().optional(),
    description: z.string().optional()
  }))
})

export const updateDeviceModelDto = z.object({
  name: z.string().optional(),
  protocol: z.string().optional(),
  description: z.string().optional(),
  points: z.array(z.object({
    name: z.string(),
    address: z.string(),
    type: z.string(),
    unit: z.string().optional(),
    description: z.string().optional()
  })).optional()
})

export type CreateDeviceModelDto = z.infer<typeof createDeviceModelDto>
export type UpdateDeviceModelDto = z.infer<typeof updateDeviceModelDto>