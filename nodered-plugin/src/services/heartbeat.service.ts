import axios from 'axios'
import { logger } from '../utils/logger'
import { DEFAULT_PLATFORM_URL, DEFAULT_HEARTBEAT_INTERVAL } from '../utils/config'

export class HeartbeatService {
  private platformUrl: string
  private gatewayId: string | null = null
  private heartbeatInterval: number
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(platformUrl?: string, heartbeatInterval?: number) {
    this.platformUrl = platformUrl || DEFAULT_PLATFORM_URL
    this.heartbeatInterval = heartbeatInterval || DEFAULT_HEARTBEAT_INTERVAL
  }

  public setGatewayId(gatewayId: string) {
    this.gatewayId = gatewayId
  }

  public start() {
    if (this.timer) {
      this.stop()
    }

    this.sendHeartbeat()
    this.timer = setInterval(() => {
      this.sendHeartbeat()
    }, this.heartbeatInterval)

    logger.info('Heartbeat service started')
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      logger.info('Heartbeat service stopped')
    }
  }

  private async sendHeartbeat() {
    if (!this.gatewayId) {
      return
    }

    try {
      await axios.post(`${this.platformUrl}/gateways/${this.gatewayId}/heartbeat`)
      logger.debug(`Heartbeat sent for gateway: ${this.gatewayId}`)
    } catch (error: any) {
      logger.warn(`Failed to send heartbeat: ${error.message}`)
    }
  }
}