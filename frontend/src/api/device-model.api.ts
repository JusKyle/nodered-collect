import api from './axios'
import type { DeviceModel, ModelVersion, Point } from '../types'

export interface DeviceModelListParams {
  name?: string
  protocol?: string
  page?: number
  pageSize?: number
}

export interface DeviceModelListResult {
  list: DeviceModel[]
  total: number
  page: number
  pageSize: number
}

export const getAllDeviceModels = async (params: DeviceModelListParams = {}): Promise<DeviceModelListResult> => {
  const response = await api.get('/device-models', { params })
  return response.data.data
}

export const getDeviceModelById = async (id: string): Promise<DeviceModel> => {
  const response = await api.get(`/device-models/${id}`)
  return response.data.data || response.data
}

export const updateDeviceModelBasic = async (
  id: string,
  data: { name?: string; modelDI?: string; description?: string }
): Promise<DeviceModel> => {
  const response = await api.put(`/device-models/${id}/basic`, data)
  return response.data.data
}

export const createDeviceModel = async (data: {
  name: string
  modelDI: string
  protocol: string
  description?: string
}): Promise<DeviceModel> => {
  const response = await api.post('/device-models', data)
  return response.data.data
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

export interface PointListResult {
  list: Point[]
  total: number
  page: number
  pageSize: number
}

export const getModelPoints = async (
  modelId: string,
  params: { name?: string; page?: number; pageSize?: number } = {}
): Promise<PointListResult> => {
  const response = await api.get(`/device-models/${modelId}/points`, { params })
  return response.data.data
}

export const createPoint = async (modelId: string, data: Partial<Point>): Promise<Point> => {
  const response = await api.post(`/device-models/${modelId}/points`, data)
  return response.data.data
}

export const updatePoint = async (modelId: string, pointIndex: number, data: Partial<Point>): Promise<Point> => {
  const response = await api.put(`/device-models/${modelId}/points/${pointIndex}`, data)
  return response.data.data
}

export const deletePoint = async (modelId: string, pointIndex: number): Promise<void> => {
  await api.delete(`/device-models/${modelId}/points/${pointIndex}`)
}

export const exportPoints = async (modelId: string): Promise<Blob> => {
  const response = await api.get(`/device-models/${modelId}/points/export`, { responseType: 'blob' })
  return response.data
}

export const importPoints = async (id: string, points: Point[]): Promise<DeviceModel> => {
  const response = await api.post(`/device-models/${id}/points/import`, { points })
  return response.data
}