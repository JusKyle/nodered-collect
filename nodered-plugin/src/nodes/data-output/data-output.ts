import mqtt from 'mqtt'
import { logger } from '../../utils/logger'
import { DataCacheService } from '../../services/data-cache.service'

export class DataOutputNode {
  public id: string
  public name: string
  public mqttHost: string
  public mqttPort: number
  public topic: string

  private mqttClient: mqtt.MqttClient | null = null
  private dataCacheService: DataCacheService

  constructor(config: any) {
    this.id = config.id
    this.name = config.name
    this.mqttHost = config.mqttHost || 'localhost'
    this.mqttPort = config.mqttPort || 1883
    this.topic = config.topic || 'collecting/data/#'

    this.dataCacheService = new DataCacheService()
  }

  public connect() {
    this.mqttClient = mqtt.connect({
      host: this.mqttHost,
      port: this.mqttPort
    })

    this.mqttClient.on('connect', () => {
      logger.info(`MQTT connected to ${this.mqttHost}:${this.mqttPort}`)
      this.sendCachedData()
    })

    this.mqttClient.on('error', (err) => {
      logger.error(`MQTT connection error: ${err.message}`)
    })
  }

  public disconnect() {
    if (this.mqttClient) {
      this.mqttClient.end()
      this.mqttClient = null
      logger.info('MQTT disconnected')
    }
  }

  public sendData(deviceId: string, data: Record<string, any>) {
    if (!this.mqttClient) {
      this.cacheData(deviceId, data)
      return
    }

    const payload = {
      deviceId,
      timestamp: Date.now(),
      data
    }

    const topic = `collecting/data/${deviceId}`
    this.mqttClient.publish(topic, JSON.stringify(payload))
    logger.debug(`Data sent to ${topic}`)
  }

  private async cacheData(deviceId: string, data: Record<string, any>) {
    for (const [pointName, value] of Object.entries(data)) {
      await this.dataCacheService.cacheData(deviceId, pointName, String(value))
    }
  }

  private async sendCachedData() {
    if (this.mqttClient) {
      await this.dataCacheService.sendCachedData(this.mqttClient)
    }
  }

  public getMqttClient(): mqtt.MqttClient | null {
    return this.mqttClient
  }
}