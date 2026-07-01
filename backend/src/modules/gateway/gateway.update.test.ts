import * as service from './gateway.service'
import * as repository from './gateway.repository'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1)
  })
}))

jest.mock('../../services/sse.service', () => ({
  sseService: { broadcast: jest.fn() }
}))

jest.mock('../../services/heartbeat.service', () => ({
  markGatewayTokenExpired: jest.fn().mockResolvedValue(undefined)
}))

beforeEach(async () => {
  jest.clearAllMocks()
  await prisma.$executeRaw`TRUNCATE TABLE "GatewayCacheStatus" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "GatewayPerformance" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "RegistrationCode" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "DeviceDataPoint" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "SyncRecord" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "DeviceInstance" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "Gateway" CASCADE`
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('updateGateway', () => {
  it('AC-007: 更新名称', async () => {
    const gateway = await prisma.gateway.create({
      data: { name: '原始名称', address: '127.0.0.1', port: 1880, adminToken: 'token' }
    })

    const updated = await service.updateGateway(gateway.id, { name: '新名称' })
    expect(updated.name).toBe('新名称')
  })

  it('AC-007a: 更新缓存配置字段', async () => {
    const gateway = await prisma.gateway.create({
      data: { name: '测试网关', address: '127.0.0.1', port: 1880, adminToken: 'token' }
    })

    const updated = await service.updateGateway(gateway.id, {
      cacheEnabled: false,
      cacheRetentionDays: 30,
      cacheReplayRate: 200
    })

    expect(updated.cacheEnabled).toBe(false)
    expect(updated.cacheRetentionDays).toBe(30)
    expect(updated.cacheReplayRate).toBe(200)
  })

  it('AC-007: 补发速率范围校验 1-500', async () => {
    const gateway = await prisma.gateway.create({
      data: { name: '测试', address: '127.0.0.1', port: 1880, adminToken: 'token' }
    })

    await expect(
      service.updateGateway(gateway.id, { cacheReplayRate: 600 })
    ).rejects.toMatchObject({ code: 'INVALID_CACHE_RATE' })
  })

  it('AC-007: 保存期限范围校验 1-365', async () => {
    const gateway = await prisma.gateway.create({
      data: { name: '测试', address: '127.0.0.1', port: 1880, adminToken: 'token' }
    })

    await expect(
      service.updateGateway(gateway.id, { cacheRetentionDays: 400 })
    ).rejects.toMatchObject({ code: 'INVALID_RETENTION_DAYS' })
  })

  it('AC-013: 更新不存在的网关 → 抛出错误', async () => {
    await expect(
      service.updateGateway('non-existent-id', { name: '新名称' })
    ).rejects.toMatchObject({ code: 'GATEWAY_NOT_FOUND' })
  })
})

describe('deleteGateway', () => {
  it('AC-013: 删除不存在的网关 → 抛出错误', async () => {
    await expect(service.deleteGateway('non-existent-id')).rejects.toMatchObject({
      code: 'GATEWAY_NOT_FOUND'
    })
  })

  it('AC-013: 删除有实例关联的网关 → 抛出错误', async () => {
    const gateway = await prisma.gateway.create({
      data: { name: '测试网关', address: '127.0.0.1', port: 1880, adminToken: 'token' }
    })
    // 创建设备模板和实例
    const model = await prisma.deviceModel.create({
      data: { name: 'TestModel', vendor: 'Test', model: 'v1', protocol: 'MQTT' }
    })
    await prisma.deviceInstance.create({
      data: {
        name: '测试实例',
        modelId: model.id,
        gatewayId: gateway.id,
        nodeId: 'node-1'
      }
    })

    await expect(service.deleteGateway(gateway.id)).rejects.toMatchObject({
      code: 'GATEWAY_HAS_INSTANCES'
    })
  })

  it('AC-013: 正常删除网关', async () => {
    const gateway = await prisma.gateway.create({
      data: { name: '测试网关', address: '127.0.0.1', port: 1880, adminToken: 'token' }
    })

    await service.deleteGateway(gateway.id)

    const deleted = await prisma.gateway.findUnique({ where: { id: gateway.id } })
    expect(deleted).toBeNull()
  })
})
