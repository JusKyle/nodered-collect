import mqtt from 'mqtt'
import { env } from './env'

export const mqttClient = mqtt.connect({
  host: env.MQTT_HOST,
  port: parseInt(env.MQTT_PORT),
  username: env.MQTT_USERNAME,
  password: env.MQTT_PASSWORD
})

export const connectMqtt = async () => {
  return new Promise<void>((resolve, reject) => {
    mqttClient.on('connect', () => {
      console.log('MQTT connected')
      resolve()
    })

    mqttClient.on('error', (error) => {
      console.error('MQTT connection error:', error)
      reject(error)
    })
  })
}