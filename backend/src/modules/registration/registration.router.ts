import { Router } from 'express'
import * as controller from './registration.controller'

export const registrationRouter = Router()

registrationRouter.post('/generate', controller.generateRegistrationCode)
registrationRouter.post('/register', controller.registerGateway)