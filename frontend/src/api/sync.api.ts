import api from './axios'
import type { SyncRecord } from '../types'

export const getAllSyncRecords = async (): Promise<SyncRecord[]> => {
  const response = await api.get('/sync')
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