import { Router } from 'express'
import * as controller from './device-model.controller'

export const deviceModelRouter = Router()

deviceModelRouter.get('/', controller.getAllDeviceModels)
deviceModelRouter.get('/:id', controller.getDeviceModelById)
deviceModelRouter.get('/:id/usage', controller.getDeviceModelUsage)
deviceModelRouter.get('/:id/versions', controller.getVersionHistory)
deviceModelRouter.post('/', controller.createDeviceModel)
deviceModelRouter.post('/:id/duplicate', controller.duplicateModel)
deviceModelRouter.post('/:id/points/import', controller.importPoints)
deviceModelRouter.put('/:id', controller.updateDeviceModel)
deviceModelRouter.put('/:id/status', controller.updateModelStatus)
deviceModelRouter.delete('/:id', controller.deleteDeviceModel)