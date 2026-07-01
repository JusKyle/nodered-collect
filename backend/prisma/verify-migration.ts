import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyMigration() {
  const errors: string[] = []

  // 1. Gateway 表有 cache 相关字段
  const gatewayInfo = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'Gateway'
  ` as any[]
  const gatewayColumns = gatewayInfo.map(c => c.column_name)

  if (!gatewayColumns.includes('cacheEnabled')) errors.push('Gateway.cacheEnabled missing')
  if (!gatewayColumns.includes('cacheRetentionDays')) errors.push('Gateway.cacheRetentionDays missing')
  if (!gatewayColumns.includes('cacheReplayRate')) errors.push('Gateway.cacheReplayRate missing')

  // 2. RegistrationCode 表有 status 枚举
  const regCodeInfo = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'RegistrationCode'
  ` as any[]
  const regCodeColumns = regCodeInfo.map(c => c.column_name)

  if (!regCodeColumns.includes('status')) errors.push('RegistrationCode.status missing')
  if (!regCodeColumns.includes('gatewayId')) errors.push('RegistrationCode.gatewayId missing')
  if (!regCodeColumns.includes('usedAt')) errors.push('RegistrationCode.usedAt missing')
  if (!regCodeColumns.includes('revokedAt')) errors.push('RegistrationCode.revokedAt missing')

  // 3. GatewayPerformance 表存在
  const perfTables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables WHERE table_name = 'GatewayPerformance'
  ` as any[]
  if (perfTables.length === 0) errors.push('GatewayPerformance table missing')

  // 4. PlatformConfig 表存在
  const configTables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables WHERE table_name = 'PlatformConfig'
  ` as any[]
  if (configTables.length === 0) errors.push('PlatformConfig table missing')

  // 5. 可以插入 PlatformConfig 记录
  try {
    await prisma.$executeRaw`
      INSERT INTO "PlatformConfig" (id, "cacheEnabled", "cacheRetentionDays", "cacheReplayRate", "createdAt", "updatedAt")
      VALUES ('singleton', false, 15, 100, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET "cacheEnabled" = EXCLUDED."cacheEnabled"
    `
  } catch (e: any) {
    errors.push(`PlatformConfig insert failed: ${e.message}`)
  }

  // 6. 可以插入 GatewayPerformance 记录
  try {
    // 先创建测试用 Gateway
    await prisma.$executeRaw`
      INSERT INTO "Gateway" (id, name, address, port, "adminToken", status, "createdAt", "updatedAt")
      VALUES ('test-gateway', 'Test Gateway', '127.0.0.1', 1880, 'test-token', 'OFFLINE', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `
    await prisma.$executeRaw`
      INSERT INTO "GatewayPerformance" (id, "gatewayId", "cpuUsage", "memoryUsage", "timestamp", "createdAt")
      VALUES (gen_random_uuid()::text, 'test-gateway', 45.2, 62.3, NOW(), NOW())
    `
    // 清理测试数据
    await prisma.$executeRaw`DELETE FROM "GatewayPerformance" WHERE "gatewayId" = 'test-gateway'`
    await prisma.$executeRaw`DELETE FROM "Gateway" WHERE id = 'test-gateway'`
  } catch (e: any) {
    errors.push(`GatewayPerformance insert failed: ${e.message}`)
  }

  if (errors.length > 0) {
    console.error('Migration verification FAILED:')
    errors.forEach(e => console.error(`  - ${e}`))
    process.exit(1)
  } else {
    console.log('Migration verification PASSED')
  }
}

verifyMigration()
  .finally(() => prisma.$disconnect())
