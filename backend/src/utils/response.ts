import { Response } from 'express'

export const successResponse = (res: Response, data: any, message: string = 'Success') => {
  return res.status(200).json({
    status: 'success',
    message,
    data
  })
}

export const createdResponse = (res: Response, data: any, message: string = 'Created') => {
  return res.status(201).json({
    status: 'success',
    message,
    data
  })
}

export const errorResponse = (res: Response, message: string, statusCode: number = 400) => {
  return res.status(statusCode).json({
    status: 'error',
    message
  })
}