import * as service from './registration.service'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

beforeEach(async () => {
  jest.clearAllMocks()
  await prisma.$executeRaw`TRUNCATE TABLE "RegistrationCode" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "Gateway" CASCADE`
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('batchGenerateRegistrationCodes', () => {
  it('AC-026: 批量生成指定数量的注册码', async () => {
    const result = await service.batchGenerateRegistrationCodes({ count: 5, validityDays: 30 })
    expect(result.codes).toHaveLength(5)
    expect(result.batchId).toBeDefined()
    for (const code of result.codes) {
      expect(code.code).toBeDefined()
      expect(code.expiresAt).toBeDefined()
      expect(code.status).toBe('UNUSED')
    }
  })

  it('AC-039: 批量生成数量上限校验 - 最多50个', async () => {
    await expect(
      service.batchGenerateRegistrationCodes({ count: 51, validityDays: 30 })
    ).rejects.toMatchObject({ code: 'INVALID_COUNT' })
  })

  it('AC-039: 批量生成数量下限校验 - 至少1个', async () => {
    await expect(
      service.batchGenerateRegistrationCodes({ count: 0, validityDays: 30 })
    ).rejects.toMatchObject({ code: 'INVALID_COUNT' })
  })

  it('AC-027: 自定义有效期天数', async () => {
    const result = await service.batchGenerateRegistrationCodes({ count: 3, validityDays: 7 })
    const now = Date.now()
    for (const code of result.codes) {
      const diff = Math.abs(new Date(code.expiresAt).getTime() - (now + 7 * 24 * 60 * 60 * 1000))
      expect(diff).toBeLessThan(5000)
    }
  })

  it('AC-026: 注册码为32位十六进制字符串', async () => {
    const result = await service.batchGenerateRegistrationCodes({ count: 1, validityDays: 30 })
    expect(result.codes[0].code).toMatch(/^[a-f0-9]{32}$/)
  })

  it('AC-026: 生成后数据库中对应数量的UNUSED状态记录', async () => {
    await service.batchGenerateRegistrationCodes({ count: 5, validityDays: 30 })
    const count = await prisma.registrationCode.count({ where: { status: 'UNUSED' } })
    expect(count).toBe(5)
  })

  it('批量生成的注册码唯一不重复', async () => {
    const result = await service.batchGenerateRegistrationCodes({ count: 10, validityDays: 30 })
    const codes = result.codes.map((c) => c.code)
    expect(new Set(codes).size).toBe(10)
  })
})
