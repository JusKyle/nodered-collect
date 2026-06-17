export interface Gateway {
  id: string
  name: string
  address: string
  port: number
  adminToken: string
  status: 'ONLINE' | 'OFFLINE' | 'ERROR'
  lastHeartbeat: string | null
  createdAt: string
  updatedAt: string
}

export interface DeviceModel {
  id: string
  name: string
  protocol: string
  description: string | null
  points: Point[]
  createdAt: string
  updatedAt: string
}

export interface Point {
  name: string
  address: string
  type: string
  unit?: string
  description?: string
}

export interface DeviceInstance {
  id: string
  name: string
  modelId: string
  gatewayId: string
  nodeId: string
  config: Record<string, any>
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR'
  lastSyncTime: string | null
  createdAt: string
  updatedAt: string
  model?: DeviceModel
  gateway?: Gateway
}

export interface SyncRecord {
  id: string
  type: 'DEPLOY' | 'HEARTBEAT' | 'CONFIG_SYNC' | 'DATA_UPLOAD'
  gatewayId: string
  deviceInstanceId: string | null
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  message: string | null
  payload: Record<string, any> | null
  createdAt: string
  gateway?: Gateway
  deviceInstance?: DeviceInstance
}

export interface RegistrationCode {
  id: string
  code: string
  gatewayName: string
  expiresAt: string
  used: boolean
  createdAt: string
}