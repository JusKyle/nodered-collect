import { useEffect, useState } from 'react'
import { useDeviceInstanceStore } from '../../stores/device-instance.store'
import DataTable from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import DeviceInstanceCreateModal from './DeviceInstanceCreateModal'
import DeviceInstanceBatchModal from './DeviceInstanceBatchModal'
import DeviceInstanceEditModal from './DeviceInstanceEditModal'
import ChangeGatewayModal from './ChangeGatewayModal'
import ViewPointsModal from './ViewPointsModal'
import DispatchConfirmBubble from '../sync/DispatchConfirmBubble'
import UndispatchConfirmBubble from '../sync/UndispatchConfirmBubble'
import SyncPointsConfirmBubble from './SyncPointsConfirmBubble'
import DeviceDataPanel from './DeviceDataPanel'
import type { DeviceInstance } from '../../types'

function DeviceInstanceList() {
  const { deviceInstances, loading, fetchDeviceInstances } = useDeviceInstanceStore()

  // 弹窗状态管理
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [isViewPointsModalOpen, setIsViewPointsModalOpen] = useState(false)
  const [isChangeGatewayModalOpen, setIsChangeGatewayModalOpen] = useState(false)
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false)
  const [isUndispatchModalOpen, setIsUndispatchModalOpen] = useState(false)
  const [isSyncPointsModalOpen, setIsSyncPointsModalOpen] = useState(false)
  const [isDataPanelOpen, setIsDataPanelOpen] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<DeviceInstance | null>(null)

  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchDeviceInstances()
  }, [fetchDeviceInstances])

  // 筛选逻辑
  const filteredInstances = deviceInstances.filter((instance) => {
    // 搜索过滤：名称/模型名称/网关名称
    const matchesSearch =
      instance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (instance.model?.name && instance.model.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (instance.gateway?.name && instance.gateway.name.toLowerCase().includes(searchTerm.toLowerCase()))

    // 状态下拉过滤
    const matchesStatus =
      statusFilter === 'all' ||
      instance.status === statusFilter ||
      (statusFilter === '未绑定' && (instance.status === 'PENDING' || instance.status === 'UNBOUND')) ||
      (statusFilter === '待同步' && instance.status === 'PENDING_SYNC') ||
      (statusFilter === '运行中' && instance.status === 'RUNNING') ||
      (statusFilter === '离线' && (instance.status === 'OFFLINE' || instance.status === 'ERROR'))

    return matchesSearch && matchesStatus
  })

  // 判断实例是否可以删除
  const canDelete = (status: string) => {
    return status === 'PENDING_SYNC' || status === 'UNBOUND'
  }

  // 判断实例是否可以同步点位
  const canSyncPoints = (status: string) => {
    return status === 'PENDING_SYNC' || status === 'RUNNING'
  }

  // 判断实例是否可以下发配置
  const canDispatch = (status: string) => {
    return status === 'PENDING_SYNC'
  }

  // 判断实例是否可以解除下发
  const canUndispatch = (status: string) => {
    return status === 'RUNNING' || status === 'OFFLINE'
  }

  // 处理操作按钮点击
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

  const handleSyncPoints = (instance: DeviceInstance) => {
    setSelectedInstance(instance)
    setIsSyncPointsModalOpen(true)
  }

  const handleDispatch = (instance: DeviceInstance) => {
    setSelectedInstance(instance)
    setIsDispatchModalOpen(true)
  }

  const handleUndispatch = (instance: DeviceInstance) => {
    setSelectedInstance(instance)
    setIsUndispatchModalOpen(true)
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
  }

  const columns = [
    { key: 'name', label: '名称' },
    { key: 'model', label: '设备模型' },
    { key: 'gateway', label: '所属网关' },
    { key: 'status', label: '状态' },
    { key: 'lastSyncTime', label: '最后同步' },
    { key: 'actions', label: '操作' },
  ]

  const renderRow = (instance: DeviceInstance) => (
    <tr key={instance.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{instance.name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{instance.model?.name || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{instance.gateway?.name || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={instance.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">
          {instance.lastSyncTime ? new Date(instance.lastSyncTime).toLocaleString() : '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          className="text-primary-600 hover:text-primary-900 mr-4"
          onClick={() => handleEdit(instance)}
        >
          编辑
        </button>
        <button
          className="text-primary-600 hover:text-primary-900 mr-4"
          onClick={() => handleChangeGateway(instance)}
        >
          更改网关
        </button>
        <button
          className="text-primary-600 hover:text-primary-900 mr-4"
          onClick={() => handleViewPoints(instance)}
        >
          查看点位
        </button>
        {canSyncPoints(instance.status) && (
          <button
            className="text-blue-600 hover:text-blue-900 mr-4"
            onClick={() => handleSyncPoints(instance)}
          >
            同步点位
          </button>
        )}
        {canDispatch(instance.status) && (
          <button
            className="text-green-600 hover:text-green-900 mr-4"
            onClick={() => handleDispatch(instance)}
          >
            下发配置
          </button>
        )}
        {(instance.status === 'RUNNING' || instance.status === 'ONLINE') && (
          <button
            className="text-purple-600 hover:text-purple-900 mr-4"
            onClick={() => handleViewData(instance)}
          >
            查看数据
          </button>
        )}
        {canUndispatch(instance.status) && (
          <button
            className="text-orange-600 hover:text-orange-900 mr-4"
            onClick={() => handleUndispatch(instance)}
          >
            解除下发
          </button>
        )}
        {canDelete(instance.status) && (
          <button
            className="text-red-600 hover:text-red-900"
            onClick={() => handleDelete(instance)}
          >
            删除
          </button>
        )}
      </td>
    </tr>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备实例</h1>
          <p className="text-gray-500 mt-1">管理所有设备实例</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="搜索实例..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">全部状态</option>
            <option value="未绑定">未绑定</option>
            <option value="待同步">待同步</option>
            <option value="运行中">运行中</option>
            <option value="离线">离线</option>
          </select>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            新增实例
          </button>
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            批量导入
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredInstances}
        renderRow={renderRow}
        loading={loading}
      />

      {/* 弹窗 */}
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

          <DispatchConfirmBubble
            instance={selectedInstance}
            onDispatchSuccess={handleModalSuccess}
          />

          <UndispatchConfirmBubble
            instance={selectedInstance}
            onUndispatchSuccess={handleModalSuccess}
          />

          <SyncPointsConfirmBubble
            instance={selectedInstance}
            onSyncSuccess={handleModalSuccess}
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
