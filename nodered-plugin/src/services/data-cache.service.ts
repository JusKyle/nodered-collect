import { SQLiteStore } from '../store/sqlite-store'
import { logger } from '../utils/logger'
import mqtt from 'mqtt'

export class DataCacheService {
  private store: SQLiteStore
  private mqttClient: mqtt.MqttClient | null = null

  constructor() {
    this.store = new SQLiteStore()
  }

  public async cacheData(deviceId: string, pointName: string, value: string) {
    const timestamp = Date.now()
    await this.store.saveCachedData(deviceId, pointName, value, timestamp)
    logger.debug(`Data cached: ${deviceId} - ${pointName} = ${value}`)
  }

  public async sendCachedData(mqttClient: mqtt.MqttClient) {
    try {
      const unsentData = await this.store.getUnsentData()

      if (unsentData.length === 0) {
        return
      }

      logger.info(`Sending ${unsentData.length} cached data records`)

      for (const data of unsentData) {
        const payload = {
          deviceId: data.deviceId,
          pointName: data.pointName,
          value: data.value,
          timestamp: data.timestamp
        }

        mqttClient.publish(`collecting/data/${data.deviceId}`, JSON.stringify(payload))
      }

      const ids = unsentData.map((d) => d.id)
      await this.store.markDataAsSent(ids)

      logger.info(`All cached data sent successfully`)
    } catch (error: any) {
      logger.error(`Failed to send cached data: ${error.message}`)
    }
  }

  public close() {
    this.store.close()
  }
}