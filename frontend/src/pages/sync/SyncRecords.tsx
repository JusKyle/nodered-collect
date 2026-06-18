import { useState, useEffect } from 'react'
import { useSyncStore } from '../../stores/sync.store'
import { useGatewayStore } from '../../stores/gateway.store'
import StatusBadge from '../../components/StatusBadge'
import DispatchLogDetailModal from './DispatchLogDetailModal'
import SyncStatusPanel from './SyncStatusPanel'
import type { SyncRecord } from '../../types'

function SyncRecords() {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'status' | 'cache'>('dispatch')
  const [selectedRecord, setSelectedRecord] = useState<SyncRecord | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Filter states
  const [gatewayIdFilter, setGatewayIdFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { records, loading, error, pagination, queryParams, fetchRecords, setPage, setPageSize, setFilters, resetFilters } = useSyncStore()
  const { gateways, fetchGateways } = useGatewayStore()

  useEffect(() => {
    fetchRecords()
    fetchGateways()
  }, [])

  const handleFilter = () => {
    setFilters({
      gatewayId: gatewayIdFilter || undefined,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    })
  }

  const handleReset = () => {
    setGatewayIdFilter('')
    setStatusFilter('')
    setTypeFilter('')
    setStartDate('')
    setEndDate('')
    resetFilters()
  }

  const handleViewDetail = (record: SyncRecord) => {
    setSelectedRecord(record)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedRecord(null)
  }

  const typeLabels: Record<string, string> = {
    DEPLOY: '配置下发',
    UNDEPLOY: '取消部署',
    REDEPLOY: '重新部署'
  }

  const statusOptions = [
    { value: '', label: '全部' },
    { value: 'SUCCESS', label: '成功' },
    { value: 'FAILED', label: '失败' },
    { value: 'PENDING', label: '待处理' }
  ]

  const typeOptions = [
    { value: '', label: '全部' },
    { value: 'DEPLOY', label: '配置下发' },
    { value: 'UNDEPLOY', label: '取消部署' },
    { value: 'REDEPLOY', label: '重新部署' }
  ]

  const pageSizeOptions = [10, 20, 50]

  const totalPages = Math.ceil(pagination.total / pagination.pageSize)

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
            <>
              {/* Filter Section */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Gateway Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">网关</label>
                    <select
                      value={gatewayIdFilter}
                      onChange={(e) => setGatewayIdFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    >
                      <option value="">全部网关</option>
                      {gateways.map((gateway) => (
                        <option key={gateway.id} value={gateway.id}>
                          {gateway.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    >
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>

                  {/* End Date Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    重置
                  </button>
                  <button
                    onClick={handleFilter}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors"
                  >
                    查询
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              {/* Loading State */}
              {loading ? (
                <div className="text-center py-12 text-gray-500">
                  加载中...
                </div>
              ) : (
                <>
                  {/* Table */}
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {records.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                              暂无数据
                            </td>
                          </tr>
                        ) : (
                          records.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {typeLabels[record.type] || record.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {record.gateway?.name || record.gatewayId}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {record.deviceInstance?.name || record.deviceInstanceId || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={record.status} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {record.createdAt}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {record.message || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => handleViewDetail(record)}
                                  className="text-primary-600 hover:text-primary-800 font-medium"
                                >
                                  查看详情
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      共 {pagination.total} 条记录，第 {pagination.page} / {totalPages || 1} 页
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">每页</span>
                        <select
                          value={pagination.pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm text-gray-500">条</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage(pagination.page - 1)}
                          disabled={pagination.page <= 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          上一页
                        </button>
                        <button
                          onClick={() => setPage(pagination.page + 1)}
                          disabled={pagination.page >= totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          下一页
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'status' && (
            <SyncStatusPanel />
          )}

          {activeTab === 'cache' && (
            <div className="text-center py-12 text-gray-500">
              缓存补发页面开发中...
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <DispatchLogDetailModal
          syncRecord={selectedRecord}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

export default SyncRecords