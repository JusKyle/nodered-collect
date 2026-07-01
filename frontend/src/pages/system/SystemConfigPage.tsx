import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getPlatformConfig, updatePlatformConfig } from '../../api/platform-config.api'
import type { PlatformConfig } from '../../api/platform-config.api'
import { showToast } from '../../utils/toast'

const schema = z.object({
  cacheEnabled: z.boolean(),
  cacheRetentionDays: z.number().int().min(1, '保存期限至少 1 天').max(365, '保存期限最多 365 天'),
  cacheReplayRate: z.number().int().min(1, '补发速率至少 1 条/秒').max(500, '补发速率最多 500 条/秒')
})

type FormData = z.infer<typeof schema>

function SystemConfigPage() {
  const [config, setConfig] = useState<PlatformConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      cacheEnabled: false,
      cacheRetentionDays: 15,
      cacheReplayRate: 100
    }
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const data = await getPlatformConfig()
      setConfig(data)
      reset({
        cacheEnabled: data.cacheEnabled,
        cacheRetentionDays: data.cacheRetentionDays,
        cacheReplayRate: data.cacheReplayRate
      })
    } catch (error: any) {
      showToast(error.response?.data?.message || '加载配置失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      const updated = await updatePlatformConfig(data)
      setConfig(updated)
      showToast('配置保存成功', 'success')
    } catch (error: any) {
      showToast(error.response?.data?.message || '保存失败', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">系统配置</h1>
        <p className="text-gray-500 mt-1">管理平台级别的系统配置项</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">断网缓存配置</h2>
        <p className="text-sm text-gray-500 mb-6">
          平台级默认配置，网关未单独配置时使用此配置。网关级配置优先级高于平台级。
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">断网缓存</p>
              <p className="text-sm text-gray-500">启用后网关在断网时会缓存数据，恢复后自动补发</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('cacheEnabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div>
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
            <p className="mt-1 text-xs text-gray-400">范围：1 - 365 天，默认 15 天</p>
          </div>

          <div>
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
            <p className="mt-1 text-xs text-gray-400">范围：1 - 500 条/秒，默认 100 条/秒</p>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '保存中...' : '保存配置'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SystemConfigPage
