import api from './axios'
import type { Gateway, RegistrationCode } from '../types'

export const getAllGateways = async (): Promise<Gateway[]> => {
  const response = await api.get('/gateways')
  return response.data
}

export const getGatewayById = async (id: string): Promise<Gateway> => {
  const response = await api.get(`/gateways/${id}`)
  return response.data
}

export const createGateway = async (data: {
  name: string
  address: string
  port?: number
  adminToken: string
}): Promise<Gateway> => {
  const response = await api.post('/gateways', data)
  return response.data
}

export const updateGateway = async (
  id: string,
  data: Partial<Gateway>
): Promise<Gateway> => {
  const response = await api.put(`/gateways/${id}`, data)
  return response.data
}

export const deleteGateway = async (id: string): Promise<Gateway> => {
  const response = await api.delete(`/gateways/${id}`)
  return response.data
}

export const testConnection = async (data: {
  gatewayId?: string
  address: string
  port?: number
  adminToken: string
}): Promise<{ success: boolean; tokenExpired: boolean; message: string }> => {
  const response = await api.post('/gateways/test-connection', data)
  return response.data
}

export const updateGatewayStatus = async (id: string, status: string): Promise<Gateway> => {
  const response = await api.put(`/gateways/${id}/status`, { status })
  return response.data
}

export const generateRegistrationCode = async (data: {
  gatewayName: string
  expiresIn: number
}): Promise<RegistrationCode> => {
  const response = await api.post('/registration/generate', data)
  return response.data
}
