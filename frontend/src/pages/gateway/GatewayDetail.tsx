import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGatewayStore } from '../../stores/gateway.store'
import StatusBadge from '../../components/StatusBadge'
import GatewayEditModal from './GatewayEditModal'
import PerformanceMonitor from '../../components/PerformanceMonitor'
import CacheConfigModal from './CacheConfigModal'
import * as gatewayApi from '../../api/gateway.api'
import type { Gateway } from '../../types'
import { showToast } from '../../utils/toast'

function GatewayDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { updateGateway, deleteGateway } = useGatewayStore()
  const [gateway, setGateway] = useState<Gateway | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCacheModalOpen, setIsCacheModalOpen] = useState(false)

  useEffect(() => {
    loadGateway()
  }, [id])

  const loadGateway = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await gatewayApi.getGatewayById(id)
      setGateway(data)
    } catch (error: any) {
      showToast(error.response?.data?.message || '加载网关详情失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEditSuccess = () => {
    setIsEditModalOpen(false)
    loadGateway()
  }

  const handleDelete = async () => {
    if (!gateway) return
    if (!window.confirm('确定要删除该网关吗？此操作不可恢复。')) return

    try {
      await deleteGateway(gateway.id)
      showToast('网关删除成功', 'success')
      navigate('/gateways')
    } catch (error: any) {
      showToast(error.response?.data?.message || '删除失败', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!gateway) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">网关不存在</p>
        <button
          onClick={() => navigate('/gateways')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          返回列表
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/gateways')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{gateway.name}</h1>
              <StatusBadge status={gateway.status} />
            </div>
            <p className="text-gray-500 mt-1">网关详情</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            编辑
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            删除
          </button>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            编辑
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">网关 ID</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{gateway.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">网关名称</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{gateway.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">地址</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{gateway.address}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">端口</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{gateway.port}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">IP 地址</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{gateway.ip || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Node-RED 版本</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{gateway.nodeRedVersion || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">流数量</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{gateway.flowCount ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">最后心跳</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {gateway.lastHeartbeat ? new Date(gateway.lastHeartbeat).toLocaleString() : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">创建时间</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {new Date(gateway.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 性能监控 */}
      <PerformanceMonitor gatewayId={id || ''} />

      {/* 缓存配置卡片 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">断网缓存</h2>
          <button
            onClick={() => setIsCacheModalOpen(true)}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            编辑
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">缓存开关</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {gateway.cacheEnabled !== null && gateway.cacheEnabled !== undefined
                ? gateway.cacheEnabled ? '开启' : '关闭'
                : '使用平台默认'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">保存期限</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {gateway.cacheRetentionDays !== null && gateway.cacheRetentionDays !== undefined
                ? `${gateway.cacheRetentionDays} 天`
                : '使用平台默认'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">补发速率</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {gateway.cacheReplayRate !== null && gateway.cacheReplayRate !== undefined
                ? `${gateway.cacheReplayRate} 条/秒`
                : '使用平台默认'}
            </p>
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
    </div>
  )
}

export default GatewayDetail
