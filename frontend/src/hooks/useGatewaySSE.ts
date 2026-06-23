import { useEffect, useRef, useCallback } from 'react'

const SSE_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000'

export interface GatewayStatusEvent {
  gatewayId: string
  status: string
  lastHeartbeat?: Date | string
  ip?: string
  flowCount?: number
  nodeRedVersion?: string
}

type GatewayStatusHandler = (event: GatewayStatusEvent) => void

export function useGatewaySSE(onStatusChange?: GatewayStatusHandler) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const handlerRef = useRef(onStatusChange)
  handlerRef.current = onStatusChange

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(`${SSE_BASE_URL}/api/events`)
    eventSourceRef.current = eventSource

    eventSource.addEventListener('gateway_status_change', (event) => {
      try {
        const data = JSON.parse(event.data) as GatewayStatusEvent
        handlerRef.current?.(data)
      } catch (err) {
        console.error('Failed to parse gateway_status_change event:', err)
      }
    })

    eventSource.onerror = () => {
      console.warn('SSE connection lost, reconnecting...')
      eventSource.close()
      eventSourceRef.current = null
      setTimeout(connect, 5000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }, [connect])

  return {
    reconnect: connect
  }
}
