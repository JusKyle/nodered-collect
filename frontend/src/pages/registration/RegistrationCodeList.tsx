import { useState, useEffect } from 'react'
import { useRegistrationCodeStore } from '../../stores/registration.store'
import DataTable from '../../components/DataTable'
import BatchGenerateModal from './BatchGenerateModal'
import { showToast } from '../../utils/toast'
import type { Column } from '../../components/DataTable'

const statusMap: Record<string, { label: string; className: string }> = {
  UNUSED: { label: '未使用', className: 'bg-green-100 text-green-800' },
  USED: { label: '已使用', className: 'bg-blue-100 text-blue-800' },
  EXPIRED: { label: '已过期', className: 'bg-gray-100 text-gray-800' },
  REVOKED: { label: '已作废', className: 'bg-red-100 text-red-800' }
}

function RegistrationCodeList() {
  const {
    codes,
    loading,
    fetchCodes,
    revokeCode,
    page,
    pageSize,
    total,
    totalPages,
    filterStatus,
    filterCode,
    setPage,
    setFilterStatus,
    setFilterCode
  } = useRegistrationCodeStore()

  const [searchInput, setSearchInput] = useState('')
  const [isBatchGenerateModalOpen, setIsBatchGenerateModalOpen] = useState(false)

  useEffect(() => {
    fetchCodes()
  }, [page, filterStatus, filterCode])

  const handleSearch = () => {
    setFilterCode(searchInput)
  }

  const handleStatusFilter = (status: string) => {
    setFilterStatus(status)
  }

  const handleRevoke = async (id: string) => {
    if (!window.confirm('确定要作废该注册码吗？作废后不可恢复。')) return

    try {
      await revokeCode(id)
      showToast('注册码已作废', 'success')
      fetchCodes()
    } catch (error: any) {
      showToast(error.response?.data?.message || '作废失败', 'error')
    }
  }

  const columns: Column[] = [
    { key: 'code', label: '注册码' },
    { key: 'status', label: '状态' },
    { key: 'batchId', label: '批次号' },
    { key: 'expiresAt', label: '过期时间' },
    { key: 'createdAt', label: '创建时间' },
    { key: 'actions', label: '操作', width: 120 }
  ]

  const renderRow = (code: any) => {
    const statusInfo = statusMap[code.status] || { label: code.status, className: 'bg-gray-100 text-gray-800' }

    return (
      <tr key={code.id} className="border-b border-gray-200 hover:bg-gray-50">
        <td className="px-4 py-3 text-sm font-mono text-gray-900">{code.code}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{code.batchId || '-'}</td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {new Date(code.expiresAt).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {new Date(code.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-sm">
          {code.status === 'UNUSED' && (
            <button
              onClick={() => handleRevoke(code.id)}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              作废
            </button>
          )}
          {code.status !== 'UNUSED' && (
            <span className="text-gray-400">-</span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">注册码管理</h1>
          <p className="text-gray-500 mt-1">管理网关注册码的生成、使用和状态</p>
        </div>
        <button
          onClick={() => setIsBatchGenerateModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          批量生成
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="搜索注册码..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">全部状态</option>
            <option value="UNUSED">未使用</option>
            <option value="USED">已使用</option>
            <option value="EXPIRED">已过期</option>
            <option value="REVOKED">已作废</option>
          </select>
          <button
            onClick={handleSearch}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            查询
          </button>
          <button
            onClick={() => {
              setSearchInput('')
              setFilterCode('')
              setFilterStatus('')
            }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          columns={columns}
          data={codes}
          renderRow={renderRow}
          loading={loading}
          emptyText="暂无注册码数据"
        />

        {/* 分页 */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              共 {total} 条，每页 {pageSize} 条
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                首页
              </button>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                上一页
              </button>
              <span className="px-4 py-1 text-sm text-gray-600">
                第 {page} / {totalPages} 页
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                下一页
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                末页
              </button>
            </div>
          </div>
        )}
      </div>

      <BatchGenerateModal
        isOpen={isBatchGenerateModalOpen}
        onClose={() => setIsBatchGenerateModalOpen(false)}
        onSuccess={() => {
          setIsBatchGenerateModalOpen(false)
          fetchCodes()
        }}
      />
    </div>
  )
}

export default RegistrationCodeList
