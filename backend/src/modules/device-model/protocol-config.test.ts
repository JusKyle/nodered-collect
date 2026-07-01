import { validateProtocolConfig } from './protocol-config'

describe('协议点位配置校验', () => {
  it('校验 Modbus TCP 配置', () => {
    expect(validateProtocolConfig('MODBUS_TCP', { slaveId: 1, registerType: 'Holding', startAddress: 0, quantity: 1, byteOrder: 'BE' })).toEqual([])
    expect(validateProtocolConfig('MODBUS_TCP', { slaveId: 300, registerType: 'Holding', startAddress: 0 })).toContain('slaveId must be between 1 and 247')
  })

  it('校验 Modbus RTU 配置', () => {
    expect(validateProtocolConfig('MODBUS_RTU', { slaveId: 2, registerType: 'Input', startAddress: 10 })).toEqual([])
  })

  it('校验 S7 配置', () => {
    expect(validateProtocolConfig('S7', { dbBlock: 1, byteOffset: 0, bitOffset: 0 })).toEqual([])
    expect(validateProtocolConfig('S7', { dbBlock: 1, byteOffset: 0, bitOffset: 9 })).toContain('bitOffset must be between 0 and 7')
  })

  it('校验 OPC UA 配置', () => {
    expect(validateProtocolConfig('OPC_UA', { namespaceIndex: 2, nodeId: 'ns=2;s=Temperature' })).toEqual([])
  })

  it('校验 MQTT 配置', () => {
    expect(validateProtocolConfig('MQTT', { jsonPath: '$.data.temperature' })).toEqual([])
  })

  it('校验 TCP 配置', () => {
    expect(validateProtocolConfig('TCP', { parseRule: 'temperature=(\\d+)' })).toEqual([])
  })
})
