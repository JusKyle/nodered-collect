import { logger } from '../../utils/logger'
import type { DeviceInstanceConfig } from '../../types'

export class DeviceInstanceNode {
  public id: string
  public name: string
  public deviceManager: string
  public deviceId: string
  public modelId: string
  public nodeId: string
  public config: Record<string, any>

  private configNode: any

  constructor(config: any, RED: any) {
    this.id = config.id
    this.name = config.name
    this.deviceManager = config.deviceManager
    this.deviceId = config.deviceId
    this.modelId = config.modelId
    this.nodeId = config.nodeId
    this.config = config.config || {}

    this.configNode = RED.nodes.getNode(this.deviceManager)
  }

  public getDeviceManager(): any {
    return this.configNode
  }

  public getNodeId(): string {
    return this.nodeId
  }

  public getModelId(): string {
    return this.modelId
  }

  public getConfig(): Record<string, any> {
    return this.config
  }

  public updateConfig(newConfig: Record<string, any>) {
    this.config = { ...this.config, ...newConfig }
    logger.info(`Device instance ${this.name} config updated`)
  }
}