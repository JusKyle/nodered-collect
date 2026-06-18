import { Request, Response } from 'express'
import * as service from './device-data.service'

export const getCurrentData = async (req: Request, res: Response) => {
  const { instanceId } = req.params
  try {
    const data = await service.getCurrentData(instanceId)
    res.json({ success: true, data })
  } catch (err: any) {
    if (err.message === 'Device instance not found') {
      return res.status(404).json({ success: false, message: err.message })
    }
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getHistoryData = async (req: Request, res: Response) => {
  const { instanceId } = req.params
  const { pointCode, start, end, page, pageSize } = req.query

  try {
    const data = await service.getHistoryData(instanceId, {
      pointCode: pointCode as string | undefined,
      start: start as string | undefined,
      end: end as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined
    })
    res.json({ success: true, data })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getLatestData = async (req: Request, res: Response) => {
  const { gatewayId, modelId, page, pageSize } = req.query

  try {
    const data = await service.getLatestData({
      gatewayId: gatewayId as string | undefined,
      modelId: modelId as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined
    })
    res.json({ success: true, data })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}
