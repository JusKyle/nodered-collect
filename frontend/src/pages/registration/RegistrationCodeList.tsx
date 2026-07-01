import { useState, useEffect } from 'react'
import { useRegistrationCodeStore } from '../../stores/registration.store'
import BatchGenerateModal from './BatchGenerateModal'
import { showToast } from '../../utils/toast'
import type { RegistrationCode } from '../../api/registration.api'

function RegistrationCodeList() {
  const {
    codes,
    loading,
    fetchCodes,
    revokeCode,
    deleteCode,
    page,
    total,
    totalPages,
    filterStatus,
    filterCode,
    setPage,
    setFilterStatus,
    setFilterCode
  } = useRegistrationCodeStore()

  const [searchCode, setSearchCode] = useState('')
  const [searchGateway, setSearchGateway] = useState('')
  const [isBatchGenerateModalOpen, setIsBatchGenerateModalOpen] = useState(false)
  const [revokeConfirm, setRevokeConfirm] = useState<RegistrationCode | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<RegistrationCode | null>(null)

  useEffect(() => {
    fetchCodes()
  }, [page, filterStatus, filterCode])

  const handleSearch = () => {
    setFilterCode(searchCode)
    setPage(1)
  }

  const handleReset = () => {
    setSearchCode('')
    setSearchGateway('')
    setFilterCode('')
    setFilterStatus('')
    setPage(1)
  }

  const handleRevoke = async (code: RegistrationCode) => {
    try {
      await revokeCode(code.id)
      showToast('注册码已作废', 'success')
      setRevokeConfirm(null)
      fetchCodes()
    } catch (error: any) {
      showToast(error.response?.data?.message || '作废失败', 'error')
    }
  }

  const handleDelete = async (code: RegistrationCode) => {
    try {
      await deleteCode(code.id)
      showToast('注册码已删除', 'success')
      setDeleteConfirm(null)
      fetchCodes()
    } catch (error: any) {
      showToast(error.response?.data?.message || '删除失败', 'error')
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'UNUSED':
        return 'bg-blue-50 text-blue-600'
      case 'USED':
        return 'bg-green-50 text-green-600'
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-500'
      case 'REVOKED':
        return 'bg-red-50 text-red-600'
      default:
        return 'bg-gray-100 text-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'UNUSED': return '未使用'
      case 'USED': return '已使用'
      case 'EXPIRED': return '已过期'
      case 'REVOKED': return '已作废'
      default: return status
    }
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-'
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  const maskCode = (code: string) => {
    if (code.length <= 8) return code
    return code.slice(0, 9) + '********'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">注册码列表</h1>
          <p className="text-gray-500 mt-1 text-sm">管理网关接入凭证</p>
        </div>
        <button
          onClick={() => setIsBatchGenerateModalOpen(true)}
          className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <i className="fas fa-plus text-sm"></i>批量生成
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
        <div className="flex gap-5 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">注册码</label>
            <input
              type="text"
              placeholder="搜索注册码..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">网关名称</label>
            <input
              type="text"
              placeholder="搜索网关名称..."
              value={searchGateway}
              onChange={(e) => setSearchGateway(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">状态</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent min-w-[140px]"
            >
              <option value="">全部状态</option>
              <option value="UNUSED">未使用</option>
              <option value="USED">已使用</option>
              <option value="EXPIRED">已过期</option>
              <option value="REVOKED">已作废</option>
            </select>
          </div>
          <button
            onClick={handleSearch}
            className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium transition-colors"
          >
            查询
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">注册码</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">状态</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">生成时间</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">过期时间</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">使用时间</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">绑定网关</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                </td>
              </tr>
            ) : codes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                  暂无注册码数据
                </td>
              </tr>
            ) : (
              codes.map((code: any) => (
                <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 text-gray-900 font-mono text-sm">{maskCode(code.code)}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(code.status)}`}>
                      {getStatusLabel(code.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-sm">{formatDate(code.createdAt)}</td>
                  <td className="px-5 py-4 text-gray-600 text-sm">{formatDate(code.expiresAt)}</td>
                  <td className="px-5 py-4 text-gray-400 text-sm">
                    {code.usedAt ? formatDate(code.usedAt) : '-'}
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-sm">
                    {code.gatewayName || '-'}
                  </td>
                  <td className="px-5 py-4">
                    {code.status === 'UNUSED' && (
                      <button
                        onClick={() => setRevokeConfirm(code)}
                        className="text-orange-500 hover:text-orange-700 text-sm font-medium transition-colors"
                      >
                        作废
                      </button>
                    )}
                    {code.status === 'USED' && (
                      <button
                        onClick={() => setRevokeConfirm(code)}
                        className="text-orange-500 hover:text-orange-700 text-sm font-medium transition-colors"
                      >
                        作废
                      </button>
                    )}
                    {code.status === 'REVOKED' && (
                      <button
                        onClick={() => setDeleteConfirm(code)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                      >
                        删除
                      </button>
                    )}
                    {code.status === 'EXPIRED' && (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>共</span>
          <span className="font-medium text-gray-900">{total}</span>
          <span>条记录</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          >
            <i className="fas fa-chevron-left text-xs text-gray-600"></i>
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (page <= 3) {
              pageNum = i + 1
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = page - 2 + i
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  page === pageNum
                    ? 'bg-primary-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          >
            <i className="fas fa-chevron-right text-xs text-gray-600"></i>
          </button>
        </div>
      </div>

      <BatchGenerateModal
        isOpen={isBatchGenerateModalOpen}
        onClose={() => setIsBatchGenerateModalOpen(false)}
        onSuccess={() => {
          setIsBatchGenerateModalOpen(false)
          fetchCodes()
        }}
      />

      {revokeConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">作废确认</h3>
              <button
                onClick={() => setRevokeConfirm(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  revokeConfirm.status === 'USED' ? 'bg-red-100' : 'bg-orange-100'
                }`}>
                  <i className={`fas ${
                    revokeConfirm.status === 'USED' ? 'fa-exclamation-circle text-red-500' : 'fa-exclamation-triangle text-orange-500'
                  } text-xl`}></i>
                </div>
                <div>
                  {revokeConfirm.status === 'USED' ? (
                    <>
                      <p className="text-gray-900 font-semibold">作废后，该网关将无法继续上报数据</p>
                      <p className="text-red-500 text-sm font-medium mt-0.5">确定要作废此注册码吗？</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-900 font-semibold">确定要作废此注册码吗？</p>
                      <p className="text-gray-500 text-sm mt-0.5">作废后，该注册码将无法再被使用。</p>
                    </>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">注册码</span>
                  <span className="text-gray-900 font-mono text-sm">{maskCode(revokeConfirm.code)}</span>
                </div>
                {revokeConfirm.gatewayName && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">绑定网关</span>
                    <span className="text-gray-900 text-sm font-semibold">{revokeConfirm.gatewayName}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setRevokeConfirm(null)}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleRevoke(revokeConfirm)}
                className={`px-5 py-2.5 text-white rounded-xl font-medium transition-colors ${
                  revokeConfirm.status === 'USED' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                确认作废
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">删除确认</h3>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-trash-alt text-red-500 text-xl"></i>
                </div>
                <div>
                  <p className="text-gray-900 font-semibold">确定要删除此注册码吗？</p>
                  <p className="text-red-500 text-sm font-medium mt-0.5">删除后无法恢复。</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">注册码</p>
                <p className="text-gray-900 font-mono font-semibold">{maskCode(deleteConfirm.code)}</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium transition-colors"
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

export default RegistrationCodeList
