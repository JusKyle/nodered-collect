import express from 'express'
import cors from 'cors'
import { routes } from './routes'
import { initializeMqttSubscriptions } from './services/mqtt.service'
import { startBufferFlush, startOfflineChecker } from './services/data-collection.service'

export const app = express()

app.use(cors())
app.use(express.json())

app.use('/api', routes)

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// 启动 MQTT 订阅 + 数据采集服务
initializeMqttSubscriptions()

// 启动数据缓冲 flush + 实例离线检测
startBufferFlush()
startOfflineChecker()
