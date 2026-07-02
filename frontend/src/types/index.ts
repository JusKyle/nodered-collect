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
  cacheStatus?: {
    id: string
    gatewayId: string
    cachingEnabled: boolean
    isCaching: boolean
    cacheCount: number
    cacheSizeBytes: number
    replayCount: number
    replayRate: number
    replayStatus: string
    firstCachedAt: string | null
    latestCachedAt: string | null
    replayStartedAt: string | null
    replayFinishedAt: string | null
    createdAt: string
    updatedAt: string
  } | null
}

export interface DeviceModel {
  id: string
  name: string
  vendor?: string
  model: string
  modelDI?: string
  protocol: string
  description: string | null
  points?: Point[]
  pointCount?: number
  status?: 'ENABLED' | 'DISABLED'
  version: number
  createdAt: string
  updatedAt: string
}

export interface Point {
  id?: string
  name: string
  tag?: string
  code?: string
  address: string
  type?: string
  dataType: string
  unit?: string
  description?: string
  readWrite?: string
  config?: Record<string, any>
  sort?: number
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
  status: 'ONLINE' | 'OFFLINE' | 'DISABLED' | 'COLLECTING' | 'ERROR'
  lastSyncTime: string | null
  lastDataTime: string | null
  createdAt: string
  updatedAt: string
  model?: DeviceModel
  gateway?: Gateway
}

export interface SyncRecord {
  id: string
  type: 'DEPLOY' | 'UNDEPLOY' | 'REDEPLOY' | 'HEARTBEAT' | 'COLLECT' | 'INIT' | 'CONFIG_SYNC' | 'DATA_UPLOAD'
  gatewayId: string
  gateway?: { id: string; name: string }
  gatewayName?: string | null
  deviceInstanceId?: string | null
  deviceInstance?: { id: string; name: string; deviceId?: string | null }
  deviceName?: string | null
  deviceId?: string | null
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'RUNNING'
  message?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  payload?: any
  flowConfig?: any[]
  flowNodes?: Array<{ id: string; type: string; name: string }>
  configVersion?: number | null
  deployedVersion?: number | null
  flowName?: string | null
  finishedAt?: string | null
  durationMs?: number | null
  retryCount?: number
  operator?: string
  operatorName?: string | null
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