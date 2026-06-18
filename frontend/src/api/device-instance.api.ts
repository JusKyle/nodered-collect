import api from './axios'
import type { DeviceInstance } from '../types'

export const getAllDeviceInstances = async (): Promise<DeviceInstance[]> => {
  const response = await api.get('/device-instances')
  return response.data
}

export const getDeviceInstanceById = async (id: string): Promise<DeviceInstance> => {
  const response = await api.get(`/device-instances/${id}`)
  return response.data
}

export const getDeviceInstancesByGatewayId = async (gatewayId: string): Promise<DeviceInstance[]> => {
  const response = await api.get(`/device-instances/gateway/${gatewayId}`)
  return response.data
}

export const createDeviceInstance = async (data: {
  name: string
  modelId: string
  gatewayId: string
  nodeId: string
  config?: Record<string, any>
}): Promise<DeviceInstance> => {
  const response = await api.post('/device-instances', data)
  return response.data
}

export const batchCreateDeviceInstances = async (data: {
  instances: Array<{
    name: string
    modelId: string
    gatewayId: string
    nodeId: string
    config?: Record<string, any>
  }>
}): Promise<DeviceInstance[]> => {
  const response = await api.post('/device-instances/batch', data)
  return response.data
}

export const updateDeviceInstance = async (
  id: string,
  data: Partial<DeviceInstance>
): Promise<DeviceInstance> => {
  const response = await api.put(`/device-instances/${id}`, data)
  return response.data
}

export const deleteDeviceInstance = async (id: string): Promise<DeviceInstance> => {
  const response = await api.delete(`/device-instances/${id}`)
  return response.data
}

export const changeGateway = async (id: string, gatewayId: string): Promise<DeviceInstance> => {
  const response = await api.put(`/device-instances/${id}/gateway`, { gatewayId })
  return response.data
}

export const syncPoints = async (id: string): Promise<DeviceInstance> => {
  const response = await api.put(`/device-instances/${id}/sync-points`)
  return response.data
}