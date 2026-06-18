import { useState } from 'react'
import type { SyncRecord } from '../../types'
import StatusBadge from '../../components/StatusBadge'

interface DispatchLogDetailModalProps {
  syncRecord: SyncRecord
  isOpen: boolean
  onClose: () => void
}

function DispatchLogDetailModal({ syncRecord, isOpen, onClose }: DispatchLogDetailModalProps) {
  const [isPayloadExpanded, setIsPayloadExpanded] = useState(false)

  if (!isOpen) return null

  const typeLabels: Record<string, string> = {
    DEPLOY: '配置下发',
    UNDEPLOY: '取消部署',
    REDEPLOY: '重新部署'
  }

  const formatJson = (data: Record<string, any> | null) => {
    if (!data) return '{}'
    return JSON.stringify(data, null, 2)
  }

  const mockRetryRecords = [
    { time: '2026-06-17 10:28:30', result: '失败', reason: '连接超时' },
    { time: '2026-06-17 10:28:00', result: '失败', reason: '网关无响应' },
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">下发详情</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">下发时间</label>
              <p className="text-sm text-gray-900">{syncRecord.createdAt}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">网关名称</label>
              <p className="text-sm text-gray-900">{syncRecord.gateway?.name || syncRecord.gatewayId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">设备实例名称</label>
              <p className="text-sm text-gray-900">{syncRecord.deviceInstance?.name || syncRecord.deviceInstanceId || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">操作类型</label>
              <p className="text-sm text-gray-900">{typeLabels[syncRecord.type] || syncRecord.type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
              <StatusBadge status={syncRecord.status} />
            </div>
            {syncRecord.message && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">消息</label>
                <p className="text-sm text-gray-900">{syncRecord.message}</p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-500 mb-1">下发内容</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setIsPayloadExpanded(!isPayloadExpanded)}
                className="w-full px-4 py-2 bg-gray-50 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span>JSON 内容</span>
                <svg
                  className={`w-5 h-5 transition-transform ${isPayloadExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isPayloadExpanded && (
                <pre className="px-4 py-3 bg-white text-xs text-gray-700 overflow-x-auto max-h-48">
                  <code>{formatJson(syncRecord.payload)}</code>
                </pre>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">重试记录</label>
            {mockRetryRecords.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">结果</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">原因</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockRetryRecords.map((record, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-500">{record.time}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            record.result === '成功'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {record.result}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{record.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">暂无重试记录</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DispatchLogDetailModal
