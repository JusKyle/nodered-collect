import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDeviceModelStore } from '../../stores/device-model.store'

interface DeviceModelCreateModalProps {
  isOpen: boolean
  onClose: () => void
}

const PROTOCOLS = ['Modbus TCP', 'OPC UA', 'MQTT', 'HTTP', '自定义'] as const

const RW_TYPES = ['只读', '只写', '读写'] as const

const DATA_TYPES = ['int', 'float', 'string', 'bool'] as const

interface PointFormData {
  name: string
  code: string
  address: string
  rwType: string
  dataType: string
  unit: string
  description: string
}

const schema = z.object({
  name: z
    .string()
    .min(1, '请输入名称')
    .max(50, '名称不能超过50个字符'),
  vendor: z.string().min(1, '请输入厂商'),
  model: z.string().min(1, '请输入型号'),
  protocol: z.string().min(1, '请选择协议'),
  description: z.string().optional(),
  points: z.string(),
})

type FormData = z.infer<typeof schema>

function DeviceModelCreateModal({ isOpen, onClose }: DeviceModelCreateModalProps) {
  const { createDeviceModel, fetchDeviceModels } = useDeviceModelStore()
  const [pointList, setPointList] = useState<PointFormData[]>([])
  const [codeError, setCodeError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      vendor: '',
      model: '',
      protocol: '',
      description: '',
      points: '[]',
    },
  })

  useEffect(() => {
    setValue('points', JSON.stringify(pointList))
  }, [pointList, setValue])

  const validateCodes = (points: PointFormData[]): boolean => {
    const codes = points.map((p) => p.code.trim())
    const uniqueCodes = new Set(codes)
    if (codes.length !== uniqueCodes.size) {
      setCodeError('该编码已存在')
      return false
    }
    setCodeError(null)
    return true
  }

  const handleAddPoint = () => {
    const newPoint: PointFormData = {
      name: '',
      code: '',
      address: '',
      rwType: '只读',
      dataType: 'int',
      unit: '',
      description: '',
    }
    const updatedPoints = [...pointList, newPoint]
    setPointList(updatedPoints)
    validateCodes(updatedPoints)
  }

  const handleRemovePoint = (index: number) => {
    const updatedPoints = pointList.filter((_, i) => i !== index)
    setPointList(updatedPoints)
    validateCodes(updatedPoints)
  }

  const handlePointChange = (index: number, field: keyof PointFormData, value: string) => {
    const updatedPoints = pointList.map((point, i) =>
      i === index ? { ...point, [field]: value } : point
    )
    setPointList(updatedPoints)
    if (field === 'code') {
      validateCodes(updatedPoints)
    }
  }

  const handleClose = () => {
    reset()
    setPointList([])
    setCodeError(null)
    onClose()
  }

  const onSubmit = async (data: FormData) => {
    const points = JSON.parse(data.points) as PointFormData[]
    if (!validateCodes(points)) {
      return
    }

    try {
      await createDeviceModel({
        name: data.name,
        vendor: data.vendor,
        model: data.model,
        protocol: data.protocol,
        description: data.description || undefined,
        points: points.map((p) => ({
          name: p.name,
          code: p.code,
          address: p.address,
          type: p.rwType,
          dataType: p.dataType,
          unit: p.unit || undefined,
          description: p.description || undefined,
        })),
      })
      await fetchDeviceModels()
      handleClose()
    } catch (error: any) {
      console.error('创建设备模型失败:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">新建设备模型</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">厂商 *</label>
                <input
                  {...register('vendor')}
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.vendor ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="请输入厂商"
                />
                {errors.vendor && <p className="mt-1 text-sm text-red-500">{errors.vendor.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">型号 *</label>
                <input
                  {...register('model')}
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.model ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="请输入型号"
                />
                {errors.model && <p className="mt-1 text-sm text-red-500">{errors.model.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">协议 *</label>
                <select
                  {...register('protocol')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.protocol ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">请选择协议</option>
                  {PROTOCOLS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {errors.protocol && <p className="mt-1 text-sm text-red-500">{errors.protocol.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                {...register('description')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={2}
                placeholder="请输入描述（可选）"
              />
            </div>
          </div>

          <input type="hidden" {...register('points')} />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">点位列表</h3>
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

            {codeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {codeError}
              </div>
            )}

            {pointList.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                暂无点位，点击"添加点位"按钮添加
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
                    {pointList.map((point, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={point.name}
                            onChange={(e) => handlePointChange(index, 'name', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                            placeholder="名称"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={point.code}
                            onChange={(e) => handlePointChange(index, 'code', e.target.value)}
                            className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent ${pointList.filter(p => p.code === point.code).length > 1 ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="编码"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={point.address}
                            onChange={(e) => handlePointChange(index, 'address', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                            placeholder="地址"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={point.rwType}
                            onChange={(e) => handlePointChange(index, 'rwType', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                          >
                            {RW_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={point.dataType}
                            onChange={(e) => handlePointChange(index, 'dataType', e.target.value)}
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
                            value={point.unit}
                            onChange={(e) => handlePointChange(index, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                            placeholder="单位"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={point.description}
                            onChange={(e) => handlePointChange(index, 'description', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                            placeholder="描述"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleRemovePoint(index)}
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

export default DeviceModelCreateModal
