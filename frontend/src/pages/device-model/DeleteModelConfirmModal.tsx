import { useState, useEffect } from 'react'
import type { DeviceModel } from '../../types'
import { useDeviceModelStore } from '../../stores/device-model.store'
import { getDeviceModelUsage } from '../../api/device-model.api'

interface DeleteModelConfirmModalProps {
  isOpen: boolean
  model: DeviceModel | null
  onClose: () => void
  onDelete: () => void
}

function DeleteModelConfirmModal({ isOpen, model, onClose, onDelete }: DeleteModelConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [usage, setUsage] = useState<number | null>(null)
  const [isLoadingUsage, setIsLoadingUsage] = useState(false)
  const { deleteDeviceModel: deleteDeviceModelFromStore } = useDeviceModelStore()

  useEffect(() => {
    if (isOpen && model) {
      setIsLoadingUsage(true)
      setUsage(null)
      setIsDeleting(false)
      getDeviceModelUsage(model.id)
        .then((data) => setUsage(data.usage))
        .catch((error) => {
          console.error('获取模型使用情况失败:', error)
          setUsage(0)
        })
        .finally(() => setIsLoadingUsage(false))
    }
  }, [isOpen, model])

  if (!isOpen || !model) return null

  const handleDelete = async () => {
    if (usage && usage > 0) return
    setIsDeleting(true)
    try {
      await deleteDeviceModelFromStore(model.id)
      onDelete()
    } catch (error) {
      console.error('删除模型失败:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-2xl w-[420px] p-6">
        {isLoadingUsage ? (
          <div className="text-sm text-gray-500 text-center py-4">加载中...</div>
        ) : usage !== null && usage > 0 ? (
          <>
            <div className="text-base font-semibold text-gray-900 mb-2">
              确定删除模型「{model.name}」吗？
            </div>
            <div className="text-sm text-red-500 mb-6">
              该模型已被 {usage} 个设备实例使用，无法删除
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                disabled
                className="px-4 py-2 text-sm font-medium text-white bg-gray-400 rounded-lg cursor-not-allowed"
              >
                确定
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-base font-semibold text-gray-900 mb-2">
              确定删除模型「{model.name}」吗？
            </div>
            <div className="text-sm text-gray-500 mb-6">
              删除后无法恢复，请谨慎操作
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? '删除中...' : '确定删除'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DeleteModelConfirmModal
