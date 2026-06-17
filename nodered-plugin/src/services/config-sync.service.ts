import axios from 'axios'
import { logger } from '../utils/logger'
import { DEFAULT_PLATFORM_URL, DEFAULT_CONFIG_SYNC_INTERVAL } from '../utils/config'

export class ConfigSyncService {
  private platformUrl: string
  private gatewayId: string | null = null
  private syncInterval: number
  private timer: ReturnType<typeof setInterval> | null = null
  private onConfigUpdate: ((config: any) => void) | null = null

  constructor(platformUrl?: string, syncInterval?: number) {
    this.platformUrl = platformUrl || DEFAULT_PLATFORM_URL
    this.syncInterval = syncInterval || DEFAULT_CONFIG_SYNC_INTERVAL
  }

  public setGatewayId(gatewayId: string) {
    this.gatewayId = gatewayId
  }

  public setOnConfigUpdate(callback: (config: any) => void) {
    this.onConfigUpdate = callback
  }

  public start() {
    if (this.timer) {
      this.stop()
    }

    this.syncConfig()
    this.timer = setInterval(() => {
      this.syncConfig()
    }, this.syncInterval)

    logger.info('Config sync service started')
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      logger.info('Config sync service stopped')
    }
  }

  private async syncConfig() {
    if (!this.gatewayId) {
      return
    }

    try {
      const response = await axios.get(`${this.platformUrl}/device-instances/gateway/${this.gatewayId}`)
      const config = response.data

      if (this.onConfigUpdate) {
        this.onConfigUpdate(config)
      }

      logger.debug(`Config synced for gateway: ${this.gatewayId}`)
    } catch (error: any) {
      logger.warn(`Failed to sync config: ${error.message}`)
    }
  }
}