import { useState, useEffect } from 'react'
import { useDeviceModelStore } from '../../stores/device-model.store'
import * as deviceModelApi from '../../api/device-model.api'
import type { DeviceModel } from '../../types'

interface DeviceModelDuplicateModalProps {
  isOpen: boolean
  onClose: () => void
  model: DeviceModel | null
  onDuplicateSuccess: () => void
}

function DeviceModelDuplicateModal({
  isOpen,
  onClose,
  model,
  onDuplicateSuccess,
}: DeviceModelDuplicateModalProps) {
  const { fetchDeviceModels } = useDeviceModelStore()
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (model && isOpen) {
      setNewName(`${model.name}_副本`)
    }
  }, [model, isOpen])

  const handleClose = () => {
    setNewName('')
    setError(null)
    onClose()
  }

  const handleDuplicate = async () => {
    if (!model) return

    setLoading(true)
    setError(null)
    try {
      await deviceModelApi.duplicateDeviceModel(model.id, newName || undefined)
      await fetchDeviceModels()
      onDuplicateSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.message || '复制失败')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !model) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">复制模型</h2>
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
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">原模型信息</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">名称：</span>
                <span className="text-gray-900">{model.name}</span>
              </div>
              <div>
                <span className="text-gray-500">厂商：</span>
                <span className="text-gray-900">{model.vendor}</span>
              </div>
              <div>
                <span className="text-gray-500">模型ID：</span>
                <span className="text-gray-900">{model.modelDI || model.model}</span>
              </div>
              <div>
                <span className="text-gray-500">协议：</span>
                <span className="text-gray-900">{model.protocol}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">点位数量：</span>
                <span className="text-gray-900">{model.points?.length || 0} 个</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新名称
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="请输入新名称"
            />
            <p className="mt-1 text-xs text-gray-500">留空则使用默认名称</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleDuplicate}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '复制中...' : '确认复制'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeviceModelDuplicateModal