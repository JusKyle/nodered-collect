import { useEffect, useState } from 'react'
import { useGatewayStore } from '../../stores/gateway.store'
import { useDeviceModelStore } from '../../stores/device-model.store'
import { batchCreateDevices } from '../../api/device-instance.api'
import { showToast } from '../../utils/toast'

interface DeviceInstanceBatchModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

function DeviceInstanceBatchModal({ isOpen, onClose, onSuccess }: DeviceInstanceBatchModalProps) {
  const [gatewayId, setGatewayId] = useState('')
  const [modelId, setModelId] = useState('')
  const [count, setCount] = useState(5)
  const [namePrefix, setNamePrefix] = useState('设备')
  const [startIndex, setStartIndex] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { gateways, fetchGateways } = useGatewayStore()
  const { deviceModels, fetchDeviceModels } = useDeviceModelStore()

  useEffect(() => {
    if (isOpen) {
      fetchGateways()
      fetchDeviceModels()
    }
  }, [isOpen, fetchGateways, fetchDeviceModels])

  const handleClose = () => {
    setGatewayId('')
    setModelId('')
    setCount(5)
    setNamePrefix('设备')
    setStartIndex(1)
    setIsSubmitting(false)
    onClose()
  }

  const handleSubmit = async () => {
    if (!gatewayId) {
      showToast('请选择所属网关', 'error')
      return
    }
    if (!modelId) {
      showToast('请选择设备模型', 'error')
      return
    }
    if (!namePrefix.trim()) {
      showToast('请输入名称前缀', 'error')
      return
    }
    if (count < 1 || count > 100) {
      showToast('数量必须在1-100之间', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await batchCreateDevices({
        gatewayId,
        modelId,
        count,
        namePrefix: namePrefix.trim(),
        startIndex
      })
      showToast(`成功创建 ${result.successCount} 个设备`, 'success')
      onSuccess?.()
      handleClose()
    } catch (error: any) {
      showToast(error.response?.data?.message || '批量创建设备失败', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 预览名称
  const previewNames = Array.from({ length: Math.min(count, 5) }, (_, i) =>
    `${namePrefix}-${startIndex + i}`
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">批量创建设备</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">数量 *</label>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">1-100</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名称前缀 *</label>
              <input
                type="text"
                value={namePrefix}
                onChange={(e) => setNamePrefix(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="如：设备"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">起始编号</label>
              <input
                type="number"
                min={1}
                value={startIndex}
                onChange={(e) => setStartIndex(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 预览 */}
          {namePrefix && count > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">名称预览：</p>
              <div className="text-sm text-gray-700 space-y-0.5">
                {previewNames.map((name, i) => (
                  <div key={i}>{name}</div>
                ))}
                {count > 5 && (
                  <div className="text-gray-400">... 共 {count} 个</div>
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
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '创建中...' : `创建 ${count} 个设备`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeviceInstanceBatchModal
