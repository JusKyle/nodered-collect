import axios from 'axios'
import { SyncRecord, SyncType, SyncStatus, GatewayStatus, DeviceStatus } from '@prisma/client'
import * as repository from './sync.repository'
import { CreateSyncRecordDto, DeployConfigDto } from './sync.dto'
import { getGatewayById } from '../gateway/gateway.service'
import { getDeviceInstanceById, getDeviceInstanceWithModel, updateDeviceInstanceStatus } from '../device-instance/device-instance.service'
import { markGatewayTokenExpired } from '../../services/heartbeat.service'
import { redisClient } from '../../config/redis'

const RETRY_CONFIG = [
  { delay: 10000 },
  { delay: 30000 },
  { delay: 60000 }
]

// ============================================================
// 1. 网关基础流（心跳 + 配置监听 + MQTT broker 配置
//    网关级别，与设备实例无关！
// ============================================================

export const generateGatewayBaseFlow = (gateway: any): any => {
  const gwId = gateway.id.replace(/-/g, '')
  const interval = gateway.heartbeatInterval || 30
  const nodes: any[] = []
  let y = 40

  // 1) 心跳触发
  nodes.push({
    id: `hb-inject-${gwId}`,
    type: 'inject',
    z: '',
    name: '心跳触发',
    payload: '',
    payloadType: 'none',
    repeat: String(interval),
    crontab: '',
    once: true,
    onceDelay: 1,
    x: 120,
    y,
    wires: [[]]
  })
  y += 80

  // 2) 心跳组装（function）
  const gatewayInfo = JSON.stringify({
    id: gateway.id,
    name: gateway.name
  })
  nodes.push({
    id: `hb-func-${gwId}`,
    type: 'function',
    z: '',
    name: '组装心跳报文',
    func: `msg.payload = {
      gatewayId: ${gatewayInfo}.id,
      gatewayName: ${gatewayInfo}.name,
      timestamp: Date.now(),
      status: 'online',
      nodeRedVersion: (global.get('nodeVersion') || '3.1.0',
      uptimeSec: Math.floor(process.uptime())
    }
    return msg;`,
    outputs: 1,
    noerr: 0,
    initialize: '',
    finalize: '',
    libs: [],
    x: 350,
    y,
    wires: [[]]
  })
  y += 80

  // 3) 心跳上报（mqtt out）
  nodes.push({
    id: `hb-out-${gwId}`,
    type: 'mqtt out',
    z: '',
    name: '心跳上报',
    topic: `gateway/${gateway.id}/heartbeat`,
    qos: '1',
    retain: 'false',
    broker: `mqtt-broker-${gwId}`,
    x: 600,
    y,
    wires: []
  })
  y += 120

  // ========= 配置监听（接收平台下发配置）=========
  nodes.push({
    id: `cfg-in-${gwId}`,
    type: 'mqtt in',
    z: '',
    name: '配置下发监听',
    topic: `gateway/${gateway.id}/config`,
    qos: '2',
    datatype: 'json',
    broker: `mqtt-broker-${gwId}`,
    x: 120,
    y,
    wires: [[]]
  })
  y += 80

  nodes.push({
    id: `cfg-httpreq-${gwId}`,
    type: 'http request',
    z: '',
    name: 'POST /flows',
    method: 'POST',
    ret: 'obj',
    url: 'http://127.0.0.1:1880/flows',
    timeout: '30',
    headers: {},
    x: 350,
    y,
    wires: [[]]
  })
  y += 80

  nodes.push({
    id: `cfg-result-${gwId}`,
    type: 'mqtt out',
    z: '',
    name: '下发结果回传',
    topic: `gateway/${gateway.id}/config/result`,
    qos: '1',
    retain: 'false',
    broker: `mqtt-broker-${gwId}`,
    x: 600,
    y,
    wires: []
  })

  // ========= 接线
  nodes[0].wires = [[nodes[1].id]] // inject → function
  nodes[1].wires = [[nodes[2].id]] // function → mqtt out (heartbeat)
  nodes[3].wires = [[nodes[4].id]] // mqtt in (config) → http request
  nodes[4].wires = [[nodes[5].id]] // http request → mqtt out (result)

  // ========= MQTT broker 配置节点（所有节点共享）
  const brokerConfig = {
    id: `mqtt-broker-${gwId}`,
    type: 'mqtt-broker',
    name: 'EMQX Broker',
    broker: process.env.MQTT_HOST || 'emqx',
    port: parseInt(process.env.MQTT_PORT || '1883'),
    clientid: `nodered-gw-${gwId}`,
    autoConnect: true,
    usetls: false,
    usews: false,
    protocolVersion: '4',
    keepalive: '60',
    cleanness: true,
    reconnectPeriod: '15000',
    sessionExpiry: '3600'
  }

  return [...nodes, brokerConfig]
}

// ============================================================
// 2. 设备实例采集流（每次下发追加到网关）
// ============================================================

export const generateDeviceFlowNodes = (instance: any): any[] => {
  const model = instance.model
  const protocol = (model?.protocol || 's7').toLowerCase()
  const points = model?.points || []
  const customPoints = instance.config?.customPoints || []
  const allPoints = [...points, ...customPoints]

  const baseId = instance.id.replace(/-/g, '')
  const nodes: any[] = []
  let y = 400

  // ---------- 数据上报（mqtt out）
  const mqttOutNode = {
    id: `${baseId}-mqtt-out`,
    type: 'mqtt out',
    z: '',
    name: `${instance.name}数据上报',
    topic: `devices/${instance.id}/data`,
    qos: '0',
    retain: 'false',
    broker: `mqtt-broker-${instance.gatewayId?.replace(/-/g, '')}`,
    x: 900,
    y,
    wires: []
  }
  nodes.push(mqttOutNode)
  y += 80

  // ---------- 调试节点
  const debugNode = {
    id: `${baseId}-debug`,
    type: 'debug',
    z: '',
    active: true,
    console: 'false',
    complete: 'payload',
    targetType: 'msg',
    status: '',
    x: 900,
    y,
    wires: []
  }
  nodes.push(debugNode)
  y += 80

  // ---------- 协议采集节点（根据协议类型选择不同类型）
  let protocolNodeIds: string[] = []

  if (protocol === 's7') {
    const intervalNode = {
      id: `${baseId}-interval`,
      type: 'inject',
      z: '',
      name: `${instance.name}采集周期`,
      payload: '',
      payloadType: 'none',
      repeat: '1',
      crontab: '',
      once: false,
      onceDelay: 0.1,
      x: 100,
      y,
      wires: [[]]
    }
    nodes.push(intervalNode)
    y += 80

    const s7Node = {
      id: `${baseId}-s7`,
      type: 'S7 in',
      z: '',
      name: `${instance.name}`,
      endpoint: `endpoint-${baseId}`,
      address: instance.config?.deviceAddress || '',
      mode: 'single',
      x: 350,
      y,
      wires: [[mqttOutNode.id, debugNode.id]]
    }
    nodes.push(s7Node)
    protocolNodeIds = [intervalNode.id]
    intervalNode.wires = [[s7Node.id]]
  } else if (protocol === 'modbus') {
    const intervalNode = {
      id: `${baseId}-interval`,
      type: 'inject',
      z: '',
      name: `${instance.name}采集周期`,
      payload: '',
      payloadType: 'none',
      repeat: '1',
      crontab: '',
      once: false,
      onceDelay: 0.1,
      x: 100,
      y,
      wires: [[]]
    }
    nodes.push(intervalNode)
    y += 80

    const modbusNode = {
      id: `${baseId}-modbus`,
      type: 'modbus-read',
      z: '',
      name: `${instance.name}`,
      server: `server-${baseId}`,
      dataType: 'Coils',
      address: '0',
      quantity: allPoints.length.toString(),
      rate: '1',
      x: 350,
      y,
      wires: [[mqttOutNode.id, debugNode.id]]
    }
    nodes.push(modbusNode)
    protocolNodeIds = [intervalNode.id]
    intervalNode.wires = [[modbusNode.id]]
  } else if (protocol === 'opcua') {
    const intervalNode = {
      id: `${baseId}-interval`,
      type: 'inject',
      z: '',
      name: `${instance.name}采集周期`,
      payload: '',
      payloadType: 'none',
      repeat: '1',
      crontab: '',
      once: false,
      onceDelay: 0.1,
      x: 100,
      y,
      wires: [[]]
    }
    nodes.push(intervalNode)
    y += 80

    const opcuaNode = {
      id: `${baseId}-opcua`,
      type: 'OpcUa-Client',
      z: '',
      name: `${instance.name}`,
      endpoint: `endpoint-${baseId}`,
      securityPolicy: 'None',
      securityMode: 'None',
      x: 350,
      y,
      wires: [[mqttOutNode.id, debugNode.id]]
    }
    nodes.push(opcuaNode)
    protocolNodeIds = [intervalNode.id]
    intervalNode.wires = [[opcuaNode.id]]
  } else {
    const intervalNode = {
      id: `${baseId}-interval`,
      type: 'inject',
      z: '',
      name: `${instance.name}采集周期',
      payload: '',
      payloadType: 'none',
      repeat: '1',
      crontab: '',
      once: false,
      onceDelay: 0.1,
      x: 100,
      y,
      wires: [[]]
    }
    nodes.push(intervalNode)
    y += 80

    const httpNode = {
      id: `${baseId}-http`,
      type: 'http request',
      z: '',
      name: `${instance.name}`,
      method: 'GET',
      ret: 'obj',
      url: instance.config?.deviceAddress || '',
      x: 350,
      y,
      wires: [[mqttOutNode.id, debugNode.id]]
    }
    nodes.push(httpNode)
    protocolNodeIds = [intervalNode.id]
    intervalNode.wires = [[httpNode.id]]
  }

  return nodes
}

// ============================================================
// 3. 下发网关基础流（测试连接成功后调用
// ============================================================

export const deployGatewayBaseFlow = async (gateway: any): Promise<SyncRecord> => {
  const lockKey = `sync:dispatching:baseflow:${gateway.id}`
  const locked = await redisClient.set(lockKey, '1', { NX: true, EX: 60 })
  if (!locked) {
    throw new Error('基础流下进行中，请稍后再试')
  }

  try {
    const baseFlowNodes = generateGatewayBaseFlow(gateway)
    const nodeRedUrl = `http://${gateway.address}:${gateway.port}/flows`

    try {
      await axios.post(nodeRedUrl, baseFlowNodes, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      })

      return await repository.createSyncRecord({
        type: SyncType.DEPLOY,
        gatewayId: gateway.id,
        deviceInstanceId: null as any,
        status: SyncStatus.SUCCESS,
        message: '网关基础流下发成功',
        payload: { nodes: baseFlowNodes } as any
      })
    } catch (error: any) {
      if (error.response?.status === 401) {
        await markGatewayTokenExpired(gateway.id)
        throw new Error('网关 Token 已失效')
      }
      throw error
    }
  } finally {
    await redisClient.del(lockKey)
  }
}

// ============================================================
// 4. 下发设备实例配置（读当前flows + 追加设备节点 + POST全量更新）
// ============================================================

export const deployConfig = async (dto: DeployConfigDto): Promise<SyncRecord> => {
  const { deviceInstanceId, gatewayId } = dto

  const lockKey = `sync:dispatching:${deviceInstanceId}`
  const locked = await redisClient.set(lockKey, '1', { NX: true, EX: 60 })
  if (!locked) {
    throw new Error('下发进行中，请稍后再试')
  }

  try {
    const gateway = await getGatewayById(gatewayId)
    if (!gateway) throw new Error('网关不存在')
    if (gateway.status === GatewayStatus.OFFLINE) {
      throw new Error('网关离线，无法下发配置')
    }
    if (gateway.status === GatewayStatus.TOKEN_EXPIRED) {
      throw new Error('网关 Token 已失效，请更新后重试')
    }

    const instance = await getDeviceInstanceWithModel(deviceInstanceId)
    if (!instance) throw new Error('设备实例不存在')

    // 1) GET /flows — 读取当前 flows（含基础流 + 其他设备节点）
    const nodeRedUrl = `http://${gateway.address}:${gateway.port}/flows`
    let currentFlows: any[] = []
    try {
      const resp = await axios.get(nodeRedUrl, { timeout: 15000 })
      currentFlows = Array.isArray(resp.data) ? resp.data : []
    } catch (err: any) {
      // 如果 GET 失败（例如首次部署），当前为空流
      currentFlows = []
    }

    // 2) 如果没有基础流节点（网关 ID 前缀的节点），则先补基础流
    const gwId = gateway.id.replace(/-/g, '')
    const hasBaseFlow = currentFlows.some((n: any) => n.id?.includes(`hb-inject-${gwId}`))
    if (!hasBaseFlow) {
      const baseNodes = generateGatewayBaseFlow(gateway)
      currentFlows = [...currentFlows, ...baseNodes]
    }

    // 3) 移除该实例旧的采集节点（防止重复）
    const baseId = deviceInstanceId.replace(/-/g, '')
    currentFlows = currentFlows.filter((n: any) => !n.id?.startsWith(baseId))

    // 4) 追加新设备采集节点
    const newNodes = generateDeviceFlowNodes(instance)
    const finalFlows = [...currentFlows, ...newNodes]

    // 5) POST /flows 全量更新
    try {
      await axios.post(nodeRedUrl, finalFlows, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      })

      await updateDeviceInstanceStatus(deviceInstanceId, DeviceStatus.RUNNING)

      const record = await repository.createSyncRecord({
        type: SyncType.DEPLOY,
        gatewayId,
        deviceInstanceId,
        status: SyncStatus.SUCCESS,
        payload: finalFlows as any
      })

      return record
    } catch (error: any) {
      if (error.response?.status === 401) {
        await markGatewayTokenExpired(gatewayId)
        throw new Error('网关 Token 已失效')
      }
      return await handleDeployRetry(deviceInstanceId, gatewayId, finalFlows, error.message)
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

  const record = await repository.createSyncRecord({
    type: SyncType.DEPLOY,
    gatewayId,
    deviceInstanceId,
    status: SyncStatus.PENDING,
    message: `第${attempt}次重试等待中`,
    payload: flowConfig,
    retryCount: attempt
  })

  return record
}

export const undeployConfig = async (dto: { deviceInstanceId: string; gatewayId: string }): Promise<SyncRecord> => {
  const { deviceInstanceId, gatewayId } = dto

  const gateway = await getGatewayById(gatewayId)
  if (!gateway) throw new Error('网关不存在')

  const instance = await getDeviceInstanceById(deviceInstanceId)
  if (!instance) throw new Error('设备实例不存在')

  const nodeRedUrl = `http://${gateway.address}:${gateway.port}/flows`

  try {
    const response = await axios.get(nodeRedUrl, { timeout: 10000 })
    const currentFlows = response.data

    const baseId = deviceInstanceId.replace(/-/g, '')
    // 只删该设备的采集节点，保留基础流
    const filteredFlows = currentFlows.filter((node: any) => !node.id?.startsWith(baseId))

    await axios.post(nodeRedUrl, filteredFlows, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })

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
