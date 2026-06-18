import api from './axios'
import type { SyncRecord, SyncStatusData, CacheProgressData } from '../types'

export const getAllSyncRecords = async (): Promise<SyncRecord[]> => {
  const response = await api.get('/sync')
  return response.data
}

export const getSyncRecords = async (params: {
  gatewayId?: string
  status?: string
  type?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}): Promise<{ records: SyncRecord[]; pagination: { total: number; page: number; pageSize: number } }> => {
  const response = await api.get('/sync/records', { params })
  return response.data
}

export const getSyncRecordById = async (id: string): Promise<SyncRecord> => {
  const response = await api.get(`/sync/records/${id}`)
  return response.data
}

export const getSyncRecordsByGatewayId = async (gatewayId: string): Promise<SyncRecord[]> => {
  const response = await api.get(`/sync/gateway/${gatewayId}`)
  return response.data
}

export const deployConfig = async (data: {
  gatewayId: string
  deviceInstanceId?: string
}): Promise<SyncRecord> => {
  const response = await api.post('/sync/deploy', data)
  return response.data
}

export const dispatchConfig = async (data: {
  gatewayId: string
  deviceInstanceId?: string
}): Promise<SyncRecord> => {
  const response = await api.post('/sync/dispatch', data)
  return response.data
}

export const undeployConfig = async (data: {
  gatewayId: string
  deviceInstanceId: string
}): Promise<SyncRecord> => {
  const response = await api.post('/sync/undeploy', data)
  return response.data
}

export const getSyncStatus = async (gatewayId?: string): Promise<SyncStatusData[]> => {
  const url = gatewayId ? `/sync/status/${gatewayId}` : '/sync/status'
  const response = await api.get(url)
  return response.data
}

export const getCacheProgress = async (gatewayId: string): Promise<CacheProgressData> => {
  const response = await api.get(`/sync/cache-progress/${gatewayId}`)
  return response.data
}