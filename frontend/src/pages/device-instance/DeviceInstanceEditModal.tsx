import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDeviceInstanceStore } from '../../stores/device-instance.store'
import type { DeviceInstance, Point } from '../../types'

interface DeviceInstanceEditModalProps {
  isOpen: boolean
  onClose: () => void
  instance: DeviceInstance | null
  onSuccess: () => void
}

const RW_TYPES = ['只读', '只写', '读写'] as const
const DATA_TYPES = ['int', 'float', 'string', 'bool'] as const

const customPointSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  address: z.string(),
  type: z.string(),
  dataType: z.string(),
  unit: z.string(),
  description: z.string(),
})

const schema = z.object({
  name: z.string().min(1, '请输入名称'),
  nodeId: z.string().min(1, '请输入节点ID'),
  customPoints: z.array(customPointSchema),
})

type FormData = z.infer<typeof schema>

interface PointWithSource extends Point {
  source: 'inherited' | 'custom'
  id?: string
}

function DeviceInstanceEditModal({ isOpen, onClose, instance, onSuccess }: DeviceInstanceEditModalProps) {
  const { updateDeviceInstance, fetchDeviceInstances } = useDeviceInstanceStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      nodeId: '',
      customPoints: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'customPoints',
  })

  useEffect(() => {
    if (instance && isOpen) {
      const customPoints = (instance as any).customPoints || []
      reset({
        name: instance.name,
        nodeId: instance.nodeId,
        customPoints: customPoints.map((p: Point, i: number) => ({
          id: p.id || `temp-${i}`,
          name: p.name,
          code: p.code,
          address: p.address,
          type: p.type,
          dataType: p.dataType,
          unit: p.unit || '',
          description: p.description || '',
        })),
      })
    }
  }, [instance, isOpen, reset])

  const handleClose = () => {
    reset({
      name: '',
      nodeId: '',
      customPoints: [],
    })
    onClose()
  }

  const handleAddPoint = () => {
    append({
      id: `temp-${Date.now()}`,
      name: '',
      code: '',
      address: '',
      type: '只读',
      dataType: 'int',
      unit: '',
      description: '',
    })
  }

  const onSubmit = async (data: FormData) => {
    if (!instance) return

    const customPoints = data.customPoints.map((p) => ({
      name: p.name,
      code: p.code,
      address: p.address,
      type: p.type,
      dataType: p.dataType,
      unit: p.unit || undefined,
      description: p.description || undefined,
    }))

    try {
      await updateDeviceInstance(instance.id, {
        name: data.name,
        nodeId: data.nodeId,
        config: {
          ...instance.config,
          customPoints,
        },
      } as any)
      await fetchDeviceInstances()
      handleClose()
      onSuccess()
    } catch (error: any) {
      console.error('更新设备实例失败:', error)
    }
  }

  if (!isOpen || !instance) return null

  const inheritedPoints: PointWithSource[] = instance.model?.points?.map((p: Point) => ({
    ...p,
    source: 'inherited' as const,
  })) || []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">编辑设备实例 - {instance.name}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium text-gray-700">基本信息</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                <input
                  {...register('name')}
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="请输入名称"
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">节点ID *</label>
                <input
                  {...register('nodeId')}
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.nodeId ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="请输入节点ID"
                />
                {errors.nodeId && <p className="mt-1 text-sm text-red-500">{errors.nodeId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">设备模型</label>
                <input
                  type="text"
                  value={instance.model?.name || '-'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">网关</label>
                <input
                  type="text"
                  value={instance.gateway?.name || '-'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">继承点位（只读）</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {inheritedPoints.length} 个
              </span>
            </div>

            {inheritedPoints.length === 0 ? (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg text-sm">
                暂无继承点位
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">名称</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">编码</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">地址</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">读写类型</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">数据类型</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">单位</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider flex-1">描述</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inheritedPoints.map((point, index) => (
                      <tr key={index} className="bg-green-50">
                        <td className="px-3 py-2 text-sm text-gray-700">{point.name}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{point.code}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{point.address}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{point.type}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{point.dataType}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{point.unit || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{point.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">自定义点位（可编辑）</h3>
              <button
                type="button"
                onClick={handleAddPoint}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加点位
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                暂无自定义点位，点击"添加点位"按钮添加
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">名称</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">编码</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">地址</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">读写类型</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">数据类型</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">单位</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider flex-1">描述</th>
                      <th className="px-3 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {fields.map((field, index) => (
                      <tr key={field.id}>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            {...register(`customPoints.${index}.name`)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                            placeholder="名称"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            {...register(`customPoints.${index}.code`)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                            placeholder="编码"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            {...register(`customPoints.${index}.address`)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                            placeholder="地址"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            {...register(`customPoints.${index}.type`)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                          >
                            {RW_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            {...register(`customPoints.${index}.dataType`)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                          >
                            {DATA_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            {...register(`customPoints.${index}.unit`)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                            placeholder="单位"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            {...register(`customPoints.${index}.description`)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                            placeholder="描述"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end pt-4 border-t space-x-3">
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

export default DeviceInstanceEditModal
