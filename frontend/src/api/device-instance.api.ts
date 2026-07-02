import api from './axios'
import type { DeviceInstance } from '../types'

export interface DeviceInstanceListItem {
  id: string
  name: string
  description: string | null
  status: string
  enabled: boolean
  templateVersion: number
  collectStatus: string
  modelId: string
  modelName: string
  gatewayId: string | null
  gatewayName: string | null
  group: string | null
  deviceId: string | null
  commConfig: Record<string, any> | null
  pointCount: number
  lastSyncTime: string | null
  lastDataTime: string | null
  createdAt: string
  updatedAt: string
}

export interface DeviceInstanceListResult {
  list: DeviceInstanceListItem[]
  total: number
  page: number
  pageSize: number
}

export const getDeviceInstances = async (params: {
  page?: number
  pageSize?: number
  gatewayId?: string
  modelId?: string
  status?: string
  keyword?: string
  group?: string
}): Promise<DeviceInstanceListResult> => {
  const response = await api.get('/device-instances', { params })
  return response.data.data
}

export const getDeviceGroups = async (): Promise<string[]> => {
  const response = await api.get('/device-instances/groups')
  return response.data.data
}

export const getAllDeviceInstances = async (): Promise<DeviceInstance[]> => {
  const response = await api.get('/device-instances/all')
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

export const createDeviceInstanceFull = async (data: {
  name: string
  modelId: string
  gatewayId?: string
  description?: string
  commConfig?: Record<string, any>
  deviceId?: string
  group?: string
}): Promise<DeviceInstance> => {
  const response = await api.post('/device-instances', data)
  return response.data.data
}

export const createDeviceInstance = async (data: {
  name: string
  modelId: string
  gatewayId: string
  nodeId: string
  config?: Record<string, any>
}): Promise<DeviceInstance> => {
  const response = await api.post('/device-instances/legacy', data)
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

export const enableDevice = async (id: string) => {
  const response = await api.post(`/device-instances/${id}/enable`)
  return response.data.data
}

export const disableDevice = async (id: string) => {
  const response = await api.post(`/device-instances/${id}/disable`)
  return response.data.data
}

export interface TemplatePointItem {
  id: string
  name: string
  tag: string
  dataType: string
  address: string
  unit: string | null
  description: string | null
  source: 'TEMPLATE'
}

export const getTemplatePoints = async (instanceId: string): Promise<TemplatePointItem[]> => {
  const response = await api.get(`/device-instances/${instanceId}/template-points`)
  return response.data.data
}

export const upgradeTemplateVersion = async (instanceId: string) => {
  const response = await api.post(`/device-instances/${instanceId}/upgrade-template`)
  return response.data.data
}

// ========== 批量操作 ==========

export const batchCreateDevices = async (data: {
  gatewayId: string; modelId: string; count: number;
  namePrefix: string; startIndex?: number;
}) => {
  const response = await api.post('/device-instances/batch-create', data)
  return response.data.data
}

export const batchUpgradeTemplate = async (instanceIds: string[]) => {
  const response = await api.post('/device-instances/batch-upgrade-template', { instanceIds })
  return response.data.data
}

// ========== 设备级点位 ==========

export interface DevicePointItem {
  id: string
  instanceId: string
  name: string
  tag: string
  dataType: string
  address: string
  unit: string | null
  description: string | null
  config: any
  enabled: boolean
  source: 'DEVICE' | 'TEMPLATE'
  sort: number
  createdAt: string
  updatedAt: string
}

export const getDevicePoints = async (instanceId: string): Promise<DevicePointItem[]> => {
  const response = await api.get(`/device-instances/${instanceId}/device-points`)
  return response.data.data
}

export const createDevicePoint = async (instanceId: string, data: {
  name: string; tag: string; dataType: string; address: string;
  unit?: string; description?: string; config?: any;
}) => {
  const response = await api.post(`/device-instances/${instanceId}/device-points`, data)
  return response.data.data
}

export const updateDevicePoint = async (pointId: string, data: Partial<{
  name: string; tag: string; dataType: string; address: string;
  unit: string; description: string; config: any; enabled: boolean;
}>) => {
  const response = await api.put(`/device-instances/device-points/${pointId}`, data)
  return response.data.data
}

export const deleteDevicePoint = async (pointId: string) => {
  await api.delete(`/device-instances/device-points/${pointId}`)
}

// ========== 合并点位 ==========

export interface MergedPointItem {
  id: string
  instanceId: string
  name: string
  tag: string
  dataType: string
  address: string
  unit: string | null
  description: string | null
  config: any
  enabled: boolean
  source: 'TEMPLATE' | 'DEVICE'
  sort: number
  createdAt: string
  updatedAt: string
}

export const getMergedPoints = async (instanceId: string): Promise<MergedPointItem[]> => {
  const response = await api.get(`/device-instances/${instanceId}/merged-points`)
  return response.data.data
}

// ========== 通讯诊断 ==========

export interface DiagnosticsData {
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN'
  lastConnectTime: string | null
  lastDisconnectTime: string | null
  errorCount: number
  lastErrors: Array<{
    timestamp: string
    tag: string
    value: string
  }>
  responseTime: number | null
  requestCount: number
}

export const getDeviceDiagnostics = async (instanceId: string): Promise<DiagnosticsData> => {
  const response = await api.get(`/device-instances/${instanceId}/diagnostics`)
  return response.data.data
}

// ========== 实时数据 & 历史数据 ==========

export interface RealtimeDataValue {
  value: string
  timestamp: number
  quality: number
}

export interface RealtimeData {
  values: Record<string, RealtimeDataValue>
  lastUpdate: number
}

export const getDeviceRealtimeData = async (instanceId: string): Promise<RealtimeData | null> => {
  const response = await api.get(`/device-instances/${instanceId}/realtime-data`)
  return response.data.data
}

export interface HistoryDataPoint {
  id: string
  deviceInstanceId: string
  gatewayId: string
  pointCode: string
  pointName: string
  value: string
  dataType: string
  timestamp: string
  receivedAt: string
  quality: number
}

export interface HistoryDataResult {
  list: HistoryDataPoint[]
  total: number
  page: number
  pageSize: number
}

export const getDeviceHistoryData = async (instanceId: string, params: {
  startTime?: string; endTime?: string; tags?: string[]; page?: number; pageSize?: number;
}): Promise<HistoryDataResult> => {
  const queryParams: Record<string, string> = {}
  if (params.startTime) queryParams.startTime = params.startTime
  if (params.endTime) queryParams.endTime = params.endTime
  if (params.tags && params.tags.length > 0) queryParams.tags = params.tags.join(',')
  if (params.page) queryParams.page = String(params.page)
  if (params.pageSize) queryParams.pageSize = String(params.pageSize)
  const response = await api.get(`/device-instances/${instanceId}/history-data`, { params: queryParams })
  return response.data.data
}