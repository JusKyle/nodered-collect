import { HeartbeatService } from '../../services/heartbeat.service'
import { ConfigSyncService } from '../../services/config-sync.service'
import { RegistrationService } from '../../services/registration.service'
import { logger } from '../../utils/logger'
import { DEFAULT_PLATFORM_URL } from '../../utils/config'

export class DeviceManagerNode {
  public id: string
  public name: string
  public platformUrl: string
  public registrationCode: string
  public gatewayId: string | null = null

  private heartbeatService: HeartbeatService
  private configSyncService: ConfigSyncService
  private registrationService: RegistrationService

  constructor(config: any) {
    this.id = config.id
    this.name = config.name
    this.platformUrl = config.platformUrl || DEFAULT_PLATFORM_URL
    this.registrationCode = config.registrationCode

    this.heartbeatService = new HeartbeatService(this.platformUrl)
    this.configSyncService = new ConfigSyncService(this.platformUrl)
    this.registrationService = new RegistrationService(this.platformUrl)
  }

  public async register(address: string, port: number, adminToken: string) {
    try {
      const gateway = await this.registrationService.registerGateway(
        this.registrationCode,
        address,
        port,
        adminToken
      )

      this.gatewayId = gateway.id
      this.heartbeatService.setGatewayId(gateway.id)
      this.configSyncService.setGatewayId(gateway.id)

      this.heartbeatService.start()
      this.configSyncService.start()

      return gateway
    } catch (error) {
      throw error
    }
  }

  public startServices() {
    if (this.gatewayId) {
      this.heartbeatService.start()
      this.configSyncService.start()
      logger.info('Device manager services started')
    }
  }

  public stopServices() {
    this.heartbeatService.stop()
    this.configSyncService.stop()
    logger.info('Device manager services stopped')
  }

  public setOnConfigUpdate(callback: (config: any) => void) {
    this.configSyncService.setOnConfigUpdate(callback)
  }

  public getGatewayId(): string | null {
    return this.gatewayId
  }
}