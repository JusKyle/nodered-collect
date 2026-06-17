import api from './axios'
import type { DeviceModel } from '../types'

export const getAllDeviceModels = async (): Promise<DeviceModel[]> => {
  const response = await api.get('/device-models')
  return response.data
}

export const getDeviceModelById = async (id: string): Promise<DeviceModel> => {
  const response = await api.get(`/device-models/${id}`)
  return response.data
}

export const createDeviceModel = async (data: {
  name: string
  protocol: string
  description?: string
  points: any[]
}): Promise<DeviceModel> => {
  const response = await api.post('/device-models', data)
  return response.data
}

export const updateDeviceModel = async (
  id: string,
  data: Partial<DeviceModel>
): Promise<DeviceModel> => {
  const response = await api.put(`/device-models/${id}`, data)
  return response.data
}

export const deleteDeviceModel = async (id: string): Promise<DeviceModel> => {
  const response = await api.delete(`/device-models/${id}`)
  return response.data
}