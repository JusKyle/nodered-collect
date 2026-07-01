import { generateDeviceFlowNodes, generateGatewayBaseFlow } from './sync.service'

const assertNodesHaveValidFlowId = (nodes: any[]) => {
  const tabIds = new Set(nodes.filter((node) => node.type === 'tab').map((node) => node.id))
  expect(tabIds.size).toBeGreaterThan(0)

  nodes
    .filter((node) => node.type !== 'tab' && !node.type?.endsWith?.('broker'))
    .forEach((node) => {
      expect(node.z).toBeTruthy()
      expect(tabIds.has(node.z)).toBe(true)
    })
}

describe('Node-RED flow 生成', () => {
  it('网关基础流的所有节点都有有效流 ID', () => {
    const nodes = generateGatewayBaseFlow({
      id: 'gateway-1',
      name: '测试网关',
      address: '127.0.0.1',
      heartbeatInterval: 30
    })

    assertNodesHaveValidFlowId(nodes)
  })

  it('设备采集流的所有节点都有有效流 ID', () => {
    const nodes = generateDeviceFlowNodes({
      id: 'device-1',
      name: '测试设备',
      gatewayId: 'gateway-1',
      config: { deviceAddress: 'http://127.0.0.1' },
      model: { protocol: 'HTTP', points: [] }
    })

    assertNodesHaveValidFlowId(nodes)
  })
})
