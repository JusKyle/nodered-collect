import * as service from './device-model.service'
import * as repository from './device-model.repository'

jest.mock('./device-model.repository')

const mockedRepository = repository as jest.Mocked<typeof repository>

describe('设备模型列表 API 服务', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('按分页、名称、协议查询并返回 pointCount', async () => {
    mockedRepository.getDeviceModels.mockResolvedValue({
      list: [
        {
          id: 'model-1',
          name: '温控设备',
          modelDI: 'TEMP_001',
          protocol: 'MODBUS_TCP',
          version: 2,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
          pointCount: 3
        }
      ],
      total: 1,
      page: 2,
      pageSize: 10
    })

    const result = await service.getDeviceModels({ name: '温控', protocol: 'MODBUS_TCP', page: 2, pageSize: 10 })

    expect(mockedRepository.getDeviceModels).toHaveBeenCalledWith({
      name: '温控',
      protocol: 'MODBUS_TCP',
      page: 2,
      pageSize: 10
    })
    expect(result.list[0]).toMatchObject({ modelDI: 'TEMP_001', pointCount: 3 })
    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 10 })
  })
})

describe('创建设备模型 API 服务', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('创建模板时校验 modelDI 唯一并返回 version=1', async () => {
    mockedRepository.findDeviceModelByModelDI.mockResolvedValue(null)
    mockedRepository.createDeviceModel.mockResolvedValue({
      id: 'model-1',
      name: '温控设备',
      vendor: '',
      model: 'TEMP_001',
      protocol: 'MODBUS_TCP',
      description: '备注',
      points: [],
      status: 'ENABLED',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const result = await service.createDeviceModel({
      name: '温控设备',
      modelDI: 'TEMP_001',
      protocol: 'MODBUS_TCP',
      description: '备注'
    })

    expect(mockedRepository.findDeviceModelByModelDI).toHaveBeenCalledWith('TEMP_001')
    expect(mockedRepository.createDeviceModel).toHaveBeenCalledWith({
      name: '温控设备',
      vendor: '',
      model: 'TEMP_001',
      protocol: 'MODBUS_TCP',
      description: '备注',
      points: []
    })
    expect(result.version).toBe(1)
  })

  it('modelDI 重复时抛出 MODEL_DI_EXISTS', async () => {
    mockedRepository.findDeviceModelByModelDI.mockResolvedValue({ id: 'exists' } as any)

    await expect(
      service.createDeviceModel({ name: '温控设备', modelDI: 'TEMP_001', protocol: 'MODBUS_TCP' })
    ).rejects.toMatchObject({ code: 'MODEL_DI_EXISTS' })
  })
})
