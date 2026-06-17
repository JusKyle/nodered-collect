import { SyncRecord, SyncType, SyncStatus } from '@prisma/client'
import * as repository from './sync.repository'
import { CreateSyncRecordDto, DeployConfigDto } from './sync.dto'
import { getGatewayById } from '../gateway/gateway.service'

export const createSyncRecord = async (dto: CreateSyncRecordDto): Promise<SyncRecord> => {
  return repository.createSyncRecord({
    type: dto.type,
    gatewayId: dto.gatewayId,
    deviceInstanceId: dto.deviceInstanceId,
    status: dto.status,
    message: dto.message,
    payload: dto.payload
  })
}

export const getAllSyncRecords = async (): Promise<SyncRecord[]> => {
  return repository.getAllSyncRecords()
}

export const getSyncRecordsByGatewayId = async (gatewayId: string): Promise<SyncRecord[]> => {
  return repository.getSyncRecordsByGatewayId(gatewayId)
}

export const deployConfig = async (dto: DeployConfigDto): Promise<SyncRecord> => {
  const gateway = await getGatewayById(dto.gatewayId)
  if (!gateway) {
    throw new Error('Gateway not found')
  }

  const syncRecord = await repository.createSyncRecord({
    type: SyncType.DEPLOY,
    gatewayId: dto.gatewayId,
    deviceInstanceId: dto.deviceInstanceId,
    status: SyncStatus.PENDING
  })

  return syncRecord
}