import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDeviceModelStore } from '../../stores/device-model.store'

interface DeviceModelCreateModalProps {
  isOpen: boolean
  onClose: () => void
}

const PROTOCOLS = [
  { label: 'Modbus TCP', value: 'MODBUS_TCP' },
  { label: 'Modbus RTU', value: 'MODBUS_RTU' },
  { label: 'S7', value: 'S7' },
  { label: 'OPC UA', value: 'OPC_UA' },
  { label: 'MQTT', value: 'MQTT' },
  { label: 'TCP', value: 'TCP' },
]

const schema = z.object({
  modelDI: z.string().min(1, '请输入模型ID').max(50, '模型ID不能超过50个字符').regex(/^\w+$/, '模型ID只能包含字母、数字和下划线'),
  name: z.string().min(1, '请输入模型名称').max(100, '模型名称不能超过100个字符'),
  protocol: z.string().min(1, '请选择协议类型'),
  description: z.string().max(500, '备注不能超过500个字符').optional(),
})

type FormData = z.infer<typeof schema>

function DeviceModelCreateModal({ isOpen, onClose }: DeviceModelCreateModalProps) {
  const { createDeviceModel, fetchDeviceModels } = useDeviceModelStore()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      modelDI: '',
      name: '',
      protocol: '',
      description: '',
    },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (data: FormData) => {
    try {
      await createDeviceModel({
        modelDI: data.modelDI,
        name: data.name,
        protocol: data.protocol,
        description: data.description || undefined,
      })
      await fetchDeviceModels()
      handleClose()
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setError('modelDI', { message: '模型ID已存在' })
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">新建设备模板</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">模型ID <span className="text-red-500">*</span></label>
            <input
              {...register('modelDI')}
              type="text"
              className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.modelDI ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="输入模型ID"
            />
            {errors.modelDI && <p className="mt-1 text-sm text-red-500">{errors.modelDI.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">模型名称 <span className="text-red-500">*</span></label>
            <input
              {...register('name')}
              type="text"
              className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="输入模型名称"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">协议类型 <span className="text-red-500">*</span></label>
            <select
              {...register('protocol')}
              className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.protocol ? 'border-red-500' : 'border-gray-200'}`}
            >
              <option value="">请选择协议类型</option>
              {PROTOCOLS.map((protocol) => (
                <option key={protocol.value} value={protocol.value}>{protocol.label}</option>
              ))}
            </select>
            {errors.protocol && <p className="mt-1 text-sm text-red-500">{errors.protocol.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
            <textarea
              {...register('description')}
              className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.description ? 'border-red-500' : 'border-gray-200'}`}
              rows={3}
              placeholder="输入备注信息"
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
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
