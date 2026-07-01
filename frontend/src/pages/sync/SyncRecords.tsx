import { useState, useEffect } from 'react'
import { useSyncStore } from '../../stores/sync.store'
import { useGatewayStore } from '../../stores/gateway.store'
import DispatchLogDetailModal from './DispatchLogDetailModal'
import type { SyncRecord } from '../../types'

function SyncRecords() {
  const [selectedRecord, setSelectedRecord] = useState<SyncRecord | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [searchInstanceName, setSearchInstanceName] = useState('')
  const [searchDeviceId, setSearchDeviceId] = useState('')
  const [gatewayIdFilter, setGatewayIdFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { records, loading, pagination, fetchRecords, setPage, setPageSize, setFilters, resetFilters } = useSyncStore()
  const { gateways, fetchGateways } = useGatewayStore()

  useEffect(() => {
    fetchRecords()
    fetchGateways()
  }, [])

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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
    setSearchInstanceName('')
    setSearchDeviceId('')
    setGatewayIdFilter('')
    setStatusFilter('')
    setTypeFilter('')
    setStartDate('')
    setEndDate('')
    resetFilters()
  }

  const handleRefresh = () => {
    fetchRecords()
  }

  const handleViewDetail = (record: SyncRecord) => {
    setSelectedRecord(record)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedRecord(null)
  }

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; className: string }> = {
      DEPLOY: { label: '采集流', className: 'bg-green-50 text-green-600' },
      UNDEPLOY: { label: '取消部署', className: 'bg-gray-100 text-gray-600' },
      REDEPLOY: { label: '重新部署', className: 'bg-blue-50 text-blue-600' },
      INIT: { label: '系统初始化', className: 'bg-blue-50 text-blue-600' },
      HEARTBEAT: { label: '系统初始化', className: 'bg-blue-50 text-blue-600' },
      COLLECT: { label: '采集流', className: 'bg-green-50 text-green-600' },
    }
    const typeInfo = typeMap[type] || { label: type, className: 'bg-gray-100 text-gray-600' }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeInfo.className}`}>
        {typeInfo.label}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      SUCCESS: { label: '成功', className: 'bg-green-50 text-green-600' },
      FAILED: { label: '失败', className: 'bg-red-50 text-red-600' },
      PENDING: { label: '待处理', className: 'bg-yellow-50 text-yellow-600' },
      RUNNING: { label: '进行中', className: 'bg-blue-50 text-blue-600' },
    }
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

  const filteredRecords = records.filter((record) => {
    const instanceMatch = searchInstanceName === '' || 
      (record.deviceInstance?.name || '').toLowerCase().includes(searchInstanceName.toLowerCase())
    const deviceIdMatch = searchDeviceId === '' || 
      (record.deviceInstanceId || '').toLowerCase().includes(searchDeviceId.toLowerCase())
    return instanceMatch && deviceIdMatch
  })

  const totalPages = Math.ceil(pagination.total / pagination.pageSize)
  const pageSizeOptions = [10, 20, 50]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">配置记录</h1>
          <p className="text-gray-500 mt-1">查看所有配置下发历史和状态</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">设备名称</label>
            <input
              type="text"
              placeholder="搜索设备名称..."
              value={searchInstanceName}
              onChange={(e) => setSearchInstanceName(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">设备ID</label>
            <input
              type="text"
              placeholder="搜索设备ID..."
              value={searchDeviceId}
              onChange={(e) => setSearchDeviceId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">网关名称</label>
            <select
              value={gatewayIdFilter}
              onChange={(e) => setGatewayIdFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部网关</option>
              {gateways.map((gateway) => (
                <option key={gateway.id} value={gateway.id}>
                  {gateway.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">下发类型</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部类型</option>
              <option value="HEARTBEAT">系统初始化</option>
              <option value="COLLECT">采集流</option>
              <option value="DEPLOY">配置下发</option>
              <option value="UNDEPLOY">取消部署</option>
              <option value="REDEPLOY">重新部署</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部状态</option>
              <option value="SUCCESS">成功</option>
              <option value="FAILED">失败</option>
              <option value="PENDING">待处理</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">下发时间</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleFilter}
              className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium"
            >
              <i className="fas fa-search mr-1"></i>查询
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm"
            >
              <i className="fas fa-redo mr-1"></i>重置
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>共</span>
          <span className="font-medium text-gray-900">{pagination.total}</span>
          <span>条记录</span>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
        >
          <i className="fas fa-sync-alt"></i>刷新
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">设备名称</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">设备ID</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">网关名称</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">下发类型</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">失败原因</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">下发时间</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">操作人</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                  <i className="fas fa-spinner fa-spin mr-2"></i>加载中...
                </td>
              </tr>
            )}
            {!loading && filteredRecords.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
            {!loading && filteredRecords.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4">
                  {record.deviceInstance?.name ? (
                    <button
                      onClick={() => handleViewDetail(record)}
                      className="text-primary-500 font-semibold text-sm hover:underline"
                    >
                      {record.deviceInstance.name}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-4 py-4 text-gray-600 text-sm font-mono">
                  {record.deviceInstanceId || <span className="text-gray-400">-</span>}
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => {}}
                    className="text-primary-500 text-sm hover:underline"
                  >
                    {record.gateway?.name || record.gatewayId}
                  </button>
                </td>
                <td className="px-4 py-4">
                  {getTypeBadge(record.type)}
                </td>
                <td className="px-4 py-4">
                  {getStatusBadge(record.status)}
                </td>
                <td className="px-4 py-4">
                  {record.status === 'FAILED' ? (
                    <span className="text-red-500 text-sm truncate max-w-[150px] block" title={record.message}>
                      {record.message || '-'}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-4 py-4 text-gray-600 text-sm">
                  {formatDate(record.createdAt)}
                </td>
                <td className="px-4 py-4 text-gray-600 text-sm">
                  {record.operator || '系统'}
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => handleViewDetail(record)}
                    className="text-primary-500 hover:text-indigo-700 text-sm font-medium"
                  >
                    详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>每页</span>
          <select
            value={pagination.pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>条</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                pagination.page === p
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(pagination.page + 1)}
            disabled={pagination.page >= totalPages}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <i className="fas fa-chevron-right text-xs"></i>
          </button>
        </div>
      </div>

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
