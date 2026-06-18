import { useEffect, useState, useRef, useCallback } from 'react'
import StatusBadge from '../../components/StatusBadge'
import CacheProgressModal from './CacheProgressModal'
import * as syncApi from '../../api/sync.api'
import type { SyncStatusData } from '../../types'

interface SyncStatusPanelProps {
  gatewayId?: string
}

function SyncStatusPanel({ gatewayId }: SyncStatusPanelProps) {
  const [statusData, setStatusData] = useState<SyncStatusData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [progressModal, setProgressModal] = useState<{
    isOpen: boolean
    gatewayId: string
    gatewayName: string
  } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await syncApi.getSyncStatus(gatewayId)
      setStatusData(data)
      setError(null)
    } catch {
      setError('获取同步状态失败')
    } finally {
      setLoading(false)
    }
  }, [gatewayId])

  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      fetchStatus()
    }, 5000)
  }, [fetchStatus])

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    if (autoRefresh) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
    return () => stopAutoRefresh()
  }, [autoRefresh, startAutoRefresh, stopAutoRefresh])

  const handleViewProgress = (gatewayId: string, gatewayName: string) => {
    setProgressModal({
      isOpen: true,
      gatewayId,
      gatewayName,
    })
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      ONLINE: 'ONLINE',
      OFFLINE: 'OFFLINE',
      TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    }
    return <StatusBadge status={statusMap[status] || status} />
  }

  const getDataReportBadge = (status: 'normal' | 'abnormal') => {
    if (status === 'normal') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          正常
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        异常
      </span>
    )
  }

  const getMqttBadge = (status: 'connected' | 'disconnected') => {
    if (status === 'connected') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          已连接
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        断开
      </span>
    )
  }

  const getProgressPercentage = (progress: { total: number; completed: number }) => {
    if (progress.total === 0) return 0
    return Math.round((progress.completed / progress.total) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  if (statusData.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无网关同步状态数据
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">网关同步状态</h3>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            autoRefresh
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {autoRefresh ? '暂停刷新' : '恢复刷新'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statusData.map((gateway) => (
          <div
            key={gateway.gatewayId}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-medium text-gray-900">{gateway.gatewayName}</h4>
                {getStatusBadge(gateway.gatewayStatus)}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">数据上报状态</span>
                {getDataReportBadge(gateway.dataReportStatus)}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">MQTT连接</span>
                {getMqttBadge(gateway.mqttConnectionStatus)}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">最近上报时间</span>
                <span className="text-gray-900">
                  {gateway.lastReportTime
                    ? new Date(gateway.lastReportTime).toLocaleString()
                    : '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">今日上报条数</span>
                <span className="text-gray-900 font-medium">{gateway.todayReportCount}</span>
              </div>

              {gateway.gatewayStatus === 'OFFLINE' && gateway.cacheCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">缓存数据条数</span>
                  <span className="text-yellow-600 font-medium">{gateway.cacheCount}</span>
                </div>
              )}

              {gateway.resyncProgress && gateway.resyncProgress.status === 'in_progress' && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-500 text-xs">补发进度</span>
                    <span className="text-xs text-gray-600">
                      {gateway.resyncProgress.completed}/{gateway.resyncProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${getProgressPercentage(gateway.resyncProgress)}%` }}
                    />
                  </div>
                  <button
                    onClick={() => handleViewProgress(gateway.gatewayId, gateway.gatewayName)}
                    className="mt-2 text-xs text-primary-600 hover:text-primary-700"
                  >
                    查看详情
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {progressModal && (
        <CacheProgressModal
          isOpen={progressModal.isOpen}
          onClose={() => setProgressModal(null)}
          gatewayId={progressModal.gatewayId}
          gatewayName={progressModal.gatewayName}
        />
      )}
    </div>
  )
}

export default SyncStatusPanel