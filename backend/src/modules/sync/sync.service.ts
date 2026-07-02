import axios from 'axios'
import { SyncRecord, SyncType, SyncStatus, GatewayStatus, DeviceStatus } from '@prisma/client'
import { prisma } from '../../config/db'
import * as repository from './sync.repository'
import { CreateSyncRecordDto, DeployConfigDto } from './sync.dto'
import { getGatewayById } from '../gateway/gateway.service'
import { getDeviceInstanceById, updateDeviceInstanceStatus } from '../device-instance/device-instance.service'
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
  const protocol = (model?.protocol || 'S7').toUpperCase()
  const points = model?.points || []
  const customPoints = instance.config?.customPoints || []
  const allPoints = [...points, ...customPoints]
  const commConfig = instance.commConfig || {}

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

  const buildPointMapCode = (): string => {
    const pointEntries = allPoints.map((p: any) => {
      const tag = p.tag || p.code || p.id
      return `"${tag}": { name: "${p.name || tag}", dataType: "${p.dataType || 'FLOAT32'}", unit: "${p.unit || ''}" }`
    }).join(',\n    ')
    return `const pointMap = {\n    ${pointEntries}\n  };\n  return pointMap;`
  }

  if (protocol === 'MODBUS_TCP' || protocol === 'MODBUS_RTU') {
    const modbusClientId = 'modbus-client-' + baseId
    const modbusReadId = baseId + '-modbus-read'
    const parseFuncId = baseId + '-parse-func'

    const isTcp = protocol === 'MODBUS_TCP'
    nodes.push({
      id: modbusClientId,
      type: 'modbus-client',
      name: '',
      clienttype: isTcp ? 'tcp' : 'serial',
      bufferCommands: true,
      stateLogEnabled: false,
      queueLogEnabled: false,
      failureLogEnabled: true,
      tcpHost: commConfig.ip || '127.0.0.1',
      tcpPort: commConfig.port || 502,
      tcpType: 'DEFAULT',
      serialPort: '/dev/ttyUSB',
      serialType: 'RTU-BUFFERD',
      serialBaudrate: 9600,
      serialDatabits: 8,
      serialStopbits: 1,
      serialParity: 'none',
      serialConnectionDelay: 100,
      serialAsciiResponseStartDelimiter: '0x3A',
      unit_id: commConfig.slaveId || 1,
      commandDelay: 1,
      clientTimeout: 1000,
      reconnectOnTimeout: true,
      reconnectTimeout: 2000,
      parallelUnitIdsAllowed: true,
      showErrors: false,
      showWarnings: true,
      showLogs: true,
    })

    const holdingRegisters = allPoints.filter((p: any) => {
      const regType = p.config?.registerType || p.registerType || 'Holding'
      return regType === 'Holding' || regType === 'holding'
    })
    const inputRegisters = allPoints.filter((p: any) => {
      const regType = p.config?.registerType || p.registerType || 'Holding'
      return regType === 'Input' || regType === 'input'
    })
    const coils = allPoints.filter((p: any) => {
      const regType = p.config?.registerType || p.registerType || 'Holding'
      return regType === 'Coil' || regType === 'coil'
    })
    const discreteInputs = allPoints.filter((p: any) => {
      const regType = p.config?.registerType || p.registerType || 'Holding'
      return regType === 'Discrete' || regType === 'discrete'
    })

    const primaryList = holdingRegisters.length > 0 ? holdingRegisters
      : inputRegisters.length > 0 ? inputRegisters
      : coils.length > 0 ? coils
      : discreteInputs.length > 0 ? discreteInputs
      : allPoints

    const fc = holdingRegisters.length > 0 ? 'FC3'
      : inputRegisters.length > 0 ? 'FC4'
      : coils.length > 0 ? 'FC1'
      : discreteInputs.length > 0 ? 'FC2'
      : 'FC3'

    const firstAddr = primaryList[0]?.config?.startAddress
      ?? primaryList[0]?.address
      ?? 0
    const quantity = primaryList.length > 0 ? primaryList.length : 10

    nodes.push({
      id: modbusReadId,
      type: 'modbus-read',
      z: flowId,
      name: 'modbus-read',
      topic: '',
      showStatusActivities: true,
      logIOActivities: false,
      showErrors: true,
      showWarnings: true,
      server: modbusClientId,
      unitid: String(commConfig.slaveId || 1),
      dataType: 'HoldingRegister',
      adr: String(firstAddr),
      quantity: String(quantity),
      rate: '1000',
      rateUnit: 'ms',
      delayOnStart: false,
      enableDeformedMessages: false,
      startDelayTime: '2',
      useIOFile: false,
      ioFile: '',
      useIOForPayload: false,
      emptyMsgOnFail: false,
      x: 350,
      y,
      wires: [[]]
    })
    y += 80

    const mapCode = buildPointMapCode()
    const parseCode = `
const pointMap = global.get('pointMap_${baseId}') || (() => {
  ${mapCode.replace(/^ {2}/m, '')}
})();
const values = msg.payload || [];
const result = { deviceId: "${instance.id}", timestamp: Date.now(), values: {} };
const points = Object.entries(pointMap);
points.forEach(([tag, info], idx) => {
  const rawVal = values[idx] ?? 0;
  let val = rawVal;
  if (info.dataType === 'FLOAT32' || info.dataType === 'FLOAT64') {
    val = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal) || 0;
  } else if (info.dataType === 'BOOL') {
    val = rawVal ? 1 : 0;
  } else {
    val = parseInt(rawVal) || 0;
  }
  result.values[tag] = { value: val, quality: 0, timestamp: result.timestamp };
});
msg.payload = JSON.stringify(result);
return msg;
`

    nodes.push({
      id: parseFuncId,
      type: 'function',
      z: flowId,
      name: 'parse-data',
      func: parseCode,
      outputs: 1,
      noerr: 0,
      initialize: '',
      finalize: '',
      libs: [],
      x: 620,
      y,
      wires: [[mqttOutId, debugId]]
    })

    const intervalId = baseId + '-interval'
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
      wires: [[modbusReadId]]
    })
    y += 80

    const modbusNode = nodes.find((n) => n.id === modbusReadId)
    if (modbusNode) {
      modbusNode.wires = [[parseFuncId]]
    }
  } else if (protocol === 'S7') {
    const s7EndpointId = 's7-endpoint-' + baseId
    const s7InId = baseId + '-s7-in'
    const parseFuncId = baseId + '-parse-func'

    nodes.push({
      id: s7EndpointId,
      type: 's7 endpoint',
      endpoint: commConfig.ip || '127.0.0.1',
      port: String(commConfig.port || 102),
      rack: '0',
      slot: '1',
      connType: 'PG',
      adapterName: '',
      vendorName: '',
      modelName: '',
      connectionTimeout: '1000',
      autoReconnect: true,
      reconnectInterval: '1000',
      keepAlive: true,
      keepAliveInterval: '3000',
      label: '',
    })

    const s7Vars = allPoints.map((p: any, idx: number) => ({
      name: p.tag || p.code || `var${idx}`,
      value: p.config?.address || p.address || 'DB1.DBD0',
    }))

    nodes.push({
      id: s7InId,
      type: 's7 in',
      z: flowId,
      name: 's7-read',
      endpoint: s7EndpointId,
      mode: 'all',
      variable: '',
      diff: false,
      x: 350,
      y,
      wires: [[]]
    })
    y += 80

    const mapCode = buildPointMapCode()
    const parseCode = `
const pointMap = global.get('pointMap_${baseId}') || (() => {
  ${mapCode.replace(/^ {2}/m, '')}
})();
const payload = msg.payload || {};
const result = { deviceId: "${instance.id}", timestamp: Date.now(), values: {} };
Object.entries(pointMap).forEach(([tag, info]) => {
  const rawVal = payload[tag];
  let val = rawVal;
  if (info.dataType === 'BOOL') {
    val = rawVal ? 1 : 0;
  } else if (info.dataType && info.dataType.startsWith('FLOAT')) {
    val = parseFloat(rawVal) || 0;
  } else {
    val = parseInt(rawVal) || 0;
  }
  result.values[tag] = { value: val, quality: 0, timestamp: result.timestamp };
});
msg.payload = JSON.stringify(result);
return msg;
`

    nodes.push({
      id: parseFuncId,
      type: 'function',
      z: flowId,
      name: 'parse-data',
      func: parseCode,
      outputs: 1,
      noerr: 0,
      initialize: '',
      finalize: '',
      libs: [],
      x: 620,
      y,
      wires: [[mqttOutId, debugId]]
    })

    const intervalId = baseId + '-interval'
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
      wires: [[s7InId]]
    })
    y += 80

    const s7Node = nodes.find((n) => n.id === s7InId)
    if (s7Node) {
      s7Node.wires = [[parseFuncId]]
    }
  } else if (protocol === 'OPC_UA') {
    const opcuaClientId = 'opcua-client-' + baseId
    const opcuaInId = baseId + '-opcua-in'
    const parseFuncId = baseId + '-parse-func'

    nodes.push({
      id: opcuaClientId,
      type: 'OpcUa-Client',
      endpoint: commConfig.endpoint || 'opc.tcp://localhost:4840',
      securityPolicy: 'None',
      securityMode: 'None',
      name: '',
    })

    nodes.push({
      id: opcuaInId,
      type: 'OpcUa-In',
      z: flowId,
      name: 'opcua-read',
      nodeId: allPoints.map((p: any) => p.config?.nodeId || p.nodeId || 'ns=2;s=var1').join(';'),
      timeFormat: '',
      valueFormat: '0',
      x: 350,
      y,
      wires: [[]]
    })
    y += 80

    const mapCode = buildPointMapCode()
    const parseCode = `
const pointMap = global.get('pointMap_${baseId}') || (() => {
  ${mapCode.replace(/^ {2}/m, '')}
})();
const payload = msg.payload;
const result = { deviceId: "${instance.id}", timestamp: Date.now(), values: {} };
const tags = Object.keys(pointMap);
const val = typeof payload === 'object' && payload !== null ? payload.value : payload;
if (tags.length > 0) {
  result.values[tags[0]] = { value: val ?? 0, quality: 0, timestamp: result.timestamp };
}
msg.payload = JSON.stringify(result);
return msg;
`

    nodes.push({
      id: parseFuncId,
      type: 'function',
      z: flowId,
      name: 'parse-data',
      func: parseCode,
      outputs: 1,
      noerr: 0,
      initialize: '',
      finalize: '',
      libs: [],
      x: 620,
      y,
      wires: [[mqttOutId, debugId]]
    })

    const intervalId = baseId + '-interval'
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
      wires: [[opcuaInId]]
    })
    y += 80

    const opcuaNode = nodes.find((n) => n.id === opcuaInId)
    if (opcuaNode) {
      opcuaNode.wires = [[parseFuncId]]
    }
  } else if (protocol === 'MQTT') {
    const mqttInId = baseId + '-mqtt-in'
    const parseFuncId = baseId + '-parse-func'
    const mqttBrokerId = 'device-mqtt-broker-' + baseId

    nodes.push({
      id: mqttBrokerId,
      type: 'mqtt-broker',
      broker: commConfig.broker || 'localhost',
      port: String(commConfig.port || 1883),
      clientid: '',
      autoConnect: true,
      usetls: false,
      usews: false,
      protocolVersion: '4',
      keepalive: '60',
      cleanness: true,
      reconnectPeriod: '15000',
      sessionExpiry: '3600',
    })

    nodes.push({
      id: mqttInId,
      type: 'mqtt in',
      z: flowId,
      name: 'device-mqtt-in',
      topic: commConfig.topic || 'device/data',
      qos: '0',
      datatype: 'json',
      broker: mqttBrokerId,
      nl: false,
      rap: false,
      rh: '0',
      inputs: 0,
      x: 350,
      y,
      wires: [[]]
    })
    y += 80

    const mapCode = buildPointMapCode()
    const parseCode = `
const pointMap = global.get('pointMap_${baseId}') || (() => {
  ${mapCode.replace(/^ {2}/m, '')}
})();
const payload = msg.payload || {};
const result = { deviceId: "${instance.id}", timestamp: Date.now(), values: {} };
Object.entries(pointMap).forEach(([tag, info]) => {
  const path = info.config?.fieldPath || tag;
  const segments = path.split('.');
  let rawVal = payload;
  for (const seg of segments) {
    if (rawVal == null) break;
    rawVal = rawVal[seg];
  }
  if (rawVal !== undefined) {
    let val = rawVal;
    if (info.dataType === 'BOOL') {
      val = rawVal ? 1 : 0;
    } else if (info.dataType && info.dataType.startsWith('FLOAT')) {
      val = parseFloat(rawVal) || 0;
    } else {
      val = parseInt(rawVal) || 0;
    }
    result.values[tag] = { value: val, quality: 0, timestamp: result.timestamp };
  }
});
msg.payload = JSON.stringify(result);
return msg;
`

    nodes.push({
      id: parseFuncId,
      type: 'function',
      z: flowId,
      name: 'parse-data',
      func: parseCode,
      outputs: 1,
      noerr: 0,
      initialize: '',
      finalize: '',
      libs: [],
      x: 620,
      y,
      wires: [[mqttOutId, debugId]]
    })

    const mqttInNode = nodes.find((n) => n.id === mqttInId)
    if (mqttInNode) {
      mqttInNode.wires = [[parseFuncId]]
    }
  } else if (protocol === 'TCP') {
    const tcpInId = baseId + '-tcp-in'
    const parseFuncId = baseId + '-parse-func'

    nodes.push({
      id: tcpInId,
      type: 'tcp in',
      z: flowId,
      name: 'tcp-in',
      server: commConfig.ip || '127.0.0.1',
      port: String(commConfig.port || 2000),
      datamode: 'stream',
      datatype: 'buffer',
      newline: '',
      topic: 'tcp-data',
      base: '10',
      x: 350,
      y,
      wires: [[]]
    })
    y += 80

    const mapCode = buildPointMapCode()
    const parseCode = `
const pointMap = global.get('pointMap_${baseId}') || (() => {
  ${mapCode.replace(/^ {2}/m, '')}
})();
const payload = msg.payload || '';
const result = { deviceId: "${instance.id}", timestamp: Date.now(), values: {} };
const rawStr = typeof payload === 'string' ? payload : payload.toString ? payload.toString() : '';
const keyValPattern = /([a-zA-Z_][a-zA-Z0-9_]*)\\s*[:=]\\s*([-+]?[\\d.]+)/g;
let match;
const parsed = {};
while ((match = keyValPattern.exec(rawStr)) !== null) {
  parsed[match[1]] = parseFloat(match[2]);
}
Object.entries(pointMap).forEach(([tag, info]) => {
  const rawVal = parsed[tag];
  if (rawVal !== undefined) {
    let val = rawVal;
    if (info.dataType === 'BOOL') {
      val = rawVal ? 1 : 0;
    } else if (info.dataType && info.dataType.startsWith('FLOAT')) {
      val = parseFloat(rawVal) || 0;
    } else {
      val = parseInt(rawVal) || 0;
    }
    result.values[tag] = { value: val, quality: 0, timestamp: result.timestamp };
  }
});
msg.payload = JSON.stringify(result);
return msg;
`

    nodes.push({
      id: parseFuncId,
      type: 'function',
      z: flowId,
      name: 'parse-data',
      func: parseCode,
      outputs: 1,
      noerr: 0,
      initialize: '',
      finalize: '',
      libs: [],
      x: 620,
      y,
      wires: [[mqttOutId, debugId]]
    })

    const tcpNode = nodes.find((n) => n.id === tcpInId)
    if (tcpNode) {
      tcpNode.wires = [[parseFuncId]]
    }
  } else {
    const httpNodeId = baseId + '-http'
    const parseFuncId = baseId + '-parse-func'

    nodes.push({
      id: httpNodeId,
      type: 'http request',
      z: flowId,
      name: 'http-read',
      method: 'GET',
      ret: 'obj',
      url: commConfig.url || 'http://localhost/data',
      x: 350,
      y,
      wires: [[]]
    })
    y += 80

    const mapCode = buildPointMapCode()
    const parseCode = `
const pointMap = global.get('pointMap_${baseId}') || (() => {
  ${mapCode.replace(/^ {2}/m, '')}
})();
const payload = msg.payload || {};
const result = { deviceId: "${instance.id}", timestamp: Date.now(), values: {} };
Object.entries(pointMap).forEach(([tag, info]) => {
  const rawVal = payload[tag];
  if (rawVal !== undefined) {
    let val = rawVal;
    if (info.dataType === 'BOOL') {
      val = rawVal ? 1 : 0;
    } else if (info.dataType && info.dataType.startsWith('FLOAT')) {
      val = parseFloat(rawVal) || 0;
    } else {
      val = parseInt(rawVal) || 0;
    }
    result.values[tag] = { value: val, quality: 0, timestamp: result.timestamp };
  }
});
msg.payload = JSON.stringify(result);
return msg;
`

    nodes.push({
      id: parseFuncId,
      type: 'function',
      z: flowId,
      name: 'parse-data',
      func: parseCode,
      outputs: 1,
      noerr: 0,
      initialize: '',
      finalize: '',
      libs: [],
      x: 620,
      y,
      wires: [[mqttOutId, debugId]]
    })

    const intervalId = baseId + '-interval'
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
      wires: [[httpNodeId]]
    })
    y += 80

    const httpNode = nodes.find((n) => n.id === httpNodeId)
    if (httpNode) {
      httpNode.wires = [[parseFuncId]]
    }
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
    const gwId = gateway.id.replace(/-/g, '')

    let currentFlows: any[] = []
    let currentEtag = ''
    try {
      const resp = await axios.get(nodeRedUrl, { timeout: 15000 })
      currentFlows = Array.isArray(resp.data) ? resp.data : []
      currentEtag = resp.headers['etag'] || ''
    } catch (err: any) {
      if (err.response?.status === 401) {
        await markGatewayTokenExpired(gateway.id)
        throw new Error('网关 Token 已失效')
      }
      currentFlows = []
    }

    currentFlows = currentFlows.filter((n: any) => !n.id?.includes('hb-inject-' + gwId) && !n.id?.includes('hb-func-' + gwId) && !n.id?.includes('hb-out-' + gwId) && !(n.id === 'gateway-flow-' + gwId) && !(n.id === 'mqtt-broker-' + gwId))

    const finalFlows = [...currentFlows, ...baseFlowNodes]

    try {
      const postHeaders: any = { 'Content-Type': 'application/json' }
      if (currentEtag) {
        postHeaders['If-Match'] = currentEtag
      }
      await axios.post(nodeRedUrl, finalFlows, {
        headers: postHeaders,
        timeout: 30000
      })

      return await repository.createSyncRecord({
        type: SyncType.DEPLOY,
        gatewayId: gateway.id,
        deviceInstanceId: null as any,
        status: SyncStatus.SUCCESS,
        message: '网关基础流下发成功',
        payload: { nodes: finalFlows } as any
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
    let currentEtag = ''
    try {
      const resp = await axios.get(nodeRedUrl, { timeout: 15000 })
      currentFlows = Array.isArray(resp.data) ? resp.data : []
      currentEtag = resp.headers['etag'] || ''
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
    currentFlows = currentFlows.filter((n: any) => !n.id?.includes(baseId))

    const newNodes = generateDeviceFlowNodes(instance)
    const finalFlows = [...currentFlows, ...newNodes]

    try {
      const postHeaders: any = { 'Content-Type': 'application/json' }
      if (currentEtag) {
        postHeaders['If-Match'] = currentEtag
      }
      await axios.post(nodeRedUrl, finalFlows, {
        headers: postHeaders,
        timeout: 30000
      })

      await updateDeviceInstanceStatus(deviceInstanceId, DeviceStatus.COLLECTING, new Date())

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
      if (error.response?.status === 409) {
        return await handleDeployRetry(deviceInstanceId, gatewayId, finalFlows, '版本冲突，重试中')
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
    await updateDeviceInstanceStatus(deviceInstanceId, DeviceStatus.OFFLINE)
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
    const currentEtag = response.headers['etag'] || ''
    const baseId = deviceInstanceId.replace(/-/g, '')
    const filteredFlows = currentFlows.filter((node: any) => !node.id?.includes(baseId))

    const postHeaders: any = { 'Content-Type': 'application/json' }
    if (currentEtag) {
      postHeaders['If-Match'] = currentEtag
    }
    await axios.post(nodeRedUrl, filteredFlows, {
      headers: postHeaders,
      timeout: 10000
    })

    await updateDeviceInstanceStatus(deviceInstanceId, DeviceStatus.OFFLINE)

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
