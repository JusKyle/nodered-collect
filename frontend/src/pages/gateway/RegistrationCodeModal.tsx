import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { generateRegistrationCode } from '../../api/gateway.api'
import type { RegistrationCode } from '../../types'

interface RegistrationCodeModalProps {
  isOpen: boolean
  onClose: () => void
}

const schema = z.object({
  gatewayName: z
    .string()
    .min(1, '请输入网关名称')
    .max(50, '网关名称不能超过50个字符'),
  expiresIn: z
    .number()
    .min(1, '有效期至少为1小时')
    .max(720, '有效期不能超过30天'),
})

type FormData = z.infer<typeof schema>

function RegistrationCodeModal({ isOpen, onClose }: RegistrationCodeModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      gatewayName: '',
      expiresIn: 24,
    },
  })

  const [registrationCode, setRegistrationCode] = useState<RegistrationCode | null>(null)
  const [copied, setCopied] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  const handleClose = () => {
    reset()
    setRegistrationCode(null)
    setCopied(false)
    setIsExpired(false)
    onClose()
  }

  const handleCopy = async () => {
    if (!registrationCode) return
    try {
      await navigator.clipboard.writeText(registrationCode.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      const result = await generateRegistrationCode({
        gatewayName: data.gatewayName,
        expiresIn: data.expiresIn,
      })
      setRegistrationCode(result)
      checkExpired(result.expiresAt)
    } catch (error: any) {
      console.error('生成注册码失败:', error)
    }
  }

  const checkExpired = (expiresAt: string) => {
    const expiry = new Date(expiresAt).getTime()
    const interval = setInterval(() => {
      const now = Date.now()
      if (now >= expiry) {
        setIsExpired(true)
        clearInterval(interval)
      }
    }, 1000)
  }

  const getTimeRemaining = () => {
    if (!registrationCode) return ''
    const expiry = new Date(registrationCode.expiresAt).getTime()
    const now = Date.now()
    const diff = expiry - now
    if (diff <= 0) return '已过期'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return `${hours}小时${minutes}分${seconds}秒`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">生成注册码</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!registrationCode ? (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">网关名称 *</label>
              <input
                {...register('gatewayName')}
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.gatewayName ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="请输入网关名称"
              />
              {errors.gatewayName && <p className="mt-1 text-sm text-red-500">{errors.gatewayName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">有效期（小时）</label>
              <select
                {...register('expiresIn', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value={1}>1 小时</option>
                <option value={6}>6 小时</option>
                <option value={24}>24 小时（1天）</option>
                <option value={72}>72 小时（3天）</option>
                <option value={168}>168 小时（7天）</option>
                <option value={720}>720 小时（30天）</option>
              </select>
              {errors.expiresIn && <p className="mt-1 text-sm text-red-500">{errors.expiresIn.message}</p>}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                注册码为一次性使用，网关注册后自动失效。请妥善保管注册码，勿泄露给他人。
              </p>
            </div>

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
                {isSubmitting ? '生成中...' : '生成'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">注册码已生成</p>
              <div className={`inline-block px-4 py-2 rounded-lg font-mono text-lg tracking-wider ${
                isExpired ? 'bg-gray-100 text-gray-400' : 'bg-primary-50 text-primary-700'
              }`}>
                {registrationCode.code}
              </div>
            </div>

            <div className={`p-3 rounded-lg text-sm ${
              isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              <div className="flex items-center justify-between">
                <span>状态：{isExpired ? '已过期' : '有效'}</span>
                {!isExpired && (
                  <span>剩余时间：{getTimeRemaining()}</span>
                )}
              </div>
              <div className="mt-1">过期时间：{new Date(registrationCode.expiresAt).toLocaleString()}</div>
              <div>网关名称：{registrationCode.gatewayName}</div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationCode(null)
                    reset()
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  重新生成
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={isExpired}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    copied
                      ? 'bg-green-600 text-white'
                      : isExpired
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {copied ? '已复制' : '复制注册码'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RegistrationCodeModal