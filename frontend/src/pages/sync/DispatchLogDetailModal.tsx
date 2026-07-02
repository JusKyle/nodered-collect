import { useState } from 'react'
import type { SyncRecord } from '../../types'
import StatusBadge from '../../components/StatusBadge'

interface DispatchLogDetailModalProps {
  syncRecord: SyncRecord
  isOpen: boolean
  loading?: boolean
  onClose: () => void
}

function DispatchLogDetailModal({ syncRecord, isOpen, loading = false, onClose }: DispatchLogDetailModalProps) {
  const [isPayloadExpanded, setIsPayloadExpanded] = useState(false)

  if (!isOpen) return null

  const typeLabels: Record<string, string> = {
    DEPLOY: '采集流',
    UNDEPLOY: '取消部署',
    REDEPLOY: '重新部署',
    HEARTBEAT: '心跳流',
    INIT: '系统初始化',
    CONFIG_SYNC: '配置同步',
    DATA_UPLOAD: '数据上报'
  }

  const formatDate = (date?: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDuration = (durationMs?: number | null) => {
    if (durationMs == null) return '-'
    if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(2)} 秒`
    return `${(durationMs / 60_000).toFixed(1)} 分钟`
  }

  const formatJson = (data: unknown) => JSON.stringify(data ?? {}, null, 2)
  const flowNodes = syncRecord.flowNodes || []
  const errorMessage = syncRecord.errorMessage || syncRecord.message

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="h-full w-full max-w-3xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">配置下发详情</h2>
            <p className="text-sm text-gray-500 mt-1">查看下发记录、失败原因和 Flow 节点快照</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="fas fa-times text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="py-16 text-center text-gray-500">
              <i className="fas fa-spinner fa-spin mr-2" />加载详情中...
            </div>
          ) : (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="实例名称" value={syncRecord.deviceName || syncRecord.deviceInstance?.name || '-'} />
                  <InfoItem label="设备ID" value={syncRecord.deviceId || syncRecord.deviceInstance?.deviceId || syncRecord.deviceInstanceId || '-'} />
                  <InfoItem label="网关名称" value={syncRecord.gatewayName || syncRecord.gateway?.name || syncRecord.gatewayId} />
                  <InfoItem label="下发类型" value={typeLabels[syncRecord.type] || syncRecord.type} />
                  <InfoItem label="下发版本号" value={syncRecord.configVersion ?? '-'} />
                  <InfoItem label="已下发版本号" value={syncRecord.deployedVersion ?? '-'} />
                  <div>
                    <div className="text-xs text-gray-500 mb-1">状态</div>
                    <StatusBadge status={syncRecord.status} />
                  </div>
                  <InfoItem label="操作人" value={syncRecord.operatorName || syncRecord.operator || '系统'} />
                  <InfoItem label="下发时间" value={formatDate(syncRecord.createdAt)} />
                  <InfoItem label="结束时间" value={formatDate(syncRecord.finishedAt)} />
                  <InfoItem label="耗时" value={formatDuration(syncRecord.durationMs)} />
                  <InfoItem label="Flow 名称" value={syncRecord.flowName || '-'} />
                </div>
              </div>

              {syncRecord.status === 'FAILED' && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-red-700 mb-3">失败详情</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-red-500">失败原因：</span><span className="text-red-700">{errorMessage || '-'}</span></div>
                    <div><span className="text-red-500">错误码：</span><span className="text-red-700">{syncRecord.errorCode || '-'}</span></div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b bg-gray-50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-700">Flow 节点列表</h3>
                  <span className="text-xs text-gray-500">共 {flowNodes.length} 个节点</span>
                </div>
                {flowNodes.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">暂无 Flow 节点快照</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">节点名称</th>
                        <th className="px-4 py-3 text-left">类型</th>
                        <th className="px-4 py-3 text-left">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {flowNodes.map((node) => (
                        <tr key={node.id}>
                          <td className="px-4 py-3 text-gray-900">{node.name}</td>
                          <td className="px-4 py-3 text-gray-600">{node.type}</td>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{node.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setIsPayloadExpanded(!isPayloadExpanded)}
                  className="w-full px-5 py-3 bg-gray-50 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-100"
                >
                  <span>原始 Flow JSON</span>
                  <i className={`fas fa-chevron-down transition-transform ${isPayloadExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isPayloadExpanded && (
                  <pre className="px-5 py-4 bg-white text-xs text-gray-700 overflow-x-auto max-h-72">
                    <code>{formatJson(syncRecord.flowConfig?.length ? syncRecord.flowConfig : syncRecord.payload)}</code>
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-900 break-all">{value}</div>
    </div>
  )
}

export default DispatchLogDetailModal
