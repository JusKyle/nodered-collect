import axios from 'axios'
import { logger } from '../utils/logger'
import { DEFAULT_PLATFORM_URL } from '../utils/config'

export class RegistrationService {
  private platformUrl: string

  constructor(platformUrl?: string) {
    this.platformUrl = platformUrl || DEFAULT_PLATFORM_URL
  }

  public async registerGateway(registrationCode: string, address: string, port: number, adminToken: string) {
    try {
      const response = await axios.post(`${this.platformUrl}/registration/register`, {
        code: registrationCode,
        address,
        port,
        adminToken
      })
      logger.info(`Gateway registered successfully: ${response.data.name}`)
      return response.data
    } catch (error: any) {
      logger.error(`Failed to register gateway: ${error.message}`)
      throw error
    }
  }
}