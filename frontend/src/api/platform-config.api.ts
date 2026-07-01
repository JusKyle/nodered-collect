import { api } from './axios'

export interface PlatformConfig {
  id: string
  cacheEnabled: boolean
  cacheRetentionDays: number
  cacheReplayRate: number
  createdAt: string
  updatedAt: string
}

export interface UpdatePlatformConfigDto {
  cacheEnabled?: boolean
  cacheRetentionDays?: number
  cacheReplayRate?: number
}

export interface EffectiveCacheConfig {
  cacheEnabled: boolean
  cacheRetentionDays: number
  cacheReplayRate: number
}

export const getPlatformConfig = async (): Promise<PlatformConfig> => {
  const response = await api.get('/platform-config')
  return response.data
}

export const updatePlatformConfig = async (data: UpdatePlatformConfigDto): Promise<PlatformConfig> => {
  const response = await api.put('/platform-config', data)
  return response.data
}

export const getEffectiveCacheConfig = async (gatewayId?: string): Promise<EffectiveCacheConfig> => {
  const params = new URLSearchParams()
  if (gatewayId) params.append('gatewayId', gatewayId)
  const response = await api.get(`/platform-config/cache/effective?${params.toString()}`)
  return response.data
}
