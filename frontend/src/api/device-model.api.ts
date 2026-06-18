import api from './axios'
import type { DeviceModel, ModelVersion, Point } from '../types'

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
  vendor: string
  model: string
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

export const getDeviceModelUsage = async (id: string): Promise<{ usage: number }> => {
  const response = await api.get(`/device-models/${id}/usage`)
  return response.data
}

export const updateDeviceModelStatus = async (
  id: string,
  status: 'ENABLED' | 'DISABLED'
): Promise<DeviceModel> => {
  const response = await api.put(`/device-models/${id}/status`, { status })
  return response.data
}

export const duplicateDeviceModel = async (id: string, newName?: string): Promise<DeviceModel> => {
  const response = await api.post(`/device-models/${id}/duplicate`, { newName })
  return response.data
}

export const getDeviceModelVersions = async (id: string): Promise<ModelVersion[]> => {
  const response = await api.get(`/device-models/${id}/versions`)
  return response.data
}

export const importPoints = async (id: string, points: Point[]): Promise<DeviceModel> => {
  const response = await api.post(`/device-models/${id}/points/import`, { points })
  return response.data
}