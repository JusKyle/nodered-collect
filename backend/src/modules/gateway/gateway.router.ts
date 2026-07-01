import { Router } from 'express'
import * as controller from './gateway.controller'

export const gatewayRouter = Router()

gatewayRouter.get('/', controller.getAllGateways)
gatewayRouter.get('/:id', controller.getGatewayById)
gatewayRouter.post('/', controller.createGateway)
gatewayRouter.put('/:id', controller.updateGateway)
gatewayRouter.put('/:id/status', controller.updateGatewayStatus)
gatewayRouter.delete('/:id', controller.deleteGateway)
gatewayRouter.post('/test-connection', controller.testConnection)
gatewayRouter.get('/:gatewayId/verify-token', controller.verifyToken)
gatewayRouter.get('/performance/history', controller.getPerformanceHistory)