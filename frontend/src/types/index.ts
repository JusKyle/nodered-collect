export interface Gateway {
  id: string
  name: string
  address: string
  port: number
  adminToken: string
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'TOKEN_EXPIRED'
  lastHeartbeat: string | null
  heartbeatInterval?: number
  heartbeatTimeout?: number
  nodeRedVersion?: string | null
  ip?: string | null
  flowCount?: number | null
  createdAt: string
  updatedAt: string
  description?: string
  cacheEnabled?: boolean | null
  cacheRetentionDays?: number | null
  cacheReplayRate?: number | null
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
  lastDataTime: string | null
  createdAt: string
  updatedAt: string
  model?: DeviceModel
  gateway?: Gateway
}

export interface SyncRecord {
  id: string
  type: 'DEPLOY' | 'UNDEPLOY' | 'REDEPLOY'
  gatewayId: string
  gateway?: { id: string; name: string }
  deviceInstanceId?: string
  deviceInstance?: { id: string; name: string }
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  message?: string
  payload?: any
  retryCount?: number
  createdAt: string
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

export interface SyncStatusData {
  gatewayId: string
  gatewayName: string
  gatewayStatus: 'ONLINE' | 'OFFLINE' | 'TOKEN_EXPIRED'
  dataReportStatus: 'normal' | 'abnormal'
  mqttConnectionStatus: 'connected' | 'disconnected'
  lastReportTime: string
  todayReportCount: number
  cacheCount: number
  resyncProgress?: {
    total: number
    completed: number
    status: 'in_progress' | 'completed' | 'partial_failed'
    failedCount: number
  }
}

export interface CacheProgressData {
  gatewayId: string
  gatewayName: string
  total: number
  completed: number
  status: 'in_progress' | 'completed' | 'partial_failed'
  failedCount: number
}