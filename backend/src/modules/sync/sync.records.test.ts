import * as service from './sync.service'
import * as repository from './sync.repository'

jest.mock('./sync.repository')

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1)
  })
}))

jest.mock('../../services/heartbeat.service', () => ({
  markGatewayTokenExpired: jest.fn().mockResolvedValue(undefined)
}))

const mockedRepository = repository as jest.Mocked<typeof repository>

describe('配置记录列表服务', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('按筛选和分页返回配置记录列表展示字段', async () => {
    const createdAt = new Date('2026-07-02T10:00:00Z')
    const finishedAt = new Date('2026-07-02T10:00:05Z')

    mockedRepository.getSyncRecordsPaginated.mockResolvedValue({
      records: [
        {
          id: 'record-1',
          type: 'DEPLOY',
          gatewayId: 'gateway-1',
          deviceInstanceId: 'instance-1',
          status: 'SUCCESS',
          message: null,
          payload: {
            configVersion: 3,
            deployedVersion: 3,
            flowName: '锅炉-dev-001',
            operatorName: 'admin',
            finishedAt: finishedAt.toISOString()
          },
          createdAt,
          gateway: { id: 'gateway-1', name: '一号网关' },
          deviceInstance: { id: 'instance-1', name: '锅炉', deviceId: 'dev-001' }
        } as any
      ],
      total: 1
    })

    const result = await service.getSyncRecords({
      gatewayId: 'gateway-1',
      deviceInstanceId: 'instance-1',
      status: 'SUCCESS',
      type: 'DEPLOY',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      page: 2,
      pageSize: 10
    })

    expect(mockedRepository.getSyncRecordsPaginated).toHaveBeenCalledWith({
      gatewayId: 'gateway-1',
      deviceInstanceId: 'instance-1',
      status: 'SUCCESS',
      type: 'DEPLOY',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-03'),
      page: 2,
      pageSize: 10
    })
    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 10, totalPages: 1 })
    expect(result.list[0]).toMatchObject({
      id: 'record-1',
      type: 'DEPLOY',
      status: 'SUCCESS',
      deviceName: '锅炉',
      deviceId: 'dev-001',
      gatewayName: '一号网关',
      configVersion: 3,
      deployedVersion: 3,
      flowName: '锅炉-dev-001',
      operatorName: 'admin',
      durationMs: 5000
    })
  })

  it('按 ID 返回配置记录详情和 Flow 节点摘要', async () => {
    const createdAt = new Date('2026-07-02T10:00:00Z')
    const finishedAt = new Date('2026-07-02T10:00:08Z')

    mockedRepository.getSyncRecordById.mockResolvedValue({
      id: 'record-2',
      type: 'DEPLOY',
      gatewayId: 'gateway-1',
      deviceInstanceId: 'instance-1',
      status: 'FAILED',
      message: 'Node-RED 调用失败',
      payload: {
        configVersion: 4,
        deployedVersion: 3,
        flowName: '锅炉-dev-001',
        errorCode: 'NODE_RED_ERROR',
        errorMessage: 'Node-RED 调用失败',
        finishedAt: finishedAt.toISOString(),
        nodes: [
          { id: 'tab-1', type: 'tab', label: '锅炉-dev-001' },
          { id: 'node-1', type: 'inject', name: '采集触发', repeat: '5', z: 'tab-1' }
        ]
      },
      createdAt,
      gateway: { id: 'gateway-1', name: '一号网关' },
      deviceInstance: { id: 'instance-1', name: '锅炉', deviceId: 'dev-001' }
    } as any)

    const result = await service.getSyncRecordDetail('record-2')

    expect(mockedRepository.getSyncRecordById).toHaveBeenCalledWith('record-2')
    expect(result).toMatchObject({
      id: 'record-2',
      status: 'FAILED',
      deviceName: '锅炉',
      gatewayName: '一号网关',
      errorCode: 'NODE_RED_ERROR',
      errorMessage: 'Node-RED 调用失败',
      durationMs: 8000
    })
    expect(result?.flowConfig).toHaveLength(2)
    expect(result?.flowNodes).toEqual([
      { id: 'tab-1', type: 'tab', name: '锅炉-dev-001' },
      { id: 'node-1', type: 'inject', name: '采集触发' }
    ])
  })
})
