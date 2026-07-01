import { Router } from 'express'
import * as controller from './registration.controller'

export const registrationRouter = Router()

registrationRouter.post('/batch-generate', controller.batchGenerateRegistrationCodes)
registrationRouter.get('/codes', controller.getRegistrationCodeList)
registrationRouter.post('/codes/:id/revoke', controller.revokeRegistrationCode)
registrationRouter.post('/generate', controller.generateRegistrationCode)
registrationRouter.post('/register', controller.registerGateway)
