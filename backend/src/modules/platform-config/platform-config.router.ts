import { Router } from 'express'
import * as controller from './platform-config.controller'

export const platformConfigRouter = Router()

platformConfigRouter.get('/', controller.getPlatformConfig)
platformConfigRouter.put('/', controller.updatePlatformConfig)
platformConfigRouter.get('/cache/effective', controller.getEffectiveCacheConfig)
