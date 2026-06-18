import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { routes } from './routes'
import { initializeMqttSubscriptions } from './services/mqtt.service'

dotenv.config()

export const app = express()

app.use(cors())
app.use(express.json())

app.use('/api', routes)

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

initializeMqttSubscriptions()
