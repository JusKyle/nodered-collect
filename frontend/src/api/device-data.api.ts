import api from './axios'

export interface PointValue {
  code: string
  name: string
  value: string | null
  dataType: string
  quality: number
  timestamp: string | null
}

export interface CurrentDataResponse {
  deviceInstanceId: string
  deviceName: string
  gatewayName: string
  status: string
  lastDataTime: string | null
  points: PointValue[]
}

export interface HistoryRecord {
  value: string
  timestamp: string
  quality: number
}

export interface HistoryDataResponse {
  deviceInstanceId: string
  pointCode: string | null
  interval: string
  records: HistoryRecord[]
  pagination: {
    total: number
    page: number
    pageSize: number
  }
}

export interface LatestInstancePoint {
  code: string
  value: string | null
  timestamp: string | null
}

export interface LatestInstance {
  deviceInstanceId: string
  name: string
  modelName: string
  gatewayName: string
  status: string
  lastDataTime: string | null
  points: LatestInstancePoint[]
}

export interface LatestDataResponse {
  instances: LatestInstance[]
  pagination: {
    total: number
    page: number
    pageSize: number
  }
}

export const getCurrentData = async (instanceId: string): Promise<CurrentDataResponse> => {
  const response = await api.get(`/device-data/current/${instanceId}`)
  return response.data.data
}

export const getHistoryData = async (
  instanceId: string,
  params?: {
    pointCode?: string
    start?: string
    end?: string
    page?: number
    pageSize?: number
  }
): Promise<HistoryDataResponse> => {
  const response = await api.get(`/device-data/history/${instanceId}`, { params })
  return response.data.data
}

export const getLatestData = async (params?: {
  gatewayId?: string
  modelId?: string
  page?: number
  pageSize?: number
}): Promise<LatestDataResponse> => {
  const response = await api.get('/device-data/latest', { params })
  return response.data.data
}
