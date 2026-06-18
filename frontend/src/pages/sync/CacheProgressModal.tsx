import { useEffect, useState, useRef, useCallback } from 'react'
import * as syncApi from '../../api/sync.api'
import type { CacheProgressData } from '../../types'

interface CacheProgressModalProps {
  isOpen: boolean
  onClose: () => void
  gatewayId: string
  gatewayName: string
}

function CacheProgressModal({
  isOpen,
  onClose,
  gatewayId,
  gatewayName,
}: CacheProgressModalProps) {
  const [progress, setProgress] = useState<CacheProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchProgress = useCallback(async () => {
    try {
      const data = await syncApi.getCacheProgress(gatewayId)
      setProgress(data)
      setError(null)
      // 如果补发完成，停止轮询
      if (data.status === 'completed' || data.status === 'partial_failed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch {
      setError('获取补发进度失败')
    } finally {
      setLoading(false)
    }
  }, [gatewayId])

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetchProgress()
      // 开始轮询
      intervalRef.current = setInterval(() => {
        fetchProgress()
      }, 2000)
    } else {
      // 关闭时停止轮询
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isOpen, fetchProgress])

  const getProgressPercentage = () => {
    if (!progress || progress.total === 0) return 0
    return Math.round((progress.completed / progress.total) * 100)
  }

  const getStatusBadge = () => {
    if (!progress) return null

    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '补发中' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: '已完成' },
      partial_failed: { bg: 'bg-red-100', text: 'text-red-700', label: '部分失败' },
    }

    const config = statusConfig[progress.status] || statusConfig.in_progress

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">缓存补发进度</h3>
              <p className="text-sm text-gray-500 mt-1">网关：{gatewayName}</p>
            </div>

            {loading && !progress && (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">加载中...</div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-8">
                <div className="text-red-500">{error}</div>
              </div>
            )}

            {progress && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">补发状态</span>
                  {getStatusBadge()}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">缓存总条数</span>
                  <span className="text-sm font-medium text-gray-900">{progress.total}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">已补发条数</span>
                  <span className="text-sm font-medium text-gray-900">{progress.completed}</span>
                </div>

                {progress.failedCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">失败条数</span>
                    <span className="text-sm font-medium text-red-600">{progress.failedCount}</span>
                  </div>
                )}

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">进度</span>
                    <span className="text-sm font-medium text-gray-900">{getProgressPercentage()}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        progress.status === 'partial_failed'
                          ? 'bg-red-500'
                          : progress.status === 'completed'
                          ? 'bg-green-500'
                          : 'bg-primary-600'
                      }`}
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                </div>

                {progress.status === 'in_progress' && (
                  <div className="flex items-center justify-center text-sm text-gray-500 mt-2">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-600"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    正在补发中...
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CacheProgressModal