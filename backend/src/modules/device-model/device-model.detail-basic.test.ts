import * as service from './device-model.service'
import * as repository from './device-model.repository'

jest.mock('./device-model.repository')

const mockedRepository = repository as jest.Mocked<typeof repository>

describe('设备模型详情 API 服务', () => {
  beforeEach(() => jest.clearAllMocks())

  it('返回模板详情和按 sort 升序排列的 points', async () => {
    mockedRepository.getDeviceModelDetailById.mockResolvedValue({
      id: 'model-1',
      modelDI: 'TEMP_001',
      name: '温控设备',
      protocol: 'MODBUS_TCP',
      version: 2,
      description: '备注',
      createdAt: new Date(),
      updatedAt: new Date(),
      points: [
        { id: 'p2', name: '湿度', tag: 'humidity', sort: 2 },
        { id: 'p1', name: '温度', tag: 'temperature', sort: 1 }
      ]
    } as any)

    const result = await service.getDeviceModelById('model-1')

    expect(mockedRepository.getDeviceModelDetailById).toHaveBeenCalledWith('model-1')
    expect(result).toMatchObject({ id: 'model-1', modelDI: 'TEMP_001', version: 2 })
    expect(result?.points.map((point: any) => point.tag)).toEqual(['temperature', 'humidity'])
  })

  it('模板不存在时返回 null', async () => {
    mockedRepository.getDeviceModelDetailById.mockResolvedValue(null)

    await expect(service.getDeviceModelById('missing')).resolves.toBeNull()
  })
})

describe('编辑设备模型基本信息 API 服务', () => {
  beforeEach(() => jest.clearAllMocks())

  it('更新 name 和 description 时不修改 version 和 protocol', async () => {
    mockedRepository.getDeviceModelById.mockResolvedValue({
      id: 'model-1',
      name: '旧名称',
      vendor: '',
      model: 'TEMP_001',
      protocol: 'MODBUS_TCP',
      description: null,
      points: [],
      status: 'ENABLED',
      version: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    mockedRepository.updateDeviceModelBasic.mockResolvedValue({
      id: 'model-1',
      name: '新名称',
      vendor: '',
      model: 'TEMP_001',
      protocol: 'MODBUS_TCP',
      description: '新备注',
      points: [],
      status: 'ENABLED',
      version: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const result = await service.updateDeviceModelBasic('model-1', {
      name: '新名称',
      modelDI: 'TEMP_001',
      description: '新备注',
      protocol: 'MQTT'
    })

    expect(mockedRepository.updateDeviceModelBasic).toHaveBeenCalledWith('model-1', {
      name: '新名称',
      model: 'TEMP_001',
      description: '新备注'
    })
    expect(result.version).toBe(3)
    expect(result.protocol).toBe('MODBUS_TCP')
  })

  it('modelDI 与其他模板重复时抛出 MODEL_DI_EXISTS', async () => {
    mockedRepository.getDeviceModelById.mockResolvedValue({ id: 'model-1', model: 'TEMP_001' } as any)
    mockedRepository.findDeviceModelByModelDI.mockResolvedValue({ id: 'model-2' })

    await expect(
      service.updateDeviceModelBasic('model-1', { modelDI: 'TEMP_002' })
    ).rejects.toMatchObject({ code: 'MODEL_DI_EXISTS' })
  })

  it('模板不存在时抛出 DEVICE_MODEL_NOT_FOUND', async () => {
    mockedRepository.getDeviceModelById.mockResolvedValue(null)

    await expect(service.updateDeviceModelBasic('missing', { name: '新名称' })).rejects.toMatchObject({ code: 'DEVICE_MODEL_NOT_FOUND' })
  })
})
