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

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      usePlatformDefault: true,
      cacheEnabled: false,
      cacheRetentionDays: 15,
      cacheReplayRate: 100
    }
  })

  const usePlatformDefault = watch('usePlatformDefault')
  const cacheEnabled = watch('cacheEnabled')

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
        (gateway.cacheEnabled !== null && gateway.cacheEnabled !== undefined) ||
        (gateway.cacheRetentionDays !== null && gateway.cacheRetentionDays !== undefined) ||
        (gateway.cacheReplayRate !== null && gateway.cacheReplayRate !== undefined)

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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">缓存配置</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">使用平台默认配置</p>
              <p className="text-sm text-gray-500 mt-0.5">开启后使用平台级配置，网关级配置不生效</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('usePlatformDefault')}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-md peer-checked:bg-primary-500"></div>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">断网缓存</p>
              </div>
              <label className={`relative inline-flex items-center cursor-pointer ${usePlatformDefault ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                  type="checkbox"
                  {...register('cacheEnabled')}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-md peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div className={`mt-5 space-y-5 ${usePlatformDefault ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">保存期限</label>
                <select
                  {...register('cacheRetentionDays', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                >
                  <option value={7}>7 天</option>
                  <option value={15}>15 天</option>
                  <option value={30}>30 天</option>
                  <option value={60}>60 天</option>
                  <option value={90}>90 天</option>
                </select>
                {errors.cacheRetentionDays && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.cacheRetentionDays.message}</p>
                )}
                {platformConfig && usePlatformDefault && (
                  <p className="mt-1.5 text-xs text-gray-400">平台默认：{platformConfig.cacheRetentionDays} 天</p>
                )}
                {!usePlatformDefault && (
                  <p className="mt-1.5 text-xs text-gray-500">超过保留期限的缓存数据自动清理</p>
                )}
              </div>

              {cacheEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">补发速率</label>
                  <div className="flex items-center gap-2">
                    <input
                      {...register('cacheReplayRate', { valueAsNumber: true })}
                      type="number"
                      min={1}
                      max={500}
                      className={`w-32 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 ${
                        errors.cacheReplayRate ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    <span className="text-sm text-gray-600">条/秒</span>
                  </div>
                  {errors.cacheReplayRate && (
                    <p className="mt-1.5 text-xs text-red-500">{errors.cacheReplayRate.message}</p>
                  )}
                  {platformConfig && usePlatformDefault && (
                    <p className="mt-1.5 text-xs text-gray-400">平台默认：{platformConfig.cacheReplayRate} 条/秒</p>
                  )}
                  {!usePlatformDefault && (
                    <p className="mt-1.5 text-xs text-gray-500">网络恢复后按此速率补发缓存数据（范围：1-500）</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 -mx-6 -mb-6 mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-indigo-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
