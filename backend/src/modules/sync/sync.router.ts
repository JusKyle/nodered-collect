import { Router } from 'express'
import * as controller from './sync.controller'

export const syncRouter = Router()

syncRouter.get('/', controller.getAllSyncRecords)
syncRouter.get('/records', controller.getSyncRecords)
syncRouter.get('/records/:id', controller.getSyncRecordDetail)
syncRouter.get('/gateway/:gatewayId', controller.getSyncRecordsByGatewayId)
syncRouter.post('/', controller.createSyncRecord)
syncRouter.post('/deploy', controller.deployConfig)
syncRouter.post('/dispatch', controller.deployConfig)
syncRouter.post('/undeploy', controller.undeployConfig)