import api from './axios'
import type { Gateway, RegistrationCode } from '../types'

export interface TestResultItem {
  name: string
  passed: boolean
  message: string
}

export interface TestConnectionResult {
  results: TestResultItem[]
  allPassed: boolean
}

export interface GatewayListResponse {
  list: Gateway[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface GatewayListQuery {
  name?: string
  address?: string
  status?: 'ONLINE' | 'OFFLINE' | 'TOKEN_EXPIRED' | 'ERROR'
  page?: number
  pageSize?: number
}

export const getAllGateways = async (query?: GatewayListQuery): Promise<GatewayListResponse> => {
  const params = new URLSearchParams()
  if (query?.name) params.append('name', query.name)
  if (query?.address) params.append('address', query.address)
  if (query?.status) params.append('status', query.status)
  if (query?.page) params.append('page', String(query.page))
  if (query?.pageSize) params.append('pageSize', String(query.pageSize))
  const response = await api.get(`/gateways?${params.toString()}`)
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
  address?: string
  port?: number
  adminToken?: string
}): Promise<TestConnectionResult> => {
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
