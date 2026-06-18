import { Router } from 'express'
import * as controller from './device-instance.controller'

export const deviceInstanceRouter = Router()

deviceInstanceRouter.get('/', controller.getAllDeviceInstances)
deviceInstanceRouter.get('/:id', controller.getDeviceInstanceById)
deviceInstanceRouter.get('/gateway/:gatewayId', controller.getDeviceInstancesByGatewayId)
deviceInstanceRouter.post('/', controller.createDeviceInstance)
deviceInstanceRouter.post('/batch', controller.batchCreateDeviceInstances)
deviceInstanceRouter.put('/:id', controller.updateDeviceInstance)
deviceInstanceRouter.put('/:id/gateway', controller.changeGateway)
deviceInstanceRouter.put('/:id/sync-points', controller.syncPoints)
deviceInstanceRouter.delete('/:id', controller.deleteDeviceInstance)