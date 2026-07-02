import { useEffect, useState } from 'react'
import { useGatewayStore } from '../../stores/gateway.store'
import { changeGateway } from '../../api/device-instance.api'
import { showToast } from '../../utils/toast'
import type { DeviceInstanceListItem } from '../../api/device-instance.api'

interface AssignGatewayModalProps {
  isOpen: boolean
  onClose: () => void
  instance: DeviceInstanceListItem | null
  onSuccess: () => void
}

function AssignGatewayModal({ isOpen, onClose, instance, onSuccess }: AssignGatewayModalProps) {
  const { gateways, fetchGateways } = useGatewayStore()
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) { fetchGateways(); setSelectedGatewayId('') }
  }, [isOpen, fetchGateways])

  const handleClose = () => { setSelectedGatewayId(''); onClose() }

  const handleConfirm = async () => {
    if (!instance || !selectedGatewayId) return
    setIsSubmitting(true)
    try {
      await changeGateway(instance.id, selectedGatewayId)
      showToast('分配网关成功', 'success')
      handleClose()
      onSuccess()
    } catch (error: any) {
      showToast(error.response?.data?.message || '分配失败', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !instance) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">分配网关</h3>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">设备实例</label>
            <input type="text" value={instance.name} disabled className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">选择网关 <span className="text-red-500">*</span></label>
            <select value={selectedGatewayId} onChange={(e) => setSelectedGatewayId(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option value="">请选择网关</option>
              {gateways.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.address}:{g.port}) {g.status === 'ONLINE' ? ' [在线]' : ' [离线]'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={handleClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">取消</button>
          <button onClick={handleConfirm} disabled={!selectedGatewayId || isSubmitting} className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium disabled:opacity-50">{isSubmitting ? '保存中...' : '确认'}</button>
        </div>
      </div>
    </div>
  )
}

export default AssignGatewayModal