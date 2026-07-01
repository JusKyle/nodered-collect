import { Router } from 'express'
import * as controller from './device-model.controller'

export const deviceModelRouter = Router()

deviceModelRouter.get('/', controller.getAllDeviceModels)
deviceModelRouter.get('/:id/points/export', controller.exportPoints)
deviceModelRouter.get('/:id/points', controller.getModelPoints)
deviceModelRouter.get('/:id', controller.getDeviceModelById)
deviceModelRouter.get('/:id/usage', controller.getDeviceModelUsage)
deviceModelRouter.get('/:id/versions', controller.getVersionHistory)
deviceModelRouter.post('/', controller.createDeviceModel)
deviceModelRouter.post('/:id/points', controller.createPoint)
deviceModelRouter.post('/:id/duplicate', controller.duplicateModel)
deviceModelRouter.post('/:id/points/import', controller.importPoints)
deviceModelRouter.put('/:id/points/:pointId', controller.updatePoint)
deviceModelRouter.put('/:id/basic', controller.updateDeviceModelBasic)
deviceModelRouter.put('/:id', controller.updateDeviceModel)
deviceModelRouter.put('/:id/status', controller.updateModelStatus)
deviceModelRouter.delete('/:id/points/:pointId', controller.deletePoint)
deviceModelRouter.delete('/:id', controller.deleteDeviceModel)
