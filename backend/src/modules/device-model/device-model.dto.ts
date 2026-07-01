import { z } from 'zod'

const protocolSchema = z.enum(['MODBUS_TCP', 'MODBUS_RTU', 'S7', 'OPC_UA', 'MQTT', 'TCP'])

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
  name: z.string().min(1),
  modelDI: z.string().min(1).regex(/^\w+$/).optional(),
  vendor: z.string().optional(),
  model: z.string().optional(),
  protocol: protocolSchema,
  description: z.string().optional(),
  points: z.array(pointSchema).optional().default([])
}).refine((data) => data.modelDI || data.model, {
  message: 'modelDI is required',
  path: ['modelDI']
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