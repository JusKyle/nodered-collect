export interface GatewayInfo {
  id: string
  name: string
  address: string
  port: number
  status: 'ONLINE' | 'OFFLINE' | 'ERROR'
  lastHeartbeat?: Date
}

export interface DeviceModelInfo {
  id: string
  name: string
  protocol: string
  description?: string
  points: PointInfo[]
}

export interface PointInfo {
  name: string
  address: string
  type: string
  unit?: string
  description?: string
}

export interface DeviceInstanceInfo {
  id: string
  name: string
  modelId: string
  gatewayId: string
  nodeId: string
  config: Record<string, any>
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR'
  lastSyncTime?: Date
}

export interface SyncRecordInfo {
  id: string
  type: 'DEPLOY' | 'HEARTBEAT' | 'CONFIG_SYNC' | 'DATA_UPLOAD'
  gatewayId: string
  deviceInstanceId?: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  message?: string
  payload?: Record<string, any>
  createdAt: Date
}