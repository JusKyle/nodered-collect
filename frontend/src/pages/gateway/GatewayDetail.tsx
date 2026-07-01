import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGatewayStore } from '../../stores/gateway.store'
import GatewayEditModal from './GatewayEditModal'
import PerformanceMonitor from '../../components/PerformanceMonitor'
import CacheConfigModal from './CacheConfigModal'
import TestResultModal from './TestResultModal'
import * as gatewayApi from '../../api/gateway.api'
import type { Gateway } from '../../types'
import type { TestResultItem, CacheStatus } from '../../api/gateway.api'
import { showToast } from '../../utils/toast'

function GatewayDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { deleteGateway } = useGatewayStore()
  const [gateway, setGateway] = useState<Gateway | null>(null)
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCacheModalOpen, setIsCacheModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isTestResultModalOpen, setIsTestResultModalOpen] = useState(false)
  const [testResults, setTestResults] = useState<TestResultItem[]>([])
  const [testConnLoading, setTestConnLoading] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)

  const loadGateway = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await gatewayApi.getGatewayById(id)
      setGateway(data)
      if (data.cacheStatus) {
        setCacheStatus(data.cacheStatus)
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || '加载网关详情失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadGateway()
  }, [loadGateway])

  const handleEditSuccess = () => {
    setIsEditModalOpen(false)
    loadGateway()
  }

  const handleDelete = async () => {
    if (!gateway) return
    try {
      await deleteGateway(gateway.id)
      showToast('网关删除成功', 'success')
      navigate('/gateways')
    } catch (error: any) {
      showToast(error.response?.data?.message || '删除失败', 'error')
    }
  }

  const handleTestConnection = async () => {
    if (!gateway) return
    setTestConnLoading(true)
    try {
      const result = await gatewayApi.testConnection({
        gatewayId: gateway.id,
        port: gateway.port,
      })
      setTestResults(result.results)
      setIsTestResultModalOpen(true)
      loadGateway()
    } catch (error: any) {
      showToast(error.response?.data?.message || '测试连接失败', 'error')
    } finally {
      setTestConnLoading(false)
    }
  }

  const handleClearCache = async () => {
    if (!id) return
    setClearingCache(true)
    try {
      const result = await gatewayApi.clearCache(id)
      setCacheStatus(result)
      showToast('缓存已清空', 'success')
    } catch (error: any) {
      showToast(error.response?.data?.message || '清空缓存失败', 'error')
    } finally {
      setClearingCache(false)
    }
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-'
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  const isOnline = gateway?.status === 'ONLINE'

  const cacheCount = cacheStatus?.cacheCount ?? 0
  const cacheSizeBytes = cacheStatus?.cacheSizeBytes ?? 0
  const maxCacheBytes = 100 * 1024 * 1024
  const cacheUsagePercent = Math.min(Math.round((Number(cacheSizeBytes) / maxCacheBytes) * 100), 100)
  const cacheEarliest = cacheStatus?.firstCachedAt ? formatDate(cacheStatus.firstCachedAt) : '-'
  const cacheLatest = cacheStatus?.latestCachedAt ? formatDate(cacheStatus.latestCachedAt) : '-'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!gateway) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">网关不存在</p>
        <button
          onClick={() => navigate('/gateways')}
          className="mt-4 text-primary-500 hover:text-indigo-600"
        >
          返回列表
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/gateways')}
        className="flex items-center gap-2 text-gray-600 hover:text-primary-500 mb-6 transition-colors"
      >
        <i className="fas fa-arrow-left text-sm"></i>
        <span className="text-sm font-medium">返回网关列表</span>
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="fas fa-microchip text-primary-500 text-xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{gateway.name}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isOnline
                    ? 'bg-green-50 text-green-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {isOnline ? '在线' : '离线'}
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <i className="fas fa-network-wired text-gray-400 text-xs"></i>
                  <span>IP：<span className="text-gray-700">{gateway.ip || '-'}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <i className="fas fa-code-branch text-gray-400 text-xs"></i>
                  <span>NR版本：<span className="text-gray-700">{gateway.nodeRedVersion || '-'}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <i className="fas fa-project-diagram text-gray-400 text-xs"></i>
                  <span>流数：<span className="text-gray-700">{gateway.flowCount ?? '-'}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <i className="fas fa-heartbeat text-gray-400 text-xs"></i>
                  <span>最后心跳：<span className="text-gray-700">{formatDate(gateway.lastHeartbeat)}</span></span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testConnLoading}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <i className="fas fa-vial text-sm"></i>
              {testConnLoading ? '测试中...' : '测试'}
            </button>
            <button
              onClick={() => navigate(`/device-instances?gateway=${encodeURIComponent(gateway.name)}`)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <i className="fas fa-microchip text-sm"></i>设备
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <i className="fas fa-edit text-sm"></i>编辑
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <i className="fas fa-trash-alt text-sm"></i>删除
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-5">基本信息</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <div>
              <div className="text-xs text-gray-500 mb-1">网关名称</div>
              <div className="text-sm font-medium text-gray-900">{gateway.name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">IP地址</div>
              <div className="text-sm font-medium text-gray-900">{gateway.ip || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">端口</div>
              <div className="text-sm font-medium text-gray-900">{gateway.port}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">NR版本</div>
              <div className="text-sm font-medium text-gray-900">{gateway.nodeRedVersion || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">注册时间</div>
              <div className="text-sm font-medium text-gray-900">{formatDate(gateway.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">最后心跳</div>
              <div className="text-sm font-medium text-gray-900">{formatDate(gateway.lastHeartbeat)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">状态</div>
              <div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {isOnline ? '在线' : '离线'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-5">性能监控</h3>
          <PerformanceMonitor gatewayId={id || ''} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-start mb-5">
            <h3 className="text-lg font-bold text-gray-900">缓存状态</h3>
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="text-primary-500 hover:text-indigo-600 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {clearingCache && <i className="fas fa-spinner fa-spin text-xs"></i>}
              清空缓存
            </button>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900">缓存条数</div>
                <div className="text-sm font-bold text-gray-900">{cacheCount.toLocaleString()} 条</div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900">存储占用</div>
                <div className="text-sm font-medium text-gray-900">{cacheUsagePercent}%</div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${cacheUsagePercent}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">最早数据</div>
                <div className="text-sm font-medium text-gray-900">{cacheEarliest}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">最新数据</div>
                <div className="text-sm font-medium text-gray-900">{cacheLatest}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-start mb-5">
            <h3 className="text-lg font-bold text-gray-900">缓存配置</h3>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-primary-500/10 text-primary-500 rounded-full text-xs font-medium">
                网关级
              </span>
              <button
                onClick={() => setIsCacheModalOpen(true)}
                className="text-primary-500 hover:text-indigo-600 text-sm font-medium transition-colors"
              >
                编辑
              </button>
            </div>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">缓存开关</div>
                <div className="text-xs text-gray-500 mt-1">开启后断网时数据将本地缓存</div>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {gateway.cacheEnabled !== null && gateway.cacheEnabled !== undefined
                  ? gateway.cacheEnabled ? '开启' : '关闭'
                  : '继承平台级'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">保存期限</div>
                <div className="text-xs text-gray-500 mt-1">缓存数据最长保留时间</div>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {gateway.cacheRetentionDays !== null && gateway.cacheRetentionDays !== undefined
                  ? `${gateway.cacheRetentionDays} 天`
                  : '继承平台级'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">补发速率</div>
                <div className="text-xs text-gray-500 mt-1">网络恢复后数据补发速度</div>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {gateway.cacheReplayRate !== null && gateway.cacheReplayRate !== undefined
                  ? `${gateway.cacheReplayRate} 条/秒`
                  : '继承平台级'}
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <i className="fas fa-info-circle text-gray-400 mt-0.5"></i>
                <span>网关级配置优先级高于平台级配置，修改后将立即同步到网关。</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <GatewayEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        gateway={gateway}
        onSuccess={handleEditSuccess}
      />

      <CacheConfigModal
        isOpen={isCacheModalOpen}
        onClose={() => setIsCacheModalOpen(false)}
        gateway={gateway}
        onSuccess={loadGateway}
      />

      <TestResultModal
        isOpen={isTestResultModalOpen}
        onClose={() => {
          setIsTestResultModalOpen(false)
          setTestResults([])
        }}
        results={testResults}
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-exclamation-triangle text-red-500 text-lg"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">确认删除网关</h3>
                <p className="text-gray-500 text-sm mt-2">
                  确定删除网关「{gateway?.name}」吗？
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  删除后将同时移除关联的设备实例、同步记录等数据，此操作不可撤销。
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={false}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={false}
                className="px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GatewayDetail
