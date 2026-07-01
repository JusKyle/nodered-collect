import mqtt from 'mqtt'
import os from 'os'
import fs from 'fs'
import { logger } from '../utils/logger'
import { DEFAULT_HEARTBEAT_INTERVAL } from '../utils/config'

export interface HeartbeatConfig {
  mqttUrl: string
  mqttUsername?: string
  mqttPassword?: string
  heartbeatInterval?: number
}

export class HeartbeatService {
  private mqttUrl: string
  private mqttUsername?: string
  private mqttPassword?: string
  private gatewayId: string | null = null
  private heartbeatInterval: number
  private timer: ReturnType<typeof setInterval> | null = null
  private client: mqtt.MqttClient | null = null

  constructor(config: HeartbeatConfig) {
    this.mqttUrl = config.mqttUrl
    this.mqttUsername = config.mqttUsername
    this.mqttPassword = config.mqttPassword
    this.heartbeatInterval = config.heartbeatInterval || DEFAULT_HEARTBEAT_INTERVAL
  }

  public setGatewayId(gatewayId: string) {
    this.gatewayId = gatewayId
  }

  public start() {
    if (this.timer) {
      this.stop()
    }

    this.connectMqtt()
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
    }
    if (this.client) {
      this.client.end()
      this.client = null
    }
    logger.info('Heartbeat service stopped')
  }

  private connectMqtt() {
    if (this.client) return

    const options: mqtt.IClientOptions = {
      clientId: `nodered-gw-${this.gatewayId || 'unknown'}`,
      clean: true,
      reconnectPeriod: 15000,
      keepalive: 60
    }

    if (this.mqttUsername) {
      options.username = this.mqttUsername
    }
    if (this.mqttPassword) {
      options.password = this.mqttPassword
    }

    this.client = mqtt.connect(this.mqttUrl, options)

    this.client.on('connect', () => {
      logger.info('Heartbeat MQTT connected')
    })

    this.client.on('error', (err) => {
      logger.error(`Heartbeat MQTT error: ${err.message}`)
    })

    this.client.on('reconnect', () => {
      logger.warn('Heartbeat MQTT reconnecting...')
    })
  }

  private getCpuUsage(): number {
    const cpus = os.cpus()
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0
    for (const cpu of cpus) {
      user += cpu.times.user
      nice += cpu.times.nice
      sys += cpu.times.sys
      idle += cpu.times.idle
      irq += cpu.times.irq
    }
    const total = user + nice + sys + idle + irq
    const usage = total > 0 ? ((total - idle) / total) * 100 : 0
    return Math.round(usage * 10) / 10
  }

  private getMemoryUsage(): number {
    const total = os.totalmem()
    const free = os.freemem()
    const used = total - free
    return Math.round((used / total) * 100 * 10) / 10
  }

  private getDiskUsage(): { usage: number | null; freeBytes: number | null } {
    try {
      let diskPath = '/'
      if (os.platform() === 'win32') {
        diskPath = 'C:\\'
      }
      let total = 0
      let free = 0
      try {
        if (fs.existsSync(diskPath)) {
          const stat = (fs as any).statfsSync(diskPath)
          total = stat.blocks * stat.bsize
          free = stat.bfree * stat.bsize
        }
      } catch (e) {}
      if (total > 0) {
        const used = total - free
        return {
          usage: Math.round((used / total) * 100 * 10) / 10,
          freeBytes: free
        }
      }
    } catch (e) {
      logger.warn(`Failed to get disk usage: ${(e as Error).message}`)
    }
    return { usage: null, freeBytes: null }
  }

  private async sendHeartbeat() {
    if (!this.gatewayId || !this.client) {
      return
    }

    try {
      const diskInfo = this.getDiskUsage()
      const payload = {
        gatewayId: this.gatewayId,
        timestamp: Date.now(),
        status: 'online',
        nodeRedVersion: process.env.NODE_RED_VERSION || null,
        ip: this.getIpAddress(),
        flowCount: 0,
        cpuUsage: this.getCpuUsage(),
        memoryUsage: this.getMemoryUsage(),
        diskUsage: diskInfo.usage,
        diskFreeBytes: diskInfo.freeBytes
      }

      const topic = `gateway/${this.gatewayId}/heartbeat`
      this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          logger.warn(`Failed to send heartbeat: ${err.message}`)
        } else {
          logger.debug(`Heartbeat sent for gateway: ${this.gatewayId}`)
        }
      })
    } catch (error: any) {
      logger.warn(`Failed to send heartbeat: ${error.message}`)
    }
  }

  private getIpAddress(): string {
    const interfaces = os.networkInterfaces()
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name]
      if (!iface) continue
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) {
          return addr.address
        }
      }
    }
    return '127.0.0.1'
  }
}