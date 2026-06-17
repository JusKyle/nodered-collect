export interface DeviceManagerConfig {
  id: string
  name: string
  platformUrl: string
  registrationCode: string
}

export interface DeviceInstanceConfig {
  id: string
  name: string
  deviceManager: string
  deviceId: string
  modelId: string
  nodeId: string
  config: Record<string, any>
}

export interface PointConfig {
  name: string
  address: string
  type: string
  unit?: string
}

export interface GatewayInfo {
  id: string
  name: string
  address: string
  port: number
}

export interface DeviceModelInfo {
  id: string
  name: string
  protocol: string
  points: PointConfig[]
}

export interface DeviceInstanceInfo {
  id: string
  name: string
  modelId: string
  gatewayId: string
  nodeId: string
  config: Record<string, any>
}