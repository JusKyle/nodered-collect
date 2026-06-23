import { mqttClient } from '../config/mqtt'
import { handleHeartbeat, checkGatewayStatus } from './heartbeat.service'
import { handleDeviceData } from './data-collection.service'

export const subscribeToTopic = (topic: string, callback: (topic: string, message: string) => void) => {
  mqttClient.subscribe(topic, (err) => {
    if (err) {
      console.error(`Failed to subscribe to ${topic}`, err)
    }
  })

  mqttClient.on('message', (receivedTopic, message) => {
    if (receivedTopic === topic || topicMatches(receivedTopic, topic)) {
      callback(topic, message.toString())
    }
  })
}

const topicMatches = (receivedTopic: string, subscribedTopic: string): boolean => {
  const receivedParts = receivedTopic.split('/')
  const subscribedParts = subscribedTopic.split('/')
  if (receivedParts.length !== subscribedParts.length && !subscribedTopic.includes('#')) return false
  for (let i = 0; i < subscribedParts.length; i++) {
    if (subscribedParts[i] === '#') return true
    if (subscribedParts[i] === '+') continue
    if (subscribedParts[i] !== receivedParts[i]) return false
  }
  return true
}

const extractGatewayIdFromHeartbeatTopic = (topic: string): string | null => {
  const parts = topic.split('/')
  if (parts.length >= 3 && parts[0] === 'gateway' && parts[2] === 'heartbeat') {
    return parts[1]
  }
  return null
}

export const publishToTopic = (topic: string, message: string | object) => {
  const payload = typeof message === 'object' ? JSON.stringify(message) : message
  mqttClient.publish(topic, payload)
}

export const initializeMqttSubscriptions = () => {
  // 订阅：网关心跳
  mqttClient.subscribe('gateway/+/heartbeat', (err) => {
    if (err) {
      console.error('Failed to subscribe to gateway/+/heartbeat', err)
    } else {
      console.log('Subscribed to gateway/+/heartbeat')
    }
  })

  // 订阅：设备数据上报
  mqttClient.subscribe('devices/+/data', (err) => {
    if (err) {
      console.error('Failed to subscribe to devices/+/data', err)
    } else {
      console.log('Subscribed to devices/+/data')
    }
  })

  mqttClient.on('message', async (receivedTopic, message) => {
    // 1) 心跳处理
    if (topicMatches(receivedTopic, 'gateway/+/heartbeat')) {
      const gatewayId = extractGatewayIdFromHeartbeatTopic(receivedTopic)
      if (gatewayId) {
        try {
          await handleHeartbeat(gatewayId, message.toString())
        } catch (err) {
          console.error(`Failed to handle heartbeat for gateway ${gatewayId}`, err)
        }
      }
    }

    // 2) 设备数据处理
    if (topicMatches(receivedTopic, 'devices/+/data')) {
      const match = receivedTopic.match(/^devices\/([^/]+)\/data$/)
      if (match) {
        const deviceInstanceId = match[1]
        try {
          await handleDeviceData(deviceInstanceId, message.toString())
        } catch (err) {
          console.error(`Failed to handle device data for ${deviceInstanceId}`, err)
        }
      }
    }
  })

  // 心跳离线检测
  setInterval(async () => {
    try {
      await checkGatewayStatus()
    } catch (err) {
      console.error('Failed to check gateway status', err)
    }
  }, 30 * 1000)

  console.log('MQTT subscriptions initialized')
}
