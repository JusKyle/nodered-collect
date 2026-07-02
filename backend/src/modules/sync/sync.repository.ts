import { prisma } from '../../config/db'
import { SyncRecord, SyncType, SyncStatus } from '@prisma/client'

export const createSyncRecord = async (data: {
  type: SyncType
  gatewayId: string
  deviceInstanceId?: string
  status: SyncStatus
  message?: string
  payload?: any
  retryCount?: number
}): Promise<SyncRecord> => {
  // Store retryCount in payload if provided
  const recordData: any = {
    type: data.type,
    gatewayId: data.gatewayId,
    deviceInstanceId: data.deviceInstanceId,
    status: data.status,
    message: data.message,
    payload: data.retryCount !== undefined 
      ? { ...data.payload, _retryCount: data.retryCount }
      : data.payload
  }
  return prisma.syncRecord.create({ data: recordData })
}

export const getAllSyncRecords = async (): Promise<SyncRecord[]> => {
  return prisma.syncRecord.findMany({
    orderBy: { createdAt: 'desc' },
    include: { gateway: true, deviceInstance: true }
  })
}

export const getSyncRecordsByGatewayId = async (gatewayId: string): Promise<SyncRecord[]> => {
  return prisma.syncRecord.findMany({
    where: { gatewayId },
    orderBy: { createdAt: 'desc' },
    include: { deviceInstance: true }
  })
}

export const updateSyncRecordStatus = async (
  id: string,
  status: SyncStatus,
  message?: string
): Promise<SyncRecord> => {
  return prisma.syncRecord.update({
    where: { id },
    data: { status, message }
  })
}

export interface SyncRecordListParams {
  gatewayId?: string
  deviceInstanceId?: string
  status?: SyncStatus
  type?: SyncType
  startDate?: Date
  endDate?: Date
  page: number
  pageSize: number
}

export const getSyncRecordsPaginated = async (
  params: SyncRecordListParams
): Promise<{ records: SyncRecord[]; total: number }> => {
  const where: any = {}
  if (params.gatewayId) where.gatewayId = params.gatewayId
  if (params.deviceInstanceId) where.deviceInstanceId = params.deviceInstanceId
  if (params.status) where.status = params.status
  if (params.type) where.type = params.type
  if (params.startDate || params.endDate) {
    where.createdAt = {}
    if (params.startDate) where.createdAt.gte = params.startDate
    if (params.endDate) where.createdAt.lte = params.endDate
  }

  const total = await prisma.syncRecord.count({ where })
  const records = await prisma.syncRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
    include: { gateway: true, deviceInstance: true }
  })
  return { records, total }
}

export const getSyncRecordById = async (id: string): Promise<SyncRecord | null> => {
  return prisma.syncRecord.findUnique({
    where: { id },
    include: { gateway: true, deviceInstance: true }
  })
}