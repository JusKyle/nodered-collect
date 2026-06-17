import { prisma } from '../../config/db'
import { SyncRecord, SyncType, SyncStatus } from '@prisma/client'

export const createSyncRecord = async (data: {
  type: SyncType
  gatewayId: string
  deviceInstanceId?: string
  status: SyncStatus
  message?: string
  payload?: any
}): Promise<SyncRecord> => {
  return prisma.syncRecord.create({ data })
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