import { Router } from 'express'
import * as controller from './device-data.controller'

export const deviceDataRouter = Router()

// GET /api/device-data/current/:instanceId
deviceDataRouter.get('/current/:instanceId', controller.getCurrentData)

// GET /api/device-data/history/:instanceId
deviceDataRouter.get('/history/:instanceId', controller.getHistoryData)

// GET /api/device-data/latest
deviceDataRouter.get('/latest', controller.getLatestData)
