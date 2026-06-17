import { useEffect, useState, useRef } from 'react'
import { useDeviceInstanceStore } from '../../stores/device-instance.store'
import { useGatewayStore } from '../../stores/gateway.store'
import { useDeviceModelStore } from '../../stores/device-model.store'

interface DeviceInstanceBatchModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface ParsedDevice {
  index: number
  name: string
  address: string
  status: 'success' | 'error'
  errorMessage?: string
}

type Phase = 'input' | 'preview'

function DeviceInstanceBatchModal({ isOpen, onClose, onSuccess }: DeviceInstanceBatchModalProps) {
  const [phase, setPhase] = useState<Phase>('input')
  const [gatewayId, setGatewayId] = useState('')
  const [modelId, setModelId] = useState('')
  const [deviceListText, setDeviceListText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { batchCreateDeviceInstances, fetchDeviceInstances } = useDeviceInstanceStore()
  const { gateways, fetchGateways } = useGatewayStore()
  const { deviceModels, fetchDeviceModels } = useDeviceModelStore()

  const [parsedDevices, setParsedDevices] = useState<ParsedDevice[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchGateways()
      fetchDeviceModels()
    }
  }, [isOpen, fetchGateways, fetchDeviceModels])

  const handleClose = () => {
    setPhase('input')
    setGatewayId('')
    setModelId('')
    setDeviceListText('')
    setParsedDevices([])
    setIsSubmitting(false)
    onClose()
  }

  const parseDeviceList = (text: string): ParsedDevice[] => {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '')
    return lines.map((line, index) => {
      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return {
          index: index + 1,
          name: parts[0],
          address: parts[1],
          status: 'success' as const
        }
      } else {
        return {
          index: index + 1,
          name: parts[0] || '-',
          address: parts.slice(1).join(',') || '-',
          status: 'error' as const,
          errorMessage: '格式错误：应为"名称,地址"格式'
        }
      }
    })
  }

  const parseCSVFile = (content: string): ParsedDevice[] => {
    const lines = content.split('\n').filter(line => line.trim() !== '')
    if (lines.length > 0 && lines[0].toLowerCase().includes('name') && lines[0].toLowerCase().includes('address')) {
      lines.shift()
    }
    return lines.map((line, index) => {
      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return {
          index: index + 1,
          name: parts[0],
          address: parts[1],
          status: 'success' as const
        }
      } else {
        return {
          index: index + 1,
          name: parts[0] || '-',
          address: parts.slice(1).join(',') || '-',
          status: 'error' as const,
          errorMessage: '格式错误：应为"名称,地址"格式'
        }
      }
    })
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const parsed = parseCSVFile(content)
      setParsedDevices(parsed)
      setDeviceListText('')
    }
    reader.readAsText(file)
  }

  const handlePreview = () => {
    if (!gatewayId) {
      alert('请选择所属网关')
      return
    }
    if (!modelId) {
      alert('请选择设备模型')
      return
    }
    if (!deviceListText.trim()) {
      alert('请输入设备列表或上传文件')
      return
    }
    const parsed = parseDeviceList(deviceListText)
    setParsedDevices(parsed)
    setPhase('preview')
  }

  const handleBack = () => {
    setPhase('input')
  }

  const handleSubmit = async () => {
    const successDevices = parsedDevices.filter(d => d.status === 'success')
    if (successDevices.length === 0) {
      alert('没有可创建设备')
      return
    }

    setIsSubmitting(true)
    try {
      await batchCreateDeviceInstances({
        instances: successDevices.map(device => ({
          name: device.name,
          modelId: modelId,
          gatewayId: gatewayId,
          nodeId: `node-${Date.now()}-${device.index}`,
          config: {}
        }))
      })
      await fetchDeviceInstances()
      onSuccess?.()
      handleClose()
    } catch (error: any) {
      console.error('批量创建设备实例失败:', error)
      alert('批量创建设备实例失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const successCount = parsedDevices.filter(d => d.status === 'success').length
  const errorCount = parsedDevices.filter(d => d.status === 'error').length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {phase === 'input' ? '批量新建设备实例' : '预览确认'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {phase === 'input' ? (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所属网关 *</label>
              <select
                value={gatewayId}
                onChange={(e) => setGatewayId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">请选择所属网关</option>
                {gateways.map((gateway) => (
                  <option key={gateway.id} value={gateway.id}>
                    {gateway.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">设备模型 *</label>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">请选择设备模型</option>
                {deviceModels
                  .filter((model) => (model as any).status === 'ENABLED' || (model as any).enabled === true)
                  .map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                设备列表 *（格式：名称,地址，每行一个）
              </label>
              <textarea
                value={deviceListText}
                onChange={(e) => {
                  setDeviceListText(e.target.value)
                  setParsedDevices([])
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={8}
                placeholder={"例如：\n192.168.1.100,PLC_001\n192.168.1.101,PLC_002"}
              />
            </div>

            <div className="flex items-center justify-center text-gray-500 my-2">
              <span className="border-b w-full max-w-xs"></span>
              <span className="px-4 text-sm">或</span>
              <span className="border-b w-full max-w-xs"></span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">上传文件（CSV/Excel）</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-gray-500">点击上传 CSV 或 Excel 文件</span>
              </button>
            </div>

            {parsedDevices.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">文件预览</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">序号</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">地址</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedDevices.slice(0, 5).map((device) => (
                        <tr key={device.index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{device.index}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{device.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{device.address}</td>
                          <td className="px-4 py-2 text-sm">
                            {device.status === 'success' ? (
                              <span className="text-green-600">成功</span>
                            ) : (
                              <span className="text-red-600">格式错误</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedDevices.length > 5 && (
                    <div className="px-4 py-2 text-sm text-gray-500 text-center bg-gray-50">
                      还有 {parsedDevices.length - 5} 条数据...
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handlePreview}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                预览
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-4 mb-4">
              <span className="text-sm text-gray-600">
                网关：{gateways.find(g => g.id === gatewayId)?.name || '-'}
              </span>
              <span className="text-sm text-gray-600">
                模型：{deviceModels.find(m => m.id === modelId)?.name || '-'}
              </span>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">序号</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">地址</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedDevices.map((device) => (
                    <tr key={device.index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{device.index}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{device.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{device.address}</td>
                      <td className="px-4 py-2 text-sm">
                        {device.status === 'success' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            成功
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {device.errorMessage}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-green-600">
                  成功：{successCount}
                </span>
                <span className="text-sm text-red-600">
                  失败：{errorCount}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  返回修改
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || successCount === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DeviceInstanceBatchModal
