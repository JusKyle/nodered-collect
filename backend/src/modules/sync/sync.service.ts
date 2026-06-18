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
  const protocol = (model?.protocol || 's7').toLowerCase()
  const points = model?.points || []
  const customPoints = instance.config?.customPoints || []
  const allPoints = [...points, ...customPoints]
  
  const baseId = instance.id.replace(/-/g, '')
  const flowId = `flow-${baseId}`
  
  const nodes: any[] = []
  const wires: any[] = []
  
  let yOffset = 0
  
  const mqttInNode = {
    id: `${baseId}-mqtt-in`,
    type: 'mqtt in',
    z: flowId,
    name: `${instance.name}命令`,
    topic: `devices/${instance.id}/cmd`,
    qos: '0',
    datatype: 'json',
    x: 100,
    y: yOffset,
    wires: []
  }
  nodes.push(mqttInNode)
  yOffset += 80
  
  const mqttOutNode = {
    id: `${baseId}-mqtt-out`,
    type: 'mqtt out',
    z: flowId,
    name: `${instance.name}数据上报`,
    topic: `devices/${instance.id}/data`,
    qos: '0',
    retain: 'false',
    x: 900,
    y: yOffset,
    wires: []
  }
  nodes.push(mqttOutNode)
  yOffset += 80
  
  const debugNode = {
    id: `${baseId}-debug`,
    type: 'debug',
    z: flowId,
    name: `${instance.name}调试`,
    active: true,
    console: 'false',
    complete: 'payload',
    x: 900,
    y: yOffset,
    wires: []
  }
  nodes.push(debugNode)
  yOffset += 80
  
  let readIntervalNode: any = null
  if (protocol === 's7') {
    readIntervalNode = {
      id: `${baseId}-interval`,
      type: 'inject',
      z: flowId,
      name: `${instance.name}采集周期`,
      topic: '',
      payload: '',
      payloadType: 'none',
      repeat: '1',
      crontab: '',
      once: false,
      onceDelay: 0.1,
      x: 100,
      y: yOffset,
      wires: []
    }
    nodes.push(readIntervalNode)
    yOffset += 80
    
    const s7Node = {
      id: `${baseId}-s7`,
      type: 'S7 in',
      z: flowId,
      name: `${instance.name}`,
      endpoint: `endpoint-${baseId}`,
      address: instance.deviceAddress || '',
      mode: 'single',
      x: 350,
      y: yOffset,
      wires: []
    }
    nodes.push(s7Node)
    
    readIntervalNode.wires = [[s7Node.id]]
    s7Node.wires = [[mqttOutNode.id, debugNode.id]]
  } else if (protocol === 'modbus') {
    readIntervalNode = {
      id: `${baseId}-interval`,
      type: 'inject',
      z: flowId,
      name: `${instance.name}采集周期`,
      topic: '',
      payload: '',
      payloadType: 'none',
      repeat: '1',
      crontab: '',
      once: false,
      onceDelay: 0.1,
      x: 100,
      y: yOffset,
      wires: []
    }
    nodes.push(readIntervalNode)
    yOffset += 80
    
    const modbusNode = {
      id: `${baseId}-modbus`,
      type: 'modbus-read',
      z: flowId,
      name: `${instance.name}`,
      server: `server-${baseId}`,
      dataType: 'Coils',
      address: '0',
      quantity: allPoints.length.toString(),
      rate: '1',
      x: 350,
      y: yOffset,
      wires: []
    }
    nodes.push(modbusNode)
    
    readIntervalNode.wires = [[modbusNode.id]]
    modbusNode.wires = [[mqttOutNode.id, debugNode.id]]
  } else if (protocol === 'opcua') {
    readIntervalNode = {
      id: `${baseId}-interval`,
      type: 'inject',
      z: flowId,
      name: `${instance.name}采集周期`,
      topic: '',
      payload: '',
      payloadType: 'none',
      repeat: '1',
      crontab: '',
      once: false,
      onceDelay: 0.1,
      x: 100,
      y: yOffset,
      wires: []
    }
    nodes.push(readIntervalNode)
    yOffset += 80
    
    const opcuaNode = {
      id: `${baseId}-opcua`,
      type: 'OpcUa-Client',
      z: flowId,
      name: `${instance.name}`,
      endpoint: `endpoint-${baseId}`,
      securityPolicy: 'None',
      securityMode: 'None',
      x: 350,
      y: yOffset,
      wires: []
    }
    nodes.push(opcuaNode)
    
    readIntervalNode.wires = [[opcuaNode.id]]
    opcuaNode.wires = [[mqttOutNode.id, debugNode.id]]
  } else {
    readIntervalNode = {
      id: `${baseId}-interval`,
      type: 'inject',
      z: flowId,
      name: `${instance.name}采集周期`,
      topic: '',
      payload: '',
      payloadType: 'none',
      repeat: '1',
      crontab: '',
      once: false,
      onceDelay: 0.1,
      x: 100,
      y: yOffset,
      wires: []
    }
    nodes.push(readIntervalNode)
    yOffset += 80
    
    const httpNode = {
      id: `${baseId}-http`,
      type: 'http request',
      z: flowId,
      name: `${instance.name}`,
      method: 'GET',
      url: instance.deviceAddress || '',
      x: 350,
      y: yOffset,
      wires: []
    }
    nodes.push(httpNode)
    
    readIntervalNode.wires = [[httpNode.id]]
    httpNode.wires = [[mqttOutNode.id, debugNode.id]]
  }
  
  return {
    flows: nodes,
    configs: [
      {
        id: `mqtt-broker-${baseId}`,
        type: 'mqtt-broker',
        name: 'EMQX',
        broker: process.env.MQTT_HOST || 'emqx',
        port: parseInt(process.env.MQTT_PORT || '1883'),
        clientid: `nodered-${instance.id}`,
        useSSL: false,
        keepalive: 60,
        version: '4.0.0'
      }
    ]
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
    
    // 5. 调用 Node-RED Admin API
    const nodeRedUrl = `http://${gateway.address}:${gateway.port}/flows`
    try {
      await axios.post(nodeRedUrl, flowConfig.flows, {
        headers: {
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
  
  // 获取当前 flows 并移除该设备的节点
  const nodeRedUrl = `http://${gateway.address}:${gateway.port}/flows`
  
  try {
    const response = await axios.get(nodeRedUrl, { timeout: 10000 })
    const currentFlows = response.data
    
    const baseId = instance.id.replace(/-/g, '')
    const filteredFlows = currentFlows.filter((node: any) => !node.id?.startsWith(baseId))
    
    await axios.post(nodeRedUrl, filteredFlows, {
      headers: {
        'Content-Type': 'application/json'
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
    return repository.createSyncRecord({
      type: SyncType.UNDEPLOY,
      gatewayId,
      deviceInstanceId,
      status: SyncStatus.FAILED,
      message: error.message
    })
  }
}