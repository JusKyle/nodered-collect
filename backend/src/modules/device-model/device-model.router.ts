import { Router } from 'express'
import * as controller from './device-model.controller'

export const deviceModelRouter = Router()

deviceModelRouter.get('/', controller.getAllDeviceModels)
deviceModelRouter.get('/:id', controller.getDeviceModelById)
deviceModelRouter.get('/:id/usage', controller.getDeviceModelUsage)
deviceModelRouter.post('/', controller.createDeviceModel)
deviceModelRouter.put('/:id', controller.updateDeviceModel)
deviceModelRouter.delete('/:id', controller.deleteDeviceModel)