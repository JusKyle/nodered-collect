import { useEffect, useState } from 'react'
import { useGatewayStore } from '../../stores/gateway.store'
import { useDeviceInstanceStore } from '../../stores/device-instance.store'
import type { DeviceInstance, Gateway } from '../../types'
import * as deviceInstanceApi from '../../api/device-instance.api'

interface ChangeGatewayModalProps {
  isOpen: boolean
  onClose: () => void
  instance: DeviceInstance | null
  onSuccess: () => void
}

function ChangeGatewayModal({ isOpen, onClose, instance, onSuccess }: ChangeGatewayModalProps) {
  const { gateways, fetchGateways } = useGatewayStore()
  const { fetchDeviceInstances } = useDeviceInstanceStore()
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchGateways()
      setSelectedGatewayId(instance?.gatewayId || '')
    }
  }, [isOpen, instance, fetchGateways])

  const handleClose = () => {
    setSelectedGatewayId(instance?.gatewayId || '')
    onClose()
  }

  const handleConfirm = async () => {
    if (!instance || !selectedGatewayId) return

    setIsSubmitting(true)
    try {
      await deviceInstanceApi.changeGateway(instance.id, selectedGatewayId)
      await fetchDeviceInstances()
      handleClose()
      onSuccess()
    } catch (error: any) {
      console.error('更改网关失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !instance) return null

  const availableGateways = gateways.filter((g: Gateway) => g.id !== instance.gatewayId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">更改网关</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <p className="text-sm text-yellow-800">
            更改网关后，如需在新网关上运行，请手动执行'下发配置'
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">当前网关</label>
            <input
              type="text"
              value={instance.gateway?.name || '-'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择新网关 *</label>
            <select
              value={selectedGatewayId}
              onChange={(e) => setSelectedGatewayId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">请选择网关</option>
              {availableGateways.map((gateway: Gateway) => (
                <option key={gateway.id} value={gateway.id}>
                  {gateway.name} ({gateway.address}:{gateway.port})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t bg-gray-50 space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedGatewayId || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '保存中...' : '确认'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChangeGatewayModal
