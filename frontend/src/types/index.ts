export interface Gateway {
  id: string
  name: string
  address: string
  port: number
  adminToken: string
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'TOKEN_EXPIRED'
  lastHeartbeat: string | null
  createdAt: string
  updatedAt: string
  description?: string
}

export interface DeviceModel {
  id: string
  name: string
  vendor: string
  model: string
  protocol: string
  description: string | null
  points: Point[]
  status: 'ENABLED' | 'DISABLED'
  version: string
  createdAt: string
  updatedAt: string
}

export interface Point {
  name: string
  code: string
  address: string
  type: string
  dataType: string
  unit?: string
  description?: string
}

export interface ModelVersion {
  id: string
  modelId: string
  version: string
  points: Point[]
  createdAt: string
}

export interface DeviceInstance {
  id: string
  name: string
  modelId: string
  gatewayId: string
  nodeId: string
  config: {
    points?: Point[]
    customPoints?: Point[]
  }
  status: 'PENDING' | 'UNBOUND' | 'PENDING_SYNC' | 'RUNNING' | 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR'
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

export interface ModelVersion {
  id: string
  modelId: string
  version: string
  points: Point[]
  createdAt: string
}

export interface RegistrationCode {
  id: string
  code: string
  gatewayName: string
  expiresAt: string
  used: boolean
  createdAt: string
}