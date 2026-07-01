export type ProtocolType = 'MODBUS_TCP' | 'MODBUS_RTU' | 'S7' | 'OPC_UA' | 'MQTT' | 'TCP'

const isNumber = (value: unknown) => typeof value === 'number' && !Number.isNaN(value)
const isNonEmptyString = (value: unknown) => typeof value === 'string' && value.trim().length > 0

export const validateProtocolConfig = (protocol: ProtocolType | string, config: Record<string, any>): string[] => {
  const errors: string[] = []

  if (protocol === 'MODBUS_TCP' || protocol === 'MODBUS_RTU') {
    if (!isNumber(config.slaveId) || config.slaveId < 1 || config.slaveId > 247) {
      errors.push('slaveId must be between 1 and 247')
    }
    if (!['Coil', 'Holding', 'Input', 'Discrete'].includes(config.registerType)) {
      errors.push('registerType is invalid')
    }
    if (!isNumber(config.startAddress) || config.startAddress < 0) {
      errors.push('startAddress must be greater than or equal to 0')
    }
    if (config.quantity !== undefined && (!isNumber(config.quantity) || config.quantity < 1)) {
      errors.push('quantity must be greater than 0')
    }
    return errors
  }

  if (protocol === 'S7') {
    if (!isNumber(config.dbBlock) || config.dbBlock < 1) {
      errors.push('dbBlock must be greater than 0')
    }
    if (!isNumber(config.byteOffset) || config.byteOffset < 0) {
      errors.push('byteOffset must be greater than or equal to 0')
    }
    if (config.bitOffset !== undefined && (!isNumber(config.bitOffset) || config.bitOffset < 0 || config.bitOffset > 7)) {
      errors.push('bitOffset must be between 0 and 7')
    }
    return errors
  }

  if (protocol === 'OPC_UA') {
    if (!isNumber(config.namespaceIndex) || config.namespaceIndex < 0) {
      errors.push('namespaceIndex must be greater than or equal to 0')
    }
    if (!isNonEmptyString(config.nodeId)) {
      errors.push('nodeId is required')
    }
    return errors
  }

  if (protocol === 'MQTT') {
    if (!isNonEmptyString(config.jsonPath)) {
      errors.push('jsonPath is required')
    }
    return errors
  }

  if (protocol === 'TCP') {
    if (!isNonEmptyString(config.parseRule)) {
      errors.push('parseRule is required')
    }
    return errors
  }

  errors.push('protocol is unsupported')
  return errors
}
