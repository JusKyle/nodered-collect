import { mqttClient } from '../config/mqtt'

export const subscribeToTopic = (topic: string, callback: (topic: string, message: string) => void) => {
  mqttClient.subscribe(topic, (err) => {
    if (err) {
      console.error(`Failed to subscribe to ${topic}`, err)
    }
  })

  mqttClient.on('message', (receivedTopic, message) => {
    if (receivedTopic === topic) {
      callback(topic, message.toString())
    }
  })
}

export const publishToTopic = (topic: string, message: string | object) => {
  const payload = typeof message === 'object' ? JSON.stringify(message) : message
  mqttClient.publish(topic, payload)
}