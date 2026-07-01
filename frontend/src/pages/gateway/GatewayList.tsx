import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGatewayStore } from '../../stores/gateway.store'
import { useGatewaySSE } from '../../hooks/useGatewaySSE'
import DataTable from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import GatewayCreateModal from './GatewayCreateModal'
import GatewayEditModal from './GatewayEditModal'
import RegistrationCodeModal from './RegistrationCodeModal'
import DeleteConfirmBubble from './DeleteConfirmBubble'
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
    pageSize,
    total,
    totalPages,
    filterName,
    filterStatus,
    setPage,
    setFilterName,
    setFilterStatus
  } = useGatewayStore()
  const [searchInput, setSearchInput] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isRegistrationCodeModalOpen, setIsRegistrationCodeModalOpen] = useState(false)
  const [isTestResultModalOpen, setIsTestResultModalOpen] = useState(false)
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null)
  const [testResults, setTestResults] = useState<TestResultItem[]>([])
  const [testAllPassed, setTestAllPassed] = useState(false)
  const [testConnLoading, setTestConnLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchGateways()
  }, [page, filterName, filterStatus])

  useGatewaySSE((event) => {
    updateGatewayStatus(event.gatewayId, event.status, {
      lastHeartbeat: event.lastHeartbeat ? new Date(event.lastHeartbeat) : undefined,
      ip: event.ip,
      flowCount: event.flowCount,
      nodeRedVersion: event.nodeRedVersion
    } as Partial<Gateway>)
  })

  const handleSearch = () => {
    setFilterName(searchInput)
  }

  const handleStatusFilter = (status: string) => {
    setFilterStatus(status)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const columns = [
    { key: 'name', label: '名称' },
    { key: 'address', label: '地址' },
    { key: 'port', label: '端口' },
    { key: 'status', label: '状态' },
    { key: 'nodeRedVersion', label: 'NR 版本' },
    { key: 'ip', label: 'IP' },
    { key: 'flowCount', label: '流数' },
    { key: 'lastHeartbeat', label: '最后心跳' },
    { key: 'actions', label: '操作' },
  ]

  const handleEditClick = (gateway: Gateway) => {
    setSelectedGateway(gateway)
    setIsEditModalOpen(true)
  }

  const handleTestConnection = async (gateway: Gateway) => {
    setTestConnLoading(gateway.id)
    try {
      const result = await gatewayApi.testConnection({
        gatewayId: gateway.id,
        port: gateway.port,
      })
      setTestResults(result.results)
      setTestAllPassed(result.allPassed)
      setSelectedGateway(gateway)
      setIsTestResultModalOpen(true)
      if (result.allPassed) {
        showToast('连接测试全部通过', 'success')
      } else {
        showToast('部分测试项未通过', 'error')
      }
      fetchGateways()
    } catch (error: any) {
      showToast(error.response?.data?.message || '测试连接失败', 'error')
    } finally {
      setTestConnLoading(null)
    }
  }

  const handleShowDeployedDevices = (gateway: Gateway) => {
    navigate(`/device-instances?gateway=${encodeURIComponent(gateway.name)}`)
  }

  const renderRow = (gateway: typeof gateways[0]) => (
    <tr key={gateway.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate(`/gateways/${gateway.id}`)}>
          {gateway.name}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{gateway.address}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{gateway.port}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {gateway.status === 'TOKEN_EXPIRED' ? (
          <StatusBadge
            status={gateway.status}
            onClick={() => handleEditClick(gateway)}
            tooltip="点击更新 Token"
          />
        ) : (
          <StatusBadge status={gateway.status} />
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{gateway.nodeRedVersion || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{gateway.ip || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{gateway.flowCount ?? '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">
          {gateway.lastHeartbeat ? new Date(gateway.lastHeartbeat).toLocaleString() : '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleTestConnection(gateway)}
            disabled={testConnLoading === gateway.id}
            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
          >
            {testConnLoading === gateway.id ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={() => handleEditClick(gateway)}
            className="text-primary-600 hover:text-primary-900"
          >
            编辑
          </button>
          <button
            onClick={() => handleShowDeployedDevices(gateway)}
            className="text-purple-600 hover:text-purple-900"
          >
            已下发设备
          </button>
          <DeleteConfirmBubble gateway={gateway} onDelete={fetchGateways} />
        </div>
      </td>
    </tr>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">采集网关</h1>
          <p className="text-gray-500 mt-1">管理所有采集网关的注册和状态</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索网关名称..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
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
            <option value="ONLINE">在线</option>
            <option value="OFFLINE">离线</option>
            <option value="TOKEN_EXPIRED">Token 过期</option>
            <option value="ERROR">错误</option>
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
              setFilterName('')
              setFilterStatus('')
            }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            重置
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            激活网关
          </button>
          <button
            onClick={() => setIsRegistrationCodeModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            生成注册码
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={gateways}
        renderRow={renderRow}
        loading={loading}
        emptyText="暂无网关数据"
      />

      {/* 分页 */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            共 {total} 条，每页 {pageSize} 条
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              首页
            </button>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              上一页
            </button>
            <span className="px-4 py-1">
              第 {page} / {totalPages} 页
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一页
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              末页
            </button>
          </div>
        </div>
      )}

      <GatewayCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <GatewayEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedGateway(null)
        }}
        gateway={selectedGateway}
      />

      <RegistrationCodeModal
        isOpen={isRegistrationCodeModalOpen}
        onClose={() => setIsRegistrationCodeModalOpen(false)}
      />

      <TestResultModal
        isOpen={isTestResultModalOpen}
        onClose={() => {
          setIsTestResultModalOpen(false)
          setTestResults([])
          setTestAllPassed(false)
        }}
        results={testResults}
        allPassed={testAllPassed}
        gatewayName={selectedGateway?.name}
      />
    </div>
  )
}

export default GatewayList
