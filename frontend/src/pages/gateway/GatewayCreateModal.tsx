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
    .min(1, '请输入地址')
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">激活网关</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">网关名称 *</label>
            <input
              {...register('name')}
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="请输入网关名称"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">网关地址 *</label>
            <input
              {...register('address')}
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm ${errors.address ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="请输入 IP 地址或域名"
            />
            {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">端口 *</label>
            <input
              {...register('port', { valueAsNumber: true })}
              type="number"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm ${errors.port ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="请输入端口号"
            />
            {errors.port && <p className="mt-1 text-xs text-red-500">{errors.port.message}</p>}
          </div>

          <p className="text-xs text-gray-500">
            系统将自动生成 Admin Token 并下发心跳流，网关激活后将自动开始上报心跳。
          </p>

          {errorMsg && (
            <div className="p-3 rounded-lg text-sm bg-red-50 text-red-600">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '激活中...' : '确认激活'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GatewayCreateModal
