import { prisma } from '../../config/db'
import { Gateway, GatewayStatus, Prisma } from '@prisma/client'

export const createGateway = async (
  data: Prisma.GatewayCreateInput
): Promise<Gateway> => {
  return prisma.gateway.create({ data })
}

export const getAllGateways = async (): Promise<Gateway[]> => {
  return prisma.gateway.findMany()
}

export interface GatewayListParams {
  name?: string
  address?: string
  status?: GatewayStatus
  page?: number
  pageSize?: number
}

export interface GatewayListResult {
  list: Gateway[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const getGatewaysPaginated = async (
  params: GatewayListParams
): Promise<GatewayListResult> => {
  const { name, address, status, page = 1, pageSize = 20 } = params

  const where: any = {}
  if (name) {
    where.name = { contains: name, mode: 'insensitive' }
  }
  if (address) {
    where.address = { contains: address, mode: 'insensitive' }
  }
  if (status) {
    where.status = status
  }

  const [list, total] = await Promise.all([
    prisma.gateway.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.gateway.count({ where })
  ])

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

export const getGatewayById = async (id: string): Promise<Gateway | null> => {
  return prisma.gateway.findUnique({ where: { id } })
}

const transformCacheStatus = (cacheStatus: any) => {
  if (!cacheStatus) return null
  return {
    ...cacheStatus,
    cacheSizeBytes: Number(cacheStatus.cacheSizeBytes)
  }
}

export const getGatewayDetailById = async (id: string) => {
  const gateway = await prisma.gateway.findUnique({
    where: { id },
    include: {
      cacheStatus: true
    }
  })
  if (!gateway) return null
  return {
    ...gateway,
    cacheStatus: transformCacheStatus((gateway as any).cacheStatus)
  }
}

export const clearCache = async (gatewayId: string) => {
  const result = await prisma.gatewayCacheStatus.upsert({
    where: { gatewayId },
    create: {
      gatewayId,
      cacheCount: 0,
      cacheSizeBytes: BigInt(0),
      firstCachedAt: null,
      latestCachedAt: null,
      replayCount: 0,
      replayStatus: 'IDLE'
    },
    update: {
      cacheCount: 0,
      cacheSizeBytes: BigInt(0),
      firstCachedAt: null,
      latestCachedAt: null,
      replayCount: 0,
      replayStatus: 'IDLE'
    }
  })
  return transformCacheStatus(result)
}

export const getByAddress = async (
  address: string,
  port: number
): Promise<Gateway | null> => {
  return prisma.gateway.findUnique({
    where: { address_port: { address, port } }
  })
}

export const updateGateway = async (
  id: string,
  data: Partial<Gateway>
): Promise<Gateway> => {
  return prisma.gateway.update({ where: { id }, data })
}

export const deleteGateway = async (id: string): Promise<Gateway> => {
  return prisma.$transaction(async (tx) => {
    // 删除同步记录
    await tx.syncRecord.deleteMany({ where: { gatewayId: id } })
    // 删除设备数据点
    await tx.deviceDataPoint.deleteMany({ where: { gatewayId: id } })
    // 删除设备实例
    await tx.deviceInstance.deleteMany({ where: { gatewayId: id } })
    // 解绑注册码（设置为 null）
    await tx.registrationCode.updateMany({
      where: { gatewayId: id },
      data: { gatewayId: null }
    })
    // 删除网关（GatewayPerformance 和 GatewayCacheStatus 会级联删除）
    return tx.gateway.delete({ where: { id } })
  })
}

export const updateGatewayStatus = async (
  id: string,
  status: GatewayStatus,
  lastHeartbeat?: Date
): Promise<Gateway> => {
  return prisma.gateway.update({
    where: { id },
    data: { status, lastHeartbeat }
  })
}