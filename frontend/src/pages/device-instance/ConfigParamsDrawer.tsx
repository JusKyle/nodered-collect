import { useEffect, useState } from 'react'
import { updateDeviceInstance } from '../../api/device-instance.api'
import { showToast } from '../../utils/toast'
import type { DeviceInstanceListItem } from '../../api/device-instance.api'

interface ConfigParamsDrawerProps {
  isOpen: boolean
  onClose: () => void
  instance: DeviceInstanceListItem | null
  onSuccess: () => void
}

function ConfigParamsDrawer({ isOpen, onClose, instance, onSuccess }: ConfigParamsDrawerProps) {
  const [ip, setIp] = useState('')
  const [port, setPort] = useState('')
  const [slaveId, setSlaveId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && instance) {
      const commConfig = instance.commConfig || {}
      setIp(commConfig.ip || '')
      setPort(commConfig.port?.toString() || '')
      setSlaveId(commConfig.slaveId?.toString() || '')
    }
  }, [isOpen, instance])

  const handleClose = () => {
    setIp(''); setPort(''); setSlaveId(''); onClose()
  }

  const handleSubmit = async () => {
    if (!instance) return
    setIsSubmitting(true)
    try {
      await updateDeviceInstance(instance.id, {
        commConfig: {
          ip,
          port: port ? Number(port) : undefined,
          slaveId: slaveId ? Number(slaveId) : undefined,
        }
      } as any)
      showToast('保存成功', 'success')
      handleClose()
      onSuccess()
    } catch (error: any) {
      showToast(error.response?.data?.message || '保存失败', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !instance) return null

  return (
    <div className={`fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">配置通信参数</h3>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">IP地址</label>
            <input type="text" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="例如: 192.168.1.100" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">端口</label>
            <input type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="例如: 502" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">从站地址</label>
            <input type="number" value={slaveId} onChange={(e) => setSlaveId(e.target.value)} placeholder="例如: 1" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={handleClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">取消</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium disabled:opacity-50">{isSubmitting ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  )
}

export default ConfigParamsDrawer