import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDeviceModelStore } from '../../stores/device-model.store'
import { createDeviceInstanceFull } from '../../api/device-instance.api'
import { showToast } from '../../utils/toast'

interface DeviceInstanceCreateModalProps {
  isOpen: boolean
  onClose: () => void
}

const schema = z.object({
  modelId: z.string().min(1, '请选择设备模板'),
  deviceId: z.string().max(100, '设备ID不能超过100字符').optional(),
  name: z.string().min(1, '请输入实例名称').max(100, '实例名称不能超过100字符'),
  group: z.string().max(50, '分组不能超过50字符').optional(),
})

type FormData = z.infer<typeof schema>

function DeviceInstanceCreateModal({ isOpen, onClose }: DeviceInstanceCreateModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { modelId: '', deviceId: '', name: '', group: '' },
  })

  const { deviceModels, fetchDeviceModels } = useDeviceModelStore()

  useEffect(() => {
    if (isOpen) fetchDeviceModels()
  }, [isOpen, fetchDeviceModels])

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (data: FormData) => {
    try {
      await createDeviceInstanceFull({
        name: data.name,
        modelId: data.modelId,
        deviceId: data.deviceId || undefined,
        group: data.group || undefined,
      })
      showToast('设备创建成功', 'success')
      handleClose()
    } catch (error: any) {
      showToast(error.response?.data?.message || '创建失败', 'error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[520px] overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">新增设备</h3>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">设备模板 <span className="text-red-500">*</span></label>
            <select {...register('modelId')} className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.modelId ? 'border-red-500' : ''}`}>
              <option value="">请选择设备模板</option>
              {deviceModels.filter(m => (m as any).status === 'ENABLED').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {errors.modelId && <p className="mt-1 text-sm text-red-500">{errors.modelId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">设备ID</label>
            <input {...register('deviceId')} type="text" placeholder="请输入设备ID（可选），最多100字符" className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.deviceId ? 'border-red-500' : ''}`} />
            {errors.deviceId && <p className="mt-1 text-sm text-red-500">{errors.deviceId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">实例名称 <span className="text-red-500">*</span></label>
            <input {...register('name')} type="text" placeholder="请输入实例名称，最多100字符" className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.name ? 'border-red-500' : ''}`} />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">分组</label>
            <input {...register('group')} type="text" placeholder="请输入分组名称（可选）" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            {errors.group && <p className="mt-1 text-sm text-red-500">{errors.group.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={handleClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">取消</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium disabled:opacity-50">{isSubmitting ? '保存中...' : '保存'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DeviceInstanceCreateModal