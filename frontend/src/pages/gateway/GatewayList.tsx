import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGatewayStore } from '../../stores/gateway.store'
import { useGatewaySSE } from '../../hooks/useGatewaySSE'
import GatewayCreateModal from './GatewayCreateModal'
import TestResultModal from './TestResultModal'
import * as gatewayApi from '../../api/gateway.api'
import type { Gateway } from '../../types'
import type { TestResultItem } from '../../api/gateway.api'
import { showToast } from '../../utils/toast'

function GatewayList() {
  const navigate = useNavigate()
  const {
    gateways,
    loading,
    fetchGateways,
    updateGatewayStatus,
    page,
    total,
    totalPages,
    filterName,
    filterAddress,
    filterStatus,
    setPage,
    setFilterName,
    setFilterAddress,
    setFilterStatus
  } = useGatewayStore()

  const [searchName, setSearchName] = useState(filterName)
  const [searchIp, setSearchIp] = useState(filterAddress)
  const [filterNrVersion, setFilterNrVersion] = useState('')
  const [searchStatus, setSearchStatus] = useState(filterStatus)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isTestResultModalOpen, setIsTestResultModalOpen] = useState(false)
  const [testResults, setTestResults] = useState<TestResultItem[]>([])
  const [testConnLoading, setTestConnLoading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Gateway | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    fetchGateways()
  }, [page, filterName, filterAddress, filterStatus, fetchGateways])

  useGatewaySSE((event) => {
    updateGatewayStatus(event.gatewayId, event.status, {
      lastHeartbeat: event.lastHeartbeat ? new Date(event.lastHeartbeat) : undefined,
      ip: event.ip,
      flowCount: event.flowCount,
      nodeRedVersion: event.nodeRedVersion
    } as Partial<Gateway>)
  })

  const displayGateways = useMemo(() => {
    if (!filterNrVersion) return gateways
    return gateways.filter((g) => g.nodeRedVersion === filterNrVersion)
  }, [gateways, filterNrVersion])

  const displayTotal = useMemo(() => {
    if (!filterNrVersion) return total
    return displayGateways.length
  }, [total, filterNrVersion, displayGateways.length])

  const handleSearch = () => {
    setFilterName(searchName)
    setFilterAddress(searchIp)
    setFilterStatus(searchStatus)
    setPage(1)
  }

  const handleReset = () => {
    setSearchName('')
    setSearchIp('')
    setFilterNrVersion('')
    setSearchStatus('')
    setFilterName('')
    setFilterAddress('')
    setFilterStatus('')
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleTestConnection = async (gateway: Gateway) => {
    setTestConnLoading(gateway.id)
    try {
      const result = await gatewayApi.testConnection({
        gatewayId: gateway.id,
        port: gateway.port,
      })
      setTestResults(result.results)
      setIsTestResultModalOpen(true)
      fetchGateways()
    } catch (error: any) {
      showToast(error.response?.data?.message || '测试连接失败', 'error')
    } finally {
      setTestConnLoading(null)
    }
  }

  const handleGoToDevices = (gateway: Gateway) => {
    navigate(`/device-instances?gateway=${encodeURIComponent(gateway.name)}`)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await useGatewayStore.getState().deleteGateway(deleteTarget.id)
      showToast('删除成功', 'success')
      setDeleteTarget(null)
      fetchGateways()
    } catch (error: any) {
      showToast(error.response?.data?.message || '删除失败', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-'
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  const getStatusBadge = (status: string) => {
    if (status === 'ONLINE') {
      return <span className="px-2.5 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium">在线</span>
    }
    return <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">离线</span>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">网关列表</h1>
          <p className="text-gray-500 mt-1">管理所有采集网关的注册和状态</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <i className="fas fa-plus"></i>新增网关
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
        <div className="flex gap-5 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">网关名称</label>
            <input
              type="text"
              placeholder="搜索网关名称..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">IP地址</label>
            <input
              type="text"
              placeholder="搜索IP地址..."
              value={searchIp}
              onChange={(e) => setSearchIp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">NR版本</label>
            <select
              value={filterNrVersion}
              onChange={(e) => setFilterNrVersion(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="v3.1.2">v3.1.2</option>
              <option value="v3.1.1">v3.1.1</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">状态</label>
            <select
              value={searchStatus}
              onChange={(e) => setSearchStatus(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="ONLINE">在线</option>
              <option value="OFFLINE">离线</option>
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
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">名称</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">IP地址</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">状态</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">NR版本</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">流数</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">最后心跳</th>
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
            ) : displayGateways.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                  暂无网关数据
                </td>
              </tr>
            ) : (
              displayGateways.map((gateway) => (
                <tr key={gateway.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        gateway.status === 'ONLINE' ? 'bg-indigo-100' : 'bg-gray-100'
                      }`}>
                        <i className={`fas fa-microchip ${
                          gateway.status === 'ONLINE' ? 'text-primary-500' : 'text-gray-400'
                        }`}></i>
                      </div>
                      <span
                        className="font-semibold text-gray-900 hover:text-primary-500 cursor-pointer transition-colors"
                        onClick={() => navigate(`/gateways/${gateway.id}`)}
                      >
                        {gateway.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-sm">{gateway.ip || '-'}</td>
                  <td className="px-5 py-4">{getStatusBadge(gateway.status)}</td>
                  <td className="px-5 py-4 text-gray-600 text-sm">{gateway.nodeRedVersion || '-'}</td>
                  <td className="px-5 py-4 text-gray-600 text-sm">{gateway.flowCount ?? '-'}</td>
                  <td className="px-5 py-4 text-gray-600 text-sm">{formatDate(gateway.lastHeartbeat)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4 text-sm">
                      <button
                        onClick={() => handleTestConnection(gateway)}
                        disabled={testConnLoading === gateway.id}
                        className="text-primary-500 hover:text-indigo-800 font-medium disabled:opacity-50 transition-colors"
                      >
                        {testConnLoading === gateway.id ? '测试中...' : '测试'}
                      </button>
                      <button
                        onClick={() => handleGoToDevices(gateway)}
                        className="text-gray-500 hover:text-primary-500 font-medium transition-colors"
                      >
                        设备
                      </button>
                      <button
                        onClick={() => setDeleteTarget(gateway)}
                        className="text-red-500 hover:text-red-700 font-medium transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 0 && (
        <div className="flex justify-between items-center mt-5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共</span>
            <span className="font-medium text-gray-900">{displayTotal}</span>
            <span>条记录</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <i className="fas fa-chevron-left text-xs"></i>
            </button>
            <button className="px-3 py-1.5 bg-primary-500 text-white rounded-lg font-medium">
              {page}
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>
      )}

      <GatewayCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          fetchGateways()
        }}
      />

      <TestResultModal
        isOpen={isTestResultModalOpen}
        onClose={() => {
          setIsTestResultModalOpen(false)
          setTestResults([])
        }}
        results={testResults}
      />

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-exclamation-triangle text-red-500 text-lg"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">确认删除网关</h3>
                <p className="text-gray-500 text-sm mt-2">
                  确定删除网关「{deleteTarget.name}」吗？
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  删除后将同时移除关联的设备实例、同步记录等数据，此操作不可撤销。
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GatewayList
