import { Response } from 'express'

export type EventType = 'gateway_status_change' | 'device_status_change' | 'sync_status_change'

export interface GatewayStatusEvent {
  type: 'gateway_status_change'
  data: {
    gatewayId: string
    status: string
    lastHeartbeat?: Date
    ip?: string
    flowCount?: number
    nodeRedVersion?: string
  }
}

export interface DeviceStatusEvent {
  type: 'device_status_change'
  data: {
    deviceInstanceId: string
    status: string
    gatewayId?: string
  }
}

export interface SyncStatusEvent {
  type: 'sync_status_change'
  data: {
    syncRecordId: string
    status: string
    gatewayId: string
  }
}

export type ServerEvent = GatewayStatusEvent | DeviceStatusEvent | SyncStatusEvent

type EventHandler = (event: ServerEvent) => void

class SseService {
  private clients: Map<string, { res: Response; handlers: EventHandler[] }> = new Map()
  private clientCounter = 0

  addClient(res: Response): string {
    const clientId = `client_${++this.clientCounter}`

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const heartbeatInterval = setInterval(() => {
      res.write(': heartbeat\n\n')
    }, 30000)

    this.clients.set(clientId, {
      res,
      handlers: []
    })

    res.on('close', () => {
      clearInterval(heartbeatInterval)
      this.clients.delete(clientId)
    })

    return clientId
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId)
  }

  subscribe(clientId: string, handler: EventHandler): void {
    const client = this.clients.get(clientId)
    if (client) {
      client.handlers.push(handler)
    }
  }

  unsubscribe(clientId: string, handler: EventHandler): void {
    const client = this.clients.get(clientId)
    if (client) {
      client.handlers = client.handlers.filter(h => h !== handler)
    }
  }

  broadcast(event: ServerEvent): void {
    const eventString = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
    for (const [, client] of this.clients) {
      client.res.write(eventString)
    }
  }

  sendToClient(clientId: string, event: ServerEvent): void {
    const client = this.clients.get(clientId)
    if (client) {
      const eventString = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
      client.res.write(eventString)
    }
  }

  getClientCount(): number {
    return this.clients.size
  }
}

export const sseService = new SseService()
