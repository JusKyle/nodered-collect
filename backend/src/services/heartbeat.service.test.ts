import { handleHeartbeat } from './heartbeat.service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

jest.mock('../config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1)
  })
}))

jest.mock('./sse.service', () => ({
  sseService: {
    broadcast: jest.fn()
  }
}))

beforeEach(async () => {
  jest.clearAllMocks()
  await prisma.$executeRaw`TRUNCATE TABLE "GatewayPerformance" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "Gateway" CASCADE`
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('handleHeartbeat', () => {
  it('AC-019: 心跳包含性能数据时，写入 GatewayPerformance 表', async () => {
    const gateway = await prisma.gateway.create({
      data: {
        name: '测试网关',
        address: '127.0.0.1',
        port: 1880,
        adminToken: 'test-token',
        status: 'OFFLINE'
      }
    })

    const perfData = JSON.stringify({
      cpuUsage: 45.2,
      memoryUsage: 62.3,
      diskUsage: 30.5,
      diskFreeBytes: 107374182400
    })

    await handleHeartbeat(gateway.id, perfData)

    const perfRecords = await prisma.gatewayPerformance.findMany({
      where: { gatewayId: gateway.id }
    })

    expect(perfRecords.length).toBe(1)
    expect(perfRecords[0].cpuUsage).toBe(45.2)
    expect(perfRecords[0].memoryUsage).toBe(62.3)
    expect(perfRecords[0].diskUsage).toBe(30.5)
    expect(Number(perfRecords[0].diskFreeBytes)).toBe(107374182400)
  })

  it('AC-005: 网关从 OFFLINE 变 ONLINE', async () => {
    const gateway = await prisma.gateway.create({
      data: {
        name: '测试网关',
        address: '127.0.0.1',
        port: 1880,
        adminToken: 'test-token',
        status: 'OFFLINE'
      }
    })

    await handleHeartbeat(gateway.id, '{}')

    const updated = await prisma.gateway.findUnique({ where: { id: gateway.id } })
    expect(updated?.status).toBe('ONLINE')
  })

  it('AC-006: 网关已 ONLINE 时再次心跳，状态不变', async () => {
    const gateway = await prisma.gateway.create({
      data: {
        name: '测试网关',
        address: '127.0.0.1',
        port: 1880,
        adminToken: 'test-token',
        status: 'ONLINE'
      }
    })

    await handleHeartbeat(gateway.id, '{}')

    const updated = await prisma.gateway.findUnique({ where: { id: gateway.id } })
    expect(updated?.status).toBe('ONLINE')
  })

  it('AC-005: lastHeartbeat 被更新', async () => {
    const gateway = await prisma.gateway.create({
      data: {
        name: '测试网关',
        address: '127.0.0.1',
        port: 1880,
        adminToken: 'test-token',
        status: 'ONLINE'
      }
    })

    const before = new Date()
    await new Promise(resolve => setTimeout(resolve, 100))

    await handleHeartbeat(gateway.id, '{}')

    const updated = await prisma.gateway.findUnique({ where: { id: gateway.id } })
    expect(updated?.lastHeartbeat).not.toBeNull()
    expect(updated!.lastHeartbeat!.getTime()).toBeGreaterThan(before.getTime())
  })

  it('心跳消息无性能数据时，不写入 GatewayPerformance', async () => {
    const gateway = await prisma.gateway.create({
      data: {
        name: '测试网关',
        address: '127.0.0.1',
        port: 1880,
        adminToken: 'test-token',
        status: 'ONLINE'
      }
    })

    await handleHeartbeat(gateway.id, '{}')

    const perfRecords = await prisma.gatewayPerformance.findMany({
      where: { gatewayId: gateway.id }
    })

    expect(perfRecords.length).toBe(0)
  })
})
