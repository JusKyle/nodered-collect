import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Gateway } from '../../types'
import { getEffectiveCacheConfig } from '../../api/platform-config.api'
import { showToast } from '../../utils/toast'
import * as gatewayApi from '../../api/gateway.api'

interface CacheConfigModalProps {
  isOpen: boolean
  onClose: () => void
  gateway: Gateway | null
  onSuccess?: () => void
}

const schema = z.object({
  usePlatformDefault: z.boolean(),
  cacheEnabled: z.boolean(),
  cacheRetentionDays: z.number().int().min(1).max(365),
  cacheReplayRate: z.number().int().min(1).max(500)
})

type FormData = z.infer<typeof schema>

function CacheConfigModal({ isOpen, onClose, gateway, onSuccess }: CacheConfigModalProps) {
  const [platformConfig, setPlatformConfig] = useState<{
    cacheEnabled: boolean
    cacheRetentionDays: number
    cacheReplayRate: number
  } | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      usePlatformDefault: true,
      cacheEnabled: false,
      cacheRetentionDays: 15,
      cacheReplayRate: 100
    }
  })

  const usePlatformDefault = watch('usePlatformDefault')

  useEffect(() => {
    if (isOpen && gateway) {
      loadPlatformConfig()
    }
  }, [isOpen, gateway])

  const loadPlatformConfig = async () => {
    if (!gateway) return
    try {
      const config = await getEffectiveCacheConfig()
      setPlatformConfig(config)

      const hasGatewayConfig =
        gateway.cacheEnabled !== null && gateway.cacheEnabled !== undefined ||
        gateway.cacheRetentionDays !== null && gateway.cacheRetentionDays !== undefined ||
        gateway.cacheReplayRate !== null && gateway.cacheReplayRate !== undefined

      reset({
        usePlatformDefault: !hasGatewayConfig,
        cacheEnabled: gateway.cacheEnabled ?? config.cacheEnabled,
        cacheRetentionDays: gateway.cacheRetentionDays ?? config.cacheRetentionDays,
        cacheReplayRate: gateway.cacheReplayRate ?? config.cacheReplayRate
      })
    } catch (error) {
      console.error('加载平台配置失败:', error)
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!gateway) return
    try {
      const updateData = data.usePlatformDefault
        ? { cacheEnabled: null, cacheRetentionDays: null, cacheReplayRate: null }
        : { cacheEnabled: data.cacheEnabled, cacheRetentionDays: data.cacheRetentionDays, cacheReplayRate: data.cacheReplayRate }

      await gatewayApi.updateGateway(gateway.id, updateData)
      showToast('缓存配置保存成功', 'success')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      showToast(error.response?.data?.message || '保存失败', 'error')
    }
  }

  if (!isOpen || !gateway) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">缓存配置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">使用平台默认配置</p>
              <p className="text-sm text-gray-500">开启后使用平台级配置，网关级配置不生效</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('usePlatformDefault')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">断网缓存</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('cacheEnabled')}
                  disabled={usePlatformDefault}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 ${usePlatformDefault ? 'opacity-50' : ''}`}></div>
              </label>
            </div>

            <div className={`mt-4 ${usePlatformDefault ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                缓存保存期限 <span className="text-gray-400">(天)</span>
              </label>
              <input
                {...register('cacheRetentionDays', { valueAsNumber: true })}
                type="number"
                min={1}
                max={365}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.cacheRetentionDays ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.cacheRetentionDays && (
                <p className="mt-1 text-sm text-red-500">{errors.cacheRetentionDays.message}</p>
              )}
              {platformConfig && usePlatformDefault && (
                <p className="mt-1 text-xs text-gray-400">平台默认：{platformConfig.cacheRetentionDays} 天</p>
              )}
            </div>

            <div className={`mt-4 ${usePlatformDefault ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                缓存补发速率 <span className="text-gray-400">(条/秒)</span>
              </label>
              <input
                {...register('cacheReplayRate', { valueAsNumber: true })}
                type="number"
                min={1}
                max={500}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.cacheReplayRate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.cacheReplayRate && (
                <p className="mt-1 text-sm text-red-500">{errors.cacheReplayRate.message}</p>
              )}
              {platformConfig && usePlatformDefault && (
                <p className="mt-1 text-xs text-gray-400">平台默认：{platformConfig.cacheReplayRate} 条/秒</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
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

export default CacheConfigModal
