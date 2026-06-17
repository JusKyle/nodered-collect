import { useState } from 'react'
import StatusBadge from '../../components/StatusBadge'

function SyncRecords() {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'status' | 'cache'>('dispatch')

  const mockRecords = [
    { id: '1', type: 'DEPLOY', gateway: '网关A', device: '设备1', status: 'SUCCESS', time: '2026-06-17 10:30:00', message: '部署成功' },
    { id: '2', type: 'HEARTBEAT', gateway: '网关B', device: '-', status: 'SUCCESS', time: '2026-06-17 10:29:30', message: '心跳正常' },
    { id: '3', type: 'CONFIG_SYNC', gateway: '网关A', device: '设备2', status: 'FAILED', time: '2026-06-17 10:28:00', message: '连接超时' },
    { id: '4', type: 'DATA_UPLOAD', gateway: '网关C', device: '设备3', status: 'SUCCESS', time: '2026-06-17 10:25:00', message: '数据上传成功' },
  ]

  const typeLabels: Record<string, string> = {
    DEPLOY: '配置下发',
    HEARTBEAT: '心跳',
    CONFIG_SYNC: '配置同步',
    DATA_UPLOAD: '数据上传',
  }

  const tabs = [
    { key: 'dispatch', label: '下发日志' },
    { key: 'status', label: '同步状态' },
    { key: 'cache', label: '缓存补发' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">同步记录</h1>
          <p className="text-gray-500 mt-1">查看配置下发和数据同步的历史记录</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'dispatch' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">网关</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">消息</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {typeLabels[record.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.gateway}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.device}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.time}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="text-center py-12 text-gray-500">
              同步状态页面开发中...
            </div>
          )}

          {activeTab === 'cache' && (
            <div className="text-center py-12 text-gray-500">
              缓存补发页面开发中...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SyncRecords