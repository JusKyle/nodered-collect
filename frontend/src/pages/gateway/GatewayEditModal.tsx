import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useGatewayStore } from '../../stores/gateway.store'
import { testConnection } from '../../api/gateway.api'
import type { Gateway } from '../../types'
import { showToast } from '../../utils/toast'

interface GatewayEditModalProps {
  isOpen: boolean
  onClose: () => void
  gateway: Gateway | null
  onSuccess?: () => void
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
  adminToken: z.string().min(1, '请输入 Admin Token'),
  description: z.string().max(200, '描述不能超过200个字符').optional(),
})

type FormData = z.infer<typeof schema>

function GatewayEditModal({ isOpen, onClose, gateway, onSuccess }: GatewayEditModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      address: '',
      port: 1880,
      adminToken: '',
      description: '',
    },
  })

  const { updateGateway, fetchGateways } = useGatewayStore()
  const [showToken, setShowToken] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [connectionMessage, setConnectionMessage] = useState('')

  useEffect(() => {
    if (gateway) {
      reset({
        name: gateway.name,
        address: gateway.address,
        port: gateway.port,
        adminToken: gateway.adminToken || '',
        description: (gateway as any).description || '',
      })
    }
  }, [gateway, reset])

  const handleClose = () => {
    reset()
    setConnectionStatus('idle')
    setConnectionMessage('')
    onClose()
  }

  const handleTestConnection = async () => {
    setConnectionStatus('testing')
    setConnectionMessage('')
    try {
      const address = watch('address')
      const port = watch('port')
      const adminToken = watch('adminToken')
      const result = await testConnection({
        address,
        port: port || 1880,
        adminToken,
      })
      if (result.allPassed) {
        setConnectionStatus('success')
        setConnectionMessage('连接成功')
      } else {
        setConnectionStatus('error')
        setConnectionMessage('连接失败')
      }
    } catch (error: any) {
      setConnectionStatus('error')
      setConnectionMessage(error.response?.data?.message || '无法连接到目标地址')
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!gateway) return
    try {
      await updateGateway(gateway.id, {
        name: data.name,
        address: data.address,
        port: data.port,
        adminToken: data.adminToken,
      })
      await fetchGateways()
      showToast('网关信息更新成功', 'success')
      onSuccess?.()
      handleClose()
    } catch (error: any) {
      showToast(error.response?.data?.message || '更新失败', 'error')
    }
  }

  if (!isOpen || !gateway) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[500px] overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">编辑网关</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <p className="text-sm text-yellow-700 flex items-center gap-2">
            <i className="fas fa-exclamation-triangle text-yellow-500"></i>
            修改 Token 后需要等待下次心跳或手动测试连接验证
          </p>
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
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
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
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.address ? 'border-red-500' : 'border-gray-200'}`}
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
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.port ? 'border-red-500' : 'border-gray-200'}`}
            />
            {errors.port && <p className="mt-1.5 text-xs text-red-500">{errors.port.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Token <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                {...register('adminToken')}
                type={showToken ? 'text' : 'password'}
                placeholder="请输入 Admin Token"
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10 ${errors.adminToken ? 'border-red-500' : 'border-gray-200'}`}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className={`fas ${showToken ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            {errors.adminToken && <p className="mt-1.5 text-xs text-red-500">{errors.adminToken.message}</p>}
          </div>

          {connectionStatus !== 'idle' && (
            <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
              connectionStatus === 'success'
                ? 'bg-green-50 text-green-600 border border-green-200'
                : connectionStatus === 'testing'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {connectionStatus === 'testing' && <i className="fas fa-spinner fa-spin"></i>}
              {connectionStatus === 'success' && <i className="fas fa-check-circle"></i>}
              {connectionStatus === 'error' && <i className="fas fa-times-circle"></i>}
              {connectionStatus === 'testing' ? '测试连接中...' : connectionMessage}
            </div>
          )}

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 -mx-6 -mb-6 mt-4 flex justify-between items-center">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isSubmitting || connectionStatus === 'testing'}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {connectionStatus === 'testing' ? '测试中...' : '测试连接'}
            </button>
            <div className="flex gap-3">
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
                {isSubmitting ? '保存中...' : '确认'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GatewayEditModal
