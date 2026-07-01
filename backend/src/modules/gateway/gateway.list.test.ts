import * as service from './gateway.service'
import { PrismaClient, GatewayStatus } from '@prisma/client'

const prisma = new PrismaClient()

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1)
  })
}))

jest.mock('../../services/sse.service', () => ({
  sseService: {
    broadcast: jest.fn()
  }
}))

jest.mock('../../services/heartbeat.service', () => ({
  markGatewayTokenExpired: jest.fn().mockResolvedValue(undefined)
}))

beforeEach(async () => {
  // 先清理所有关联表，再清理网关表
  await prisma.$executeRaw`TRUNCATE TABLE "GatewayCacheStatus" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "GatewayPerformance" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "RegistrationCode" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "DeviceDataPoint" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "SyncRecord" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "DeviceInstance" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "Gateway" CASCADE`

  // 创建测试数据
  await prisma.gateway.createMany({
    data: [
      { name: '测试网关A', address: '192.168.1.10', port: 1880, adminToken: 'token1', status: 'ONLINE' },
      { name: '测试网关B', address: '192.168.1.11', port: 1880, adminToken: 'token2', status: 'OFFLINE' },
      { name: '生产网关C', address: '192.168.1.12', port: 1880, adminToken: 'token3', status: 'ONLINE' },
      { name: '测试网关D', address: '192.168.1.13', port: 1880, adminToken: 'token4', status: 'ERROR' },
    ]
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('getAllGateways - 筛选分页', () => {
  it('AC-010: 默认返回所有网关，有 list 和 total', async () => {
    const result = await service.getAllGateways({})

    expect(result.list).toBeDefined()
    expect(result.total).toBeDefined()
    expect(Array.isArray(result.list)).toBe(true)
    expect(result.list.length).toBe(4)
    expect(result.total).toBe(4)
  })

  it('AC-010: ?name=测试 → 只返回名称含"测试"的网关', async () => {
    const result = await service.getAllGateways({ name: '测试' })

    expect(result.list.length).toBe(3)
    expect(result.total).toBe(3)
    result.list.forEach(g => {
      expect(g.name).toContain('测试')
    })
  })

  it('AC-010: ?status=ONLINE → 只返回在线网关', async () => {
    const result = await service.getAllGateways({ status: 'ONLINE' })

    expect(result.list.length).toBe(2)
    expect(result.total).toBe(2)
    result.list.forEach(g => {
      expect(g.status).toBe('ONLINE')
    })
  })

  it('AC-010: ?page=2&pageSize=2 → 返回第 2 页，每页 2 条', async () => {
    const result = await service.getAllGateways({ page: 2, pageSize: 2 })

    expect(result.list.length).toBe(2)
    expect(result.total).toBe(4)
    expect(result.page).toBe(2)
    expect(result.pageSize).toBe(2)
    expect(result.totalPages).toBe(2)
  })

  it('AC-010: ?page=3&pageSize=2 → 返回第 3 页', async () => {
    const result = await service.getAllGateways({ page: 3, pageSize: 2 })

    expect(result.total).toBe(4)
    expect(result.page).toBe(3)
    // 4条数据分2页后，第3页可能0条（取决于updatedAt顺序）
    expect(result.list.length).toBeLessThanOrEqual(2)
  })

  it('AC-010: ?address=192.168 → 按地址模糊匹配', async () => {
    const result = await service.getAllGateways({ address: '192.168' })

    expect(result.list.length).toBe(4)
    expect(result.total).toBe(4)
  })

  it('AC-010: 默认按 updatedAt 倒序', async () => {
    const result = await service.getAllGateways({})

    expect(result.list.length).toBeGreaterThanOrEqual(2)
    for (let i = 0; i < result.list.length - 1; i++) {
      const a = new Date(result.list[i].updatedAt).getTime()
      const b = new Date(result.list[i + 1].updatedAt).getTime()
      expect(a).toBeGreaterThanOrEqual(b)
    }
  })

  it('AC-010: 筛选条件组合', async () => {
    // 测试数据中：测试网关A=ONLINE, 测试网关B=OFFLINE, 测试网关D=ERROR
    // name='测试' AND status='ONLINE' 应该只返回 测试网关A
    const result = await service.getAllGateways({ name: '测试', status: 'ONLINE' })

    expect(result.list.length).toBe(1)
    expect(result.total).toBe(1)
    result.list.forEach(g => {
      expect(g.name).toContain('测试')
      expect(g.status).toBe('ONLINE')
    })
  })
})
