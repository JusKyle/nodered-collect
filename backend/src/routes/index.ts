import { Router } from 'express'
import { gatewayRouter } from '../modules/gateway/gateway.router'
import { deviceModelRouter } from '../modules/device-model/device-model.router'
import { deviceInstanceRouter } from '../modules/device-instance/device-instance.router'
import { syncRouter } from '../modules/sync/sync.router'
import { registrationRouter } from '../modules/registration/registration.router'

export const routes = Router()

routes.use('/gateways', gatewayRouter)
routes.use('/device-models', deviceModelRouter)
routes.use('/device-instances', deviceInstanceRouter)
routes.use('/sync', syncRouter)
routes.use('/registration', registrationRouter)