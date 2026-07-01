import * as service from './device-model.service'
import * as repository from './device-model.repository'

jest.mock('./device-model.repository')

const mockedRepository = repository as jest.Mocked<typeof repository>

describe('设备模型点位 API 服务', () => {
  beforeEach(() => jest.clearAllMocks())

  it('查询点位列表时校验模板存在并按参数分页搜索', async () => {
    mockedRepository.getDeviceModelById.mockResolvedValue({ id: 'model-1' } as any)
    mockedRepository.getModelPoints.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 })

    const result = await service.getModelPoints('model-1', { name: '温度', page: 1, pageSize: 20 })

    expect(mockedRepository.getModelPoints).toHaveBeenCalledWith('model-1', { name: '温度', page: 1, pageSize: 20 })
    expect(result).toMatchObject({ list: [], total: 0 })
  })

  it('新增点位时校验 tag 唯一并版本 +1', async () => {
    mockedRepository.getDeviceModelById.mockResolvedValue({ id: 'model-1', version: 1, protocol: 'MODBUS_TCP' } as any)
    mockedRepository.findPointByTag.mockResolvedValue(null)
    mockedRepository.createPointWithVersion.mockResolvedValue({ id: 'point-1', tag: 'temperature', name: '温度' } as any)

    const result = await service.createPoint('model-1', {
      name: '温度',
      tag: 'temperature',
      dataType: 'FLOAT32',
      address: '40001',
      config: { slaveId: 1, registerType: 'Holding', startAddress: 0 }
    })

    expect(mockedRepository.createPointWithVersion).toHaveBeenCalledWith('model-1', expect.objectContaining({ tag: 'temperature' }))
    expect(result).toMatchObject({ id: 'point-1' })
  })

  it('新增点位 tag 重复时抛出 POINT_TAG_EXISTS', async () => {
    mockedRepository.getDeviceModelById.mockResolvedValue({ id: 'model-1' } as any)
    mockedRepository.findPointByTag.mockResolvedValue({ id: 'point-1' } as any)

    await expect(service.createPoint('model-1', { name: '温度', tag: 'temperature', dataType: 'FLOAT32' })).rejects.toMatchObject({ code: 'POINT_TAG_EXISTS' })
  })

  it('编辑点位时排除自身做 tag 唯一校验并版本 +1', async () => {
    mockedRepository.getPointById.mockResolvedValue({ id: 'point-1', modelId: 'model-1', tag: 'temperature' } as any)
    mockedRepository.findPointByTag.mockResolvedValue(null)
    mockedRepository.updatePointWithVersion.mockResolvedValue({ id: 'point-1', name: '温度2' } as any)

    const result = await service.updatePoint('model-1', 'point-1', { name: '温度2', tag: 'temperature2' })

    expect(mockedRepository.updatePointWithVersion).toHaveBeenCalledWith('model-1', 'point-1', { name: '温度2', tag: 'temperature2' })
    expect(result).toMatchObject({ name: '温度2' })
  })

  it('删除点位后调用事务删除、重排 sort 并版本 +1', async () => {
    mockedRepository.getPointById.mockResolvedValue({ id: 'point-1', modelId: 'model-1' } as any)
    mockedRepository.deletePointWithVersion.mockResolvedValue(undefined)

    await service.deletePoint('model-1', 'point-1')

    expect(mockedRepository.deletePointWithVersion).toHaveBeenCalledWith('model-1', 'point-1')
  })
})
