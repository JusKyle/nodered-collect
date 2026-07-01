import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDeviceInstanceStore } from '../../stores/device-instance.store'
import { useGatewayStore } from '../../stores/gateway.store'
import { useDeviceModelStore } from '../../stores/device-model.store'
import DeviceInstanceCreateModal from './DeviceInstanceCreateModal'
import DeviceInstanceBatchModal from './DeviceInstanceBatchModal'
import DeviceInstanceEditModal from './DeviceInstanceEditModal'
import ChangeGatewayModal from './ChangeGatewayModal'
import ViewPointsModal from './ViewPointsModal'
import DeviceDataPanel from './DeviceDataPanel'
import { dispatchConfig, undeployConfig } from '../../api/sync.api'
import { syncPoints } from '../../api/device-instance.api'
import { showToast } from '../../utils/toast'
import type { DeviceInstance } from '../../types'

function DeviceInstanceList() {
  const [searchParams] = useSearchParams()
  const { deviceInstances, loading, fetchDeviceInstances } = useDeviceInstanceStore()
  const { gateways, fetchGateways } = useGatewayStore()
  const { deviceModels, fetchDeviceModels } = useDeviceModelStore()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [isViewPointsModalOpen, setIsViewPointsModalOpen] = useState(false)
  const [isChangeGatewayModalOpen, setIsChangeGatewayModalOpen] = useState(false)
  const [isDataPanelOpen, setIsDataPanelOpen] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<DeviceInstance | null>(null)

  const gatewayFromUrl = searchParams.get('gateway') || ''
  const [searchName, setSearchName] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterGateway, setFilterGateway] = useState(gatewayFromUrl)
  const [filterStatus, setFilterStatus] = useState('')
  
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    fetchDeviceInstances()
    fetchGateways()
    fetchDeviceModels()
  }, [fetchDeviceInstances, fetchGateways, fetchDeviceModels])

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredInstances = deviceInstances.filter((instance) => {
    const nameMatch = searchName === '' || 
      instance.name.toLowerCase().includes(searchName.toLowerCase())
    const modelMatch = filterModel === '' || instance.modelId === filterModel
    const gatewayMatch = filterGateway === '' || instance.gatewayId === filterGateway
    const statusMatch = filterStatus === '' || instance.status === filterStatus
    return nameMatch && modelMatch && gatewayMatch && statusMatch
  })

  const paginatedInstances = filteredInstances.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  const totalPages = Math.ceil(filteredInstances.length / pageSize)

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedInstances.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(paginatedInstances.map(i => i.id))
    }
  }

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const canDelete = (status: string) => {
    return status === 'PENDING_SYNC' || status === 'UNBOUND'
  }

  const canSyncPoints = (status: string) => {
    return status === 'PENDING_SYNC' || status === 'RUNNING'
  }

  const canDispatch = (status: string) => {
    return status === 'PENDING_SYNC'
  }

  const canUndispatch = (status: string) => {
    return status === 'RUNNING' || status === 'OFFLINE'
  }

  const handleEdit = (instance: DeviceInstance) => {
    setSelectedInstance(instance)
    setIsEditModalOpen(true)
  }

  const handleChangeGateway = (instance: DeviceInstance) => {
    setSelectedInstance(instance)
    setIsChangeGatewayModalOpen(true)
  }

  const handleViewPoints = (instance: DeviceInstance) => {
    setSelectedInstance(instance)
    setIsViewPointsModalOpen(true)
  }

  const handleSyncPoints = async (instance: DeviceInstance) => {
    if (window.confirm(`确定要将实例 "${instance.name}" 的点位同步到最新模板版本吗？`)) {
      try {
        await syncPoints(instance.id)
        showToast('点位同步成功', 'success')
        fetchDeviceInstances()
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || '点位同步失败'
        showToast(errorMessage, 'error')
      }
    }
  }

  const handleDispatch = async (instance: DeviceInstance) => {
    if (window.confirm(`确定要下发配置到网关 "${instance.gateway?.name || instance.gatewayId}" 吗？`)) {
      try {
        await dispatchConfig({
          gatewayId: instance.gatewayId,
          deviceInstanceId: instance.id,
        })
        showToast('配置下发成功', 'success')
        fetchDeviceInstances()
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || '下发失败'
        showToast(errorMessage, 'error')
      }
    }
  }

  const handleUndispatch = async (instance: DeviceInstance) => {
    if (window.confirm(`确定要解除实例 "${instance.name}" 的配置下发吗？`)) {
      try {
        await undeployConfig({
          gatewayId: instance.gatewayId,
          deviceInstanceId: instance.id,
        })
        showToast('解除下发成功', 'success')
        fetchDeviceInstances()
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || '解除下发失败'
        showToast(errorMessage, 'error')
      }
    }
  }

  const handleDelete = (instance: DeviceInstance) => {
    if (window.confirm(`确定要删除实例 "${instance.name}" 吗？`)) {
      useDeviceInstanceStore.getState().deleteDeviceInstance(instance.id)
    }
  }

  const handleViewData = (instance: DeviceInstance) => {
    setSelectedInstance(instance)
    setIsDataPanelOpen(true)
  }

  const handleModalSuccess = () => {
    fetchDeviceInstances()
    setSelectedInstance(null)
    setSelectedIds([])
  }

  const handleSearch = () => {
    setPage(1)
  }

  const handleReset = () => {
    setSearchName('')
    setFilterModel('')
    setFilterGateway('')
    setFilterStatus('')
    setPage(1)
  }

  const handleViewDetail = (instance: DeviceInstance) => {
    setSelectedInstance(instance)
    setIsViewPointsModalOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      ONLINE: { label: '在线', className: 'bg-green-50 text-green-600' },
      RUNNING: { label: '采集中', className: 'bg-blue-50 text-blue-600' },
      OFFLINE: { label: '离线', className: 'bg-gray-100 text-gray-500' },
      ERROR: { label: '离线', className: 'bg-gray-100 text-gray-500' },
      PENDING: { label: '待配置', className: 'bg-yellow-50 text-yellow-600' },
      UNBOUND: { label: '未绑定', className: 'bg-yellow-50 text-yellow-600' },
      PENDING_SYNC: { label: '待同步', className: 'bg-orange-50 text-orange-600' },
      SYNCING: { label: '同步中', className: 'bg-blue-50 text-blue-600' },
    }
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备实例</h1>
          <p className="text-gray-500 mt-1">管理所有设备实例的创建、配置和数据采集</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 font-medium flex items-center gap-2 shadow-sm"
          >
            <i className="fas fa-plus"></i>新增设备
          </button>
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 shadow-sm"
          >
            <i className="fas fa-upload"></i>批量导入
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
        <div className="flex gap-5 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">实例名称</label>
            <input
              type="text"
              placeholder="搜索实例名称..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">模板名称</label>
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部</option>
              {deviceModels.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">网关名称</label>
            <select
              value={filterGateway}
              onChange={(e) => setFilterGateway(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部</option>
              {gateways.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">状态</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="ONLINE">在线</option>
              <option value="RUNNING">采集中</option>
              <option value="OFFLINE">离线</option>
              <option value="PENDING_SYNC">待同步</option>
            </select>
          </div>
          <button
            onClick={handleSearch}
            className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium"
          >
            查询
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm"
          >
            重置
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="fas fa-check-circle text-primary-500 text-lg"></i>
              <span className="text-sm text-gray-700">
                已选择 <span className="font-semibold text-primary-500">{selectedIds.length}</span> 个实例
              </span>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                <i className="fas fa-share-nodes mr-1.5"></i>批量分配网关
              </button>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                <i className="fas fa-exchange-alt mr-1.5"></i>批量变更网关
              </button>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                <i className="fas fa-paper-plane mr-1.5"></i>批量下发
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                取消选择
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-12 px-5 py-3.5">
                <input
                  type="checkbox"
                  checked={paginatedInstances.length > 0 && selectedIds.length === paginatedInstances.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-primary-500 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                />
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">实例名称</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">模板名称</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">网关名称</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">状态</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">最后同步</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                  <i className="fas fa-spinner fa-spin mr-2"></i>加载中...
                </td>
              </tr>
            )}
            {!loading && paginatedInstances.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
            {!loading && paginatedInstances.map((instance) => (
              <tr key={instance.id} className="hover:bg-gray-50 transition-colors">
                <td className="w-12 px-5 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(instance.id)}
                    onChange={() => handleSelectOne(instance.id)}
                    className="w-4 h-4 text-primary-500 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                  />
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => handleViewDetail(instance)}
                    className="font-semibold text-gray-900 hover:text-primary-500"
                  >
                    {instance.name}
                  </button>
                </td>
                <td className="px-5 py-4 text-gray-600 text-sm">
                  {instance.model?.name || '-'}
                </td>
                <td className="px-5 py-4 text-gray-600 text-sm">
                  {instance.gateway?.name || <span className="text-gray-400">未分配</span>}
                </td>
                <td className="px-5 py-4">
                  {getStatusBadge(instance.status)}
                </td>
                <td className="px-5 py-4 text-gray-600 text-sm">
                  {instance.lastSyncTime ? formatDate(instance.lastSyncTime) : '-'}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      onClick={() => handleEdit(instance)}
                      className="text-primary-500 hover:text-indigo-800 font-medium"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleChangeGateway(instance)}
                      className="text-gray-500 hover:text-primary-500 font-medium"
                    >
                      变更网关
                    </button>
                    <button
                      onClick={() => handleViewPoints(instance)}
                      className="text-gray-500 hover:text-primary-500 font-medium"
                    >
                      点位管理
                    </button>
                    {canSyncPoints(instance.status) && (
                      <button
                        onClick={() => handleSyncPoints(instance)}
                        className="text-primary-500 hover:text-indigo-800 font-medium"
                      >
                        同步模板版本
                      </button>
                    )}
                    {canDispatch(instance.status) && (
                      <button
                        onClick={() => handleDispatch(instance)}
                        className="text-gray-500 hover:text-primary-500 font-medium"
                      >
                        下发配置
                      </button>
                    )}
                    {(instance.status === 'RUNNING' || instance.status === 'ONLINE') && (
                      <button
                        onClick={() => handleViewData(instance)}
                        className="text-purple-500 hover:text-purple-700 font-medium"
                      >
                        查看数据
                      </button>
                    )}
                    {canUndispatch(instance.status) && (
                      <button
                        onClick={() => handleUndispatch(instance)}
                        className="text-orange-500 hover:text-orange-700 font-medium"
                      >
                        解除下发
                      </button>
                    )}
                    {canDelete(instance.status) && (
                      <button
                        onClick={() => handleDelete(instance)}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>共</span>
          <span className="font-medium text-gray-900">{filteredInstances.length}</span>
          <span>条记录</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                page === p
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <i className="fas fa-chevron-right text-xs"></i>
          </button>
        </div>
      </div>

      <DeviceInstanceCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <DeviceInstanceBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
      />

      {selectedInstance && (
        <>
          <ViewPointsModal
            isOpen={isViewPointsModalOpen}
            onClose={() => {
              setIsViewPointsModalOpen(false)
              setSelectedInstance(null)
            }}
            instance={selectedInstance}
          />

          <DeviceInstanceEditModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false)
              setSelectedInstance(null)
            }}
            instance={selectedInstance}
            onSuccess={handleModalSuccess}
          />

          <ChangeGatewayModal
            isOpen={isChangeGatewayModalOpen}
            onClose={() => {
              setIsChangeGatewayModalOpen(false)
              setSelectedInstance(null)
            }}
            instance={selectedInstance}
            onSuccess={handleModalSuccess}
          />

          <DeviceDataPanel
            isOpen={isDataPanelOpen}
            onClose={() => {
              setIsDataPanelOpen(false)
              setSelectedInstance(null)
            }}
            instance={selectedInstance!}
          />
        </>
      )}
    </div>
  )
}

export default DeviceInstanceList
