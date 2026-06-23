import { Router } from 'express'
import { gatewayRouter } from '../modules/gateway/gateway.router'
import { deviceModelRouter } from '../modules/device-model/device-model.router'
import { deviceInstanceRouter } from '../modules/device-instance/device-instance.router'
import { syncRouter } from '../modules/sync/sync.router'
import { registrationRouter } from '../modules/registration/registration.router'
import { deviceDataRouter } from '../modules/device-data/device-data.router'
import { sseService } from '../services/sse.service'

export const routes = Router()

routes.use('/gateways', gatewayRouter)
routes.use('/device-models', deviceModelRouter)
routes.use('/device-instances', deviceInstanceRouter)
routes.use('/sync', syncRouter)
routes.use('/registration', registrationRouter)
routes.use('/device-data', deviceDataRouter)

routes.get('/events', (req, res) => {
  sseService.addClient(res)
})
