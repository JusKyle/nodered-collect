import { Router } from 'express'
import * as controller from './sync.controller'

export const syncRouter = Router()

syncRouter.get('/', controller.getAllSyncRecords)
syncRouter.get('/gateway/:gatewayId', controller.getSyncRecordsByGatewayId)
syncRouter.post('/', controller.createSyncRecord)
syncRouter.post('/deploy', controller.deployConfig)