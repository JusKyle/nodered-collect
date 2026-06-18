import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDeviceInstanceStore } from '../../stores/device-instance.store'
import { useGatewayStore } from '../../stores/gateway.store'
import { useDeviceModelStore } from '../../stores/device-model.store'
import type { DeviceModel, Point } from '../../types'

interface DeviceInstanceCreateModalProps {
  isOpen: boolean
  onClose: () => void
}

const schema = z.object({
  name: z
    .string()
    .min(1, '请输入实例名称')
    .max(50, '实例名称不能超过50个字符'),
  gatewayId: z
    .string()
    .min(1, '请选择所属网关'),
  modelId: z
    .string()
    .min(1, '请选择设备模型'),
  description: z.string().max(200, '描述不能超过200个字符').optional(),
})

type FormData = z.infer<typeof schema>

function DeviceInstanceCreateModal({ isOpen, onClose }: DeviceInstanceCreateModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      gatewayId: '',
      modelId: '',
      description: '',
    },
  })

  const { createDeviceInstance, fetchDeviceInstances } = useDeviceInstanceStore()
  const { gateways, fetchGateways } = useGatewayStore()
  const { deviceModels, fetchDeviceModels } = useDeviceModelStore()

  const selectedModelId = watch('modelId')
  const selectedModel: DeviceModel | undefined = deviceModels.find(m => m.id === selectedModelId)

  useEffect(() => {
    if (isOpen) {
      fetchGateways()
      fetchDeviceModels()
    }
  }, [isOpen, fetchGateways, fetchDeviceModels])

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (data: FormData) => {
    try {
      await createDeviceInstance({
        name: data.name,
        modelId: data.modelId,
        gatewayId: data.gatewayId,
        nodeId: `node-${Date.now()}`,
        config: {},
      })
      await fetchDeviceInstances()
      handleClose()
    } catch (error: any) {
      console.error('创建设备实例失败:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">新建设备实例</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">实例名称 *</label>
            <input
              {...register('name')}
              type="text"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="请输入实例名称"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所属网关 *</label>
            <select
              {...register('gatewayId')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.gatewayId ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">请选择所属网关</option>
              {gateways.map((gateway) => (
                <option key={gateway.id} value={gateway.id}>
                  {gateway.name}
                </option>
              ))}
            </select>
            {errors.gatewayId && <p className="mt-1 text-sm text-red-500">{errors.gatewayId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">设备模型 *</label>
            <select
              {...register('modelId')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.modelId ? 'border-red-500' : 'border-gray-300'}`}
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
            {errors.modelId && <p className="mt-1 text-sm text-red-500">{errors.modelId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              {...register('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              placeholder="请输入描述（可选）"
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>}
          </div>

          {selectedModel && selectedModel.points && selectedModel.points.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">点位预览</label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">地址</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">单位</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedModel.points.map((point: Point, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{point.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{point.address}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{point.type}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{point.unit || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DeviceInstanceCreateModal
