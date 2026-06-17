import { DeviceManagerNode } from './nodes/device-manager/device-manager'
import { DeviceInstanceNode } from './nodes/device-instance/device-instance'
import { DataOutputNode } from './nodes/data-output/data-output'

module.exports = function (RED: any) {
  RED.nodes.registerType('device-manager', DeviceManagerNode)
  RED.nodes.registerType('device-instance', DeviceInstanceNode)
  RED.nodes.registerType('data-output', DataOutputNode)
}