import { Request, Response } from 'express'
import * as controller from './device-model.controller'
import * as service from './device-model.service'

jest.mock('./device-model.service')

const mockedService = service as jest.Mocked<typeof service>

const mockResponse = () => {
  const res = {} as Response
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('设备模型 controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET /api/device-models 返回 success,data 包装的分页结果', async () => {
    mockedService.getDeviceModels.mockResolvedValue({ list: [], total: 0, page: 2, pageSize: 10 })
    const req = { query: { name: '温控', protocol: 'MODBUS_TCP', page: '2', pageSize: '10' } } as unknown as Request
    const res = mockResponse()

    await controller.getAllDeviceModels(req, res)

    expect(mockedService.getDeviceModels).toHaveBeenCalledWith({ name: '温控', protocol: 'MODBUS_TCP', page: 2, pageSize: 10 })
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { list: [], total: 0, page: 2, pageSize: 10 } })
  })

  it('POST 缺少 name 返回 400', async () => {
    const req = { body: { modelDI: 'TEMP_001', protocol: 'MODBUS_TCP' } } as Request
    const res = mockResponse()

    await controller.createDeviceModel(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockedService.createDeviceModel).not.toHaveBeenCalled()
  })

  it('POST 协议非法返回 400', async () => {
    const req = { body: { name: '温控', modelDI: 'TEMP_001', protocol: 'UNKNOWN' } } as Request
    const res = mockResponse()

    await controller.createDeviceModel(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockedService.createDeviceModel).not.toHaveBeenCalled()
  })

  it('POST modelDI 重复返回 409', async () => {
    mockedService.createDeviceModel.mockRejectedValue({ code: 'MODEL_DI_EXISTS', message: '模型ID已存在' })
    const req = { body: { name: '温控', modelDI: 'TEMP_001', protocol: 'MODBUS_TCP' } } as Request
    const res = mockResponse()

    await controller.createDeviceModel(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ code: 'MODEL_DI_EXISTS', message: '模型ID已存在' })
  })
})
