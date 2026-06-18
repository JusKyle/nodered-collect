import axios from 'axios'
import { SyncRecord, SyncType, SyncStatus, GatewayStatus, DeviceStatus } from '@prisma/client'
import * as repository from './sync.repository'
import { CreateSyncRecordDto, DeployConfigDto } from './sync.dto'
import { getGatewayById } from '../gateway/gateway.service'
import { getDeviceInstanceById, getDeviceInstanceWithModel, updateDeviceInstanceStatus } from '../device-instance/device-instance.service'
import { markGatewayTokenExpired } from '../../services/heartbeat.service'
import { redisClient } from '../../config/redis'

const RETRY_CONFIG = [
  { delay: 10000 },   // 10秒
  { delay: 30000 },   // 30秒
  { delay: 60000 }    // 60秒
]

// 生成 Node-RED Flow 配置
const generateNodeREDFlow = (instance: any): any => {
  const model = instance.model
  const points = model?.points || []
  
  // 生成节点配置
  const nodes = points.map((point: any, index: number) => ({
    id: `${instance.id}_${point.code}_${index}`,
    type: point.type || 'function',
    name: point.name || point.code,
    config: point.config || {},
    wires: point.wires || []
  }))

  return {
    id: instance.id,
    label: instance.name,
    nodes,
    config: instance.config || {}
  }
}

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
  const { deviceInstanceId, gatewayId } = dto
  
  // 1. 检查下发锁
  const lockKey = `sync:dispatching:${deviceInstanceId}`
  const locked = await redisClient.set(lockKey, '1', { NX: true, EX: 60 })
  if (!locked) {
    throw new Error('下发进行中，请稍后再试')
  }
  
  try {
    // 2. 检查网关状态
    const gateway = await getGatewayById(gatewayId)
    if (!gateway) throw new Error('网关不存在')
    if (gateway.status === GatewayStatus.OFFLINE) {
      throw new Error('网关离线，无法下发配置')
    }
    if (gateway.status === GatewayStatus.TOKEN_EXPIRED) {
      throw new Error('网关 Token 已失效，请更新后重试')
    }
    
    // 3. 获取设备实例和模型
    const instance = await getDeviceInstanceWithModel(deviceInstanceId)
    if (!instance) throw new Error('设备实例不存在')
    
    // 4. 生成 Node-RED Flow
    const flowConfig = generateNodeREDFlow(instance)
    
    // 5. 调用 Node-RED API
    const nodeRedUrl = `http://${gateway.address}:${gateway.port}/admin/flows`
    try {
      await axios.post(nodeRedUrl, flowConfig, {
        headers: {
          'Authorization': `Bearer ${gateway.adminToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      })
      
      // 6. 更新实例状态
      await updateDeviceInstanceStatus(deviceInstanceId, DeviceStatus.RUNNING)
      
      // 7. 创建成功记录
      const record = await repository.createSyncRecord({
        type: SyncType.DEPLOY,
        gatewayId,
        deviceInstanceId,
        status: SyncStatus.SUCCESS,
        payload: flowConfig
      })
      
      return record
    } catch (error: any) {
      // 401 = Token 失效
      if (error.response?.status === 401) {
        await markGatewayTokenExpired(gatewayId)
        throw new Error('网关 Token 已失效')
      }
      
      // 其他错误，触发重试
      return await handleDeployRetry(deviceInstanceId, gatewayId, flowConfig, error.message)
    }
  } finally {
    await redisClient.del(lockKey)
  }
}

const handleDeployRetry = async (
  deviceInstanceId: string,
  gatewayId: string,
  flowConfig: any,
  errorMessage: string,
  attempt = 1
): Promise<SyncRecord> => {
  if (attempt > 3) {
    // 重试次数用尽，标记失败
    await updateDeviceInstanceStatus(deviceInstanceId, DeviceStatus.PENDING_SYNC)
    return repository.createSyncRecord({
      type: SyncType.DEPLOY,
      gatewayId,
      deviceInstanceId,
      status: SyncStatus.FAILED,
      message: errorMessage,
      payload: flowConfig,
      retryCount: 3
    })
  }
  
  // 创建重试记录
  const record = await repository.createSyncRecord({
    type: SyncType.DEPLOY,
    gatewayId,
    deviceInstanceId,
    status: SyncStatus.PENDING,
    message: `第${attempt}次重试等待中`,
    payload: flowConfig,
    retryCount: attempt
  })
  
  // 安排延迟重试（实际应该用 BullMQ 或类似队列）
  const delay = RETRY_CONFIG[attempt - 1].delay
  // 这里简化处理，实际应该用定时任务
  
  return record
}

export const undeployConfig = async (dto: { deviceInstanceId: string; gatewayId: string }): Promise<SyncRecord> => {
  const { deviceInstanceId, gatewayId } = dto
  
  const gateway = await getGatewayById(gatewayId)
  if (!gateway) throw new Error('网关不存在')
  
  const instance = await getDeviceInstanceById(deviceInstanceId)
  if (!instance) throw new Error('设备实例不存在')
  
  // 调用 Node-RED API 删除节点
  const nodeRedUrl = `http://${gateway.address}:${gateway.port}/admin/flows/${instance.id}`
  
  try {
    await axios.delete(nodeRedUrl, {
      headers: {
        'Authorization': `Bearer ${gateway.adminToken}`
      },
      timeout: 10000
    })
    
    // 更新实例状态
    await updateDeviceInstanceStatus(deviceInstanceId, DeviceStatus.PENDING_SYNC)
    
    return repository.createSyncRecord({
      type: SyncType.UNDEPLOY,
      gatewayId,
      deviceInstanceId,
      status: SyncStatus.SUCCESS
    })
  } catch (error: any) {
    // 401 = Token 失效
    if (error.response?.status === 401) {
      await markGatewayTokenExpired(gatewayId)
    }
    
    return repository.createSyncRecord({
      type: SyncType.UNDEPLOY,
      gatewayId,
      deviceInstanceId,
      status: SyncStatus.FAILED,
      message: error.message
    })
  }
}