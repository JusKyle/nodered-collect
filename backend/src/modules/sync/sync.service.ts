import axios from 'axios'
import { SyncRecord, SyncType, SyncStatus, GatewayStatus, DeviceStatus } from '@prisma/client'
import { prisma } from '../../config/db'
import * as repository from './sync.repository'
import { CreateSyncRecordDto, DeployConfigDto } from './sync.dto'
import { getGatewayById } from '../gateway/gateway.service'
import { getDeviceInstanceById, updateDeviceInstance } from '../device-instance/device-instance.service'
import { markGatewayTokenExpired } from '../../services/heartbeat.service'
import { getRedisClient } from '../../config/redis'

const getClient = () => getRedisClient()

export const generateGatewayBaseFlow = (gateway: any): any => {
  const gwId = gateway.id.replace(/-/g, '')
  const interval = gateway.heartbeatInterval || 30
  const flowId = `gateway-flow-${gwId}`
  const nodes: any[] = [
    {
      id: flowId,
      type: 'tab',
      label: `Gateway ${gateway.name || gateway.id}`,
      disabled: false,
      info: ''
    }
  ]
  let y = 40

  const heartbeatInjectId = `hb-inject-${gwId}`
  const heartbeatFuncId = `hb-func-${gwId}`
  const heartbeatOutId = `hb-out-${gwId}`
  const configInId = `cfg-in-${gwId}`
  const configHttpId = `cfg-httpreq-${gwId}`
  const configResultId = `cfg-result-${gwId}`
  const brokerId = `mqtt-broker-${gwId}`

  const gatewayInfo = JSON.stringify({
    id: gateway.id,
    name: gateway.name,
    nodeRedVersion: gateway.nodeRedVersion || null,
    ip: gateway.ip || gateway.address,
    flowCount: nodes.length + 1
  })
  const nodeRedMqttHost = process.env.NODE_RED_MQTT_HOST || 'emqx'
  const nodeRedMqttPort = parseInt(process.env.NODE_RED_MQTT_PORT || process.env.MQTT_PORT || '1883')

  nodes.push({
    id: heartbeatInjectId,
    type: 'inject',
    z: flowId,
    name: 'heartbeat-trigger',
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

  const heartbeatFunc = `
const gateway = ${gatewayInfo};

// 从 global context 获取 os/fs 模块（需在 Node-RED settings.js 中配置 functionGlobalContext）
const os = global.get('os');
const fs = global.get('fs');

// 默认值
let cpuUsage = null;
let memoryUsage = null;
let diskUsage = null;
let diskFreeBytes = null;

// 如果 os 模块可用，计算 CPU 和内存使用率
if (os) {
  try {
    // CPU 使用率
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    for (let i = 0; i < cpus.length; i++) {
      const t = cpus[i].times;
      user += t.user;
      nice += t.nice;
      sys += t.sys;
      idle += t.idle;
      irq += t.irq;
    }
    const total = user + nice + sys + idle + irq;
    if (total > 0) {
      cpuUsage = Math.round(((total - idle) / total) * 100 * 10) / 10;
    }
    
    // 内存使用率
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    if (totalMem > 0) {
      memoryUsage = Math.round(((totalMem - freeMem) / totalMem) * 100 * 10) / 10;
    }
  } catch (e) {}
  
  // 磁盘使用率（需要 fs 模块）
  if (fs) {
    try {
      let diskPath = '/';
      if (os.platform && os.platform() === 'win32') {
        diskPath = 'C:\\\\';
      }
      if (fs.statfsSync) {
        const stat = fs.statfsSync(diskPath);
        const totalDisk = stat.blocks * stat.bsize;
        const freeDisk = stat.bfree * stat.bsize;
        if (totalDisk > 0) {
          diskUsage = Math.round(((totalDisk - freeDisk) / totalDisk) * 100 * 10) / 10;
          diskFreeBytes = freeDisk;
        }
      }
    } catch (e) {}
  }
}

msg.payload = {
  gatewayId: gateway.id,
  timestamp: Date.now(),
  status: 'online',
  nodeRedVersion: gateway.nodeRedVersion,
  ip: gateway.ip,
  flowCount: gateway.flowCount,
  cpuUsage: cpuUsage,
  memoryUsage: memoryUsage,
  diskUsage: diskUsage,
  diskFreeBytes: diskFreeBytes
};
return msg;
`.trim()

  nodes.push({
    id: heartbeatFuncId,
    type: 'function',
    z: flowId,
    name: 'assemble-heartbeat',
    func: heartbeatFunc,
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

  nodes.push({
    id: heartbeatOutId,
    type: 'mqtt out',
    z: flowId,
    name: 'heartbeat-out',
    topic: 'gateway/' + gateway.id + '/heartbeat',
    qos: '1',
    retain: 'false',
    broker: brokerId,
    x: 600,
    y,
    wires: []
  })
  y += 120

  nodes.push({
    id: configInId,
    type: 'mqtt in',
    z: flowId,
    name: 'config-listener',
    topic: 'gateway/' + gateway.id + '/config',
    qos: '2',
    datatype: 'json',
    broker: brokerId,
    x: 120,
    y,
    wires: [[]]
  })
  y += 80

  nodes.push({
    id: configHttpId,
    type: 'http request',
    z: flowId,
    name: 'deploy-flows',
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
    id: configResultId,
    type: 'mqtt out',
    z: flowId,
    name: 'deploy-result',
    topic: 'gateway/' + gateway.id + '/config/result',
    qos: '1',
    retain: 'false',
    broker: brokerId,
    x: 600,
    y,
    wires: []
  })

  nodes.find((node) => node.id === heartbeatInjectId).wires = [[heartbeatFuncId]]
  nodes.find((node) => node.id === heartbeatFuncId).wires = [[heartbeatOutId]]
  nodes.find((node) => node.id === configInId).wires = [[configHttpId]]
  nodes.find((node) => node.id === configHttpId).wires = [[configResultId]]

  const brokerConfig = {
    id: brokerId,
    type: 'mqtt-broker',
    name: 'EMQX Broker',
    broker: nodeRedMqttHost,
    port: nodeRedMqttPort,
    clientid: 'nodered-gw-' + gwId,
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

export const generateDeviceFlowNodes = (instance: any): any[] => {
  const model = instance.model
  const protocol = (model?.protocol || 's7').toLowerCase()
  const points = model?.points || []
  const customPoints = instance.config?.customPoints || []
  const allPoints = [...points, ...customPoints]

  const baseId = instance.id.replace(/-/g, '')
  const flowId = `device-flow-${baseId}`
  const nodes: any[] = [
    {
      id: flowId,
      type: 'tab',
      label: `Device ${instance.name || instance.id}`,
      disabled: false,
      info: ''
    }
  ]
  let y = 400

  const mqttOutId = baseId + '-mqtt-out'
  const debugId = baseId + '-debug'
  const intervalId = baseId + '-interval'
  const brokerId = 'mqtt-broker-' + (instance.gatewayId || '').replace(/-/g, '')

  nodes.push({
    id: mqttOutId,
    type: 'mqtt out',
    z: flowId,
    name: 'data-report',
    topic: 'devices/' + instance.id + '/data',
    qos: '0',
    retain: 'false',
    broker: brokerId,
    x: 900,
    y,
    wires: []
  })
  y += 80

  nodes.push({
    id: debugId,
    type: 'debug',
    z: flowId,
    active: true,
    console: 'false',
    complete: 'payload',
    targetType: 'msg',
    status: '',
    x: 900,
    y,
    wires: []
  })
  y += 80

  nodes.push({
    id: intervalId,
    type: 'inject',
    z: flowId,
    name: 'collect-trigger',
    payload: '',
    payloadType: 'none',
    repeat: '1',
    crontab: '',
    once: false,
    onceDelay: 0.1,
    x: 100,
    y,
    wires: [[]]
  })
  y += 80

  let protocolOutIds: string[] = []

  if (protocol === 's7') {
    const s7NodeId = baseId + '-s7'
    nodes.push({
      id: s7NodeId,
      type: 'S7 in',
      z: flowId,
      name: 's7-read',
      endpoint: 'endpoint-' + baseId,
      address: instance.config?.deviceAddress || '',
      mode: 'single',
      x: 350,
      y,
      wires: [[mqttOutId, debugId]]
    })
    protocolOutIds = [intervalId]
    nodes.find((node) => node.id === intervalId).wires = [[s7NodeId]]
  } else if (protocol === 'modbus') {
    const modbusNodeId = baseId + '-modbus'
    nodes.push({
      id: modbusNodeId,
      type: 'modbus-read',
      z: flowId,
      name: 'modbus-read',
      server: 'server-' + baseId,
      dataType: 'Coils',
      address: '0',
      quantity: String(allPoints.length || 10),
      rate: '1',
      x: 350,
      y,
      wires: [[mqttOutId, debugId]]
    })
    protocolOutIds = [intervalId]
    nodes.find((node) => node.id === intervalId).wires = [[modbusNodeId]]
  } else if (protocol === 'opcua') {
    const opcuaNodeId = baseId + '-opcua'
    nodes.push({
      id: opcuaNodeId,
      type: 'OpcUa-Client',
      z: flowId,
      name: 'opcua-read',
      endpoint: 'endpoint-' + baseId,
      securityPolicy: 'None',
      securityMode: 'None',
      x: 350,
      y,
      wires: [[mqttOutId, debugId]]
    })
    protocolOutIds = [intervalId]
    nodes.find((node) => node.id === intervalId).wires = [[opcuaNodeId]]
  } else {
    const httpNodeId = baseId + '-http'
    nodes.push({
      id: httpNodeId,
      type: 'http request',
      z: flowId,
      name: 'http-read',
      method: 'GET',
      ret: 'obj',
      url: instance.config?.deviceAddress || '',
      x: 350,
      y,
      wires: [[mqttOutId, debugId]]
    })
    protocolOutIds = [intervalId]
    nodes.find((node) => node.id === intervalId).wires = [[httpNodeId]]
  }

  return nodes
}

export const deployGatewayBaseFlow = async (gateway: any): Promise<SyncRecord> => {
  const lockKey = 'sync:dispatching:baseflow:' + gateway.id
  const client = getClient()
  const locked = await client.set(lockKey, '1', { NX: true, EX: 60 })
  if (!locked) {
    throw new Error('基础流下发进行中，请稍后再试')
  }

  try {
    const baseFlowNodes = generateGatewayBaseFlow(gateway)
    const nodeRedUrl = 'http://' + gateway.address + ':' + gateway.port + '/flows'

    try {
      await axios.post(nodeRedUrl, baseFlowNodes, {
        headers: { 'Content-Type': 'application/json' },
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
    await client.del(lockKey)
  }
}

export const deployConfig = async (dto: DeployConfigDto): Promise<SyncRecord> => {
  const { deviceInstanceId, gatewayId } = dto

  const lockKey = 'sync:dispatching:' + deviceInstanceId
  const client = getClient()
  const locked = await client.set(lockKey, '1', { NX: true, EX: 60 })
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

    const instance = await prisma.deviceInstance.findUnique({
      where: { id: deviceInstanceId },
      include: { model: true }
    })
    if (!instance) throw new Error('设备实例不存在')

    const modelPoints: any[] = (instance.model.points as any) || []
    const customPoints: any[] = ((instance.config as any)?.customPoints) || []
    const allPoints = [...modelPoints, ...customPoints]

    const nodeRedUrl = 'http://' + gateway.address + ':' + gateway.port + '/flows'

    let currentFlows: any[] = []
    try {
      const resp = await axios.get(nodeRedUrl, { timeout: 15000 })
      currentFlows = Array.isArray(resp.data) ? resp.data : []
    } catch (err: any) {
      if (err.response?.status === 401) {
        await markGatewayTokenExpired(gatewayId)
        throw new Error('网关 Token 已失效')
      }
      currentFlows = []
    }

    const gwId = gateway.id.replace(/-/g, '')
    const hasBaseFlow = currentFlows.some((n: any) => n.id?.includes('hb-inject-' + gwId))
    if (!hasBaseFlow) {
      const baseNodes = generateGatewayBaseFlow(gateway)
      currentFlows = [...currentFlows, ...baseNodes]
    }

    const baseId = deviceInstanceId.replace(/-/g, '')
    currentFlows = currentFlows.filter((n: any) => !n.id?.startsWith(baseId))

    const newNodes = generateDeviceFlowNodes(instance)
    const finalFlows = [...currentFlows, ...newNodes]

    try {
      await axios.post(nodeRedUrl, finalFlows, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      })

      await updateDeviceInstance(deviceInstanceId, { status: DeviceStatus.RUNNING })

      return await repository.createSyncRecord({
        type: SyncType.DEPLOY,
        gatewayId,
        deviceInstanceId,
        status: SyncStatus.SUCCESS,
        payload: finalFlows as any
      })
    } catch (error: any) {
      if (error.response?.status === 401) {
        await markGatewayTokenExpired(gatewayId)
        throw new Error('网关 Token 已失效')
      }
      return await handleDeployRetry(deviceInstanceId, gatewayId, finalFlows, error.message)
    }
  } finally {
    await client.del(lockKey)
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
    await updateDeviceInstance(deviceInstanceId, { status: DeviceStatus.PENDING_SYNC })
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

  return repository.createSyncRecord({
    type: SyncType.DEPLOY,
    gatewayId,
    deviceInstanceId,
    status: SyncStatus.PENDING,
    message: '第' + attempt + '次重试等待中',
    payload: flowConfig,
    retryCount: attempt
  })
}

export const undeployConfig = async (dto: { deviceInstanceId: string; gatewayId: string }): Promise<SyncRecord> => {
  const { deviceInstanceId, gatewayId } = dto

  const gateway = await getGatewayById(gatewayId)
  if (!gateway) throw new Error('网关不存在')

  const nodeRedUrl = 'http://' + gateway.address + ':' + gateway.port + '/flows'

  try {
    const response = await axios.get(nodeRedUrl, { timeout: 10000 })
    const currentFlows = response.data
    const baseId = deviceInstanceId.replace(/-/g, '')
    const filteredFlows = currentFlows.filter((node: any) => !node.id?.startsWith(baseId))

    await axios.post(nodeRedUrl, filteredFlows, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    })

    await updateDeviceInstance(deviceInstanceId, { status: DeviceStatus.PENDING_SYNC })

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

export const getSyncRecords = async (params: {
  gatewayId?: string
  status?: string
  type?: string
  startDate?: string
  endDate?: string
  page: number
  pageSize: number
}) => {
  return repository.getSyncRecordsPaginated({
    gatewayId: params.gatewayId,
    status: params.status as SyncStatus | undefined,
    type: params.type as SyncType | undefined,
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
    page: params.page,
    pageSize: params.pageSize
  })
}

export const getSyncRecordDetail = async (id: string): Promise<SyncRecord | null> => {
  return repository.getSyncRecordById(id)
}
