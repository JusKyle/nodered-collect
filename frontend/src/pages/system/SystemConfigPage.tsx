import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getPlatformConfig, updatePlatformConfig } from '../../api/platform-config.api'
import { showToast } from '../../utils/toast'

const schema = z.object({
  cacheEnabled: z.boolean(),
  cacheRetentionDays: z.number().int().min(1, '保存期限至少 1 天').max(365, '保存期限最多 365 天'),
  cacheReplayRate: z.number().int().min(1, '补发速率至少 1 条/秒').max(500, '补发速率最多 500 条/秒')
})

type FormData = z.infer<typeof schema>

const menuItems = [
  { key: 'cache', label: '断网缓存', icon: 'fa-cog' },
  { key: 'security', label: '安全配置', icon: 'fa-shield-alt' },
  { key: 'storage', label: '数据存储', icon: 'fa-database' },
  { key: 'notification', label: '通知配置', icon: 'fa-bell' },
]

function SystemConfigPage() {
  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState('cache')

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      cacheEnabled: false,
      cacheRetentionDays: 15,
      cacheReplayRate: 100
    }
  })

  const cacheEnabled = watch('cacheEnabled')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const data = await getPlatformConfig()
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
      await updatePlatformConfig(data)
      showToast('配置保存成功', 'success')
    } catch (error: any) {
      showToast(error.response?.data?.message || '保存失败', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-6">
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">系统配置</div>
            <nav className="space-y-1">
              {menuItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveMenu(item.key)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeMenu === item.key
                      ? 'text-primary-500 bg-indigo-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <i className={`fas ${item.icon} w-5`}></i>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex-1">
          {activeMenu === 'cache' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">断网缓存配置</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <i className="fas fa-info-circle text-blue-500 mt-0.5 mr-2"></i>
                    <div className="text-sm text-blue-700">
                      <p>• 此配置为平台级默认值，所有网关默认使用此配置</p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <label className="text-sm font-medium text-gray-700">缓存开关</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {cacheEnabled ? '已开启' : '已关闭'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('cacheEnabled')}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-md peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                </div>

                {cacheEnabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">保存期限</label>
                      <select
                        {...register('cacheRetentionDays', { valueAsNumber: true })}
                        className="w-64 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                      >
                        <option value={7}>7 天</option>
                        <option value={15}>15 天</option>
                        <option value={30}>30 天</option>
                        <option value={60}>60 天</option>
                        <option value={90}>90 天</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">超过保留期限的缓存数据自动清理</p>
                      {errors.cacheRetentionDays && (
                        <p className="mt-1 text-sm text-red-500">{errors.cacheRetentionDays.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">补发速率</label>
                      <div className="flex items-center space-x-2">
                        <input
                          {...register('cacheReplayRate', { valueAsNumber: true })}
                          type="number"
                          min={1}
                          max={500}
                          className={`w-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 ${
                            errors.cacheReplayRate ? 'border-red-500' : 'border-gray-200'
                          }`}
                        />
                        <span className="text-sm text-gray-600">条/秒</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">网络恢复后按此速率补发缓存数据（范围：1-500）</p>
                      {errors.cacheReplayRate && (
                        <p className="mt-1 text-sm text-red-500">{errors.cacheReplayRate.message}</p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fas fa-save mr-2"></i>
                        {isSubmitting ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          )}

          {activeMenu !== 'cache' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-tools text-gray-400 text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {menuItems.find(m => m.key === activeMenu)?.label}
              </h3>
              <p className="text-gray-500 text-sm">功能开发中，敬请期待</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SystemConfigPage
