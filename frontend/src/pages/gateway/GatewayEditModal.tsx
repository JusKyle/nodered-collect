import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useGatewayStore } from '../../stores/gateway.store'
import { testConnection } from '../../api/gateway.api'
import type { Gateway } from '../../types'

interface GatewayEditModalProps {
  isOpen: boolean
  onClose: () => void
  gateway: Gateway | null
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

function GatewayEditModal({ isOpen, onClose, gateway }: GatewayEditModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
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
        adminToken: gateway.adminToken,
        description: gateway.description || '',
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
      const result = await testConnection({
        address: (document.getElementById('edit-address') as HTMLInputElement).value,
        port: parseInt((document.getElementById('edit-port') as HTMLInputElement).value) || 1880,
        adminToken: (document.getElementById('edit-adminToken') as HTMLInputElement).value,
      })
      if (result.success) {
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
      handleClose()
    } catch (error: any) {
      console.error('更新网关失败:', error)
    }
  }

  if (!isOpen || !gateway) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">编辑网关</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <p className="text-sm text-yellow-700">修改 Token 后需要等待下次心跳或手动测试连接验证</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">网关名称 *</label>
            <input
              {...register('name')}
              type="text"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="请输入网关名称"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地址 *</label>
            <input
              {...register('address')}
              type="text"
              id="edit-address"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="请输入 IP 地址或域名"
            />
            {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">端口 *</label>
            <input
              {...register('port', { valueAsNumber: true })}
              type="number"
              id="edit-port"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.port ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="请输入端口号"
            />
            {errors.port && <p className="mt-1 text-sm text-red-500">{errors.port.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Token *</label>
            <div className="relative">
              <input
                {...register('adminToken')}
                type={showToken ? 'text' : 'password'}
                id="edit-adminToken"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10 ${errors.adminToken ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="请输入 Admin Token"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
            {errors.adminToken && <p className="mt-1 text-sm text-red-500">{errors.adminToken.message}</p>}
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

          {connectionStatus !== 'idle' && (
            <div className={`p-3 rounded-lg text-sm ${
              connectionStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {connectionStatus === 'testing' ? '测试连接中...' : connectionMessage}
              {connectionStatus === 'success' && (
                <span className="inline-flex items-center ml-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {connectionStatus === 'testing' ? '测试中...' : '测试连接'}
            </button>
            <div className="flex space-x-3">
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