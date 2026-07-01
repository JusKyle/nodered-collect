import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useGatewayStore } from '../../stores/gateway.store'
import { showToast } from '../../utils/toast'

interface GatewayCreateModalProps {
  isOpen: boolean
  onClose: () => void
}

const schema = z.object({
  name: z
    .string()
    .min(1, '请输入网关名称')
    .max(50, '网关名称不能超过50个字符'),
  address: z
    .string()
    .min(1, '请输入IP地址')
    .regex(/^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, '请输入合法的 IP 或域名'),
  port: z
    .number()
    .min(1, '端口号需在 1-65535 之间')
    .max(65535, '端口号需在 1-65535 之间'),
})

type FormData = z.infer<typeof schema>

function GatewayCreateModal({ isOpen, onClose }: GatewayCreateModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      address: '',
      port: 1880,
    },
  })

  const { createGateway, fetchGateways } = useGatewayStore()
  const [errorMsg, setErrorMsg] = useState('')

  const handleClose = () => {
    reset()
    setErrorMsg('')
    onClose()
  }

  const onSubmit = async (data: FormData) => {
    setErrorMsg('')
    try {
      await createGateway({
        name: data.name,
        address: data.address,
        port: data.port,
      })
      await fetchGateways()
      showToast('网关激活成功', 'success')
      handleClose()
    } catch (error: any) {
      const code = error.response?.data?.code
      const message = error.response?.data?.message || '激活失败'
      if (code === 'GATEWAY_EXISTS') {
        setErrorMsg('该网关地址已存在')
      } else if (code === 'GATEWAY_UNREACHABLE') {
        setErrorMsg('网关地址不可达，请检查地址和端口是否正确')
      } else {
        setErrorMsg(message)
      }
      showToast(message, 'error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">新增网关</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              网关名称 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="请输入网关名称"
              maxLength={50}
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IP地址 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('address')}
              type="text"
              placeholder="请输入 IP 地址或域名"
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.address ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {errors.address && <p className="mt-1.5 text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              端口 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('port', { valueAsNumber: true })}
              type="number"
              min={1}
              max={65535}
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.port ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {errors.port && <p className="mt-1.5 text-xs text-red-500">{errors.port.message}</p>}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl text-sm bg-red-50 text-red-600 border border-red-100">
              {errorMsg}
            </div>
          )}

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 -mx-6 -mb-6 mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-indigo-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '激活中...' : '确认'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GatewayCreateModal
