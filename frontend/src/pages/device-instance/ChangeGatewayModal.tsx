import { useEffect, useState } from 'react'
import { useGatewayStore } from '../../stores/gateway.store'
import { changeGateway as changeGatewayApi } from '../../api/device-instance.api'
import { showToast } from '../../utils/toast'
import type { DeviceInstanceListItem } from '../../api/device-instance.api'

interface ChangeGatewayModalProps {
  isOpen: boolean
  onClose: () => void
  instance: DeviceInstanceListItem | null
  onSuccess: () => void
}

function ChangeGatewayModal({ isOpen, onClose, instance, onSuccess }: ChangeGatewayModalProps) {
  const { gateways, fetchGateways } = useGatewayStore()
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchGateways()
      setSelectedGatewayId(instance?.gatewayId || '')
    }
  }, [isOpen, instance, fetchGateways])

  const handleClose = () => {
    setSelectedGatewayId('')
    onClose()
  }

  const handleConfirm = async () => {
    if (!instance || !selectedGatewayId) return
    setIsSubmitting(true)
    try {
      await changeGatewayApi(instance.id, selectedGatewayId)
      showToast('变更网关成功', 'success')
      handleClose()
      onSuccess()
    } catch (error: any) {
      showToast(error.response?.data?.message || '变更失败', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !instance) return null

  const availableGateways = gateways.filter(g => g.id !== instance.gatewayId)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">变更网关</h3>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <p className="text-sm text-yellow-800">
            <i className="fas fa-exclamation-triangle mr-1.5"></i>
            变更网关后，如需在新网关上运行，请手动执行"下发配置"
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">当前网关</label>
            <input
              type="text"
              value={instance.gatewayName || '未分配'}
              disabled
              className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">选择新网关 <span className="text-red-500">*</span></label>
            <select
              value={selectedGatewayId}
              onChange={(e) => setSelectedGatewayId(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">请选择网关</option>
              {availableGateways.map(gateway => (
                <option key={gateway.id} value={gateway.id}>
                  {gateway.name} ({gateway.address}:{gateway.port})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={handleClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">取消</button>
          <button onClick={handleConfirm} disabled={!selectedGatewayId || isSubmitting} className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium disabled:opacity-50">
            {isSubmitting ? '保存中...' : '确认'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChangeGatewayModal