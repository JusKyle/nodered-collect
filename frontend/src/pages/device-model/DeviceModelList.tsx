import { useEffect, useState } from 'react'
import { useDeviceModelStore } from '../../stores/device-model.store'
import { getDeviceModelUsage } from '../../api/device-model.api'
import DataTable from '../../components/DataTable'
import DeviceModelCreateModal from './DeviceModelCreateModal'
import DeviceModelEditModal from './DeviceModelEditModal'
import DeviceModelDuplicateModal from './DeviceModelDuplicateModal'
import ImportPointsModal from './ImportPointsModal'
import VersionHistoryModal from './VersionHistoryModal'
import DeleteModelConfirmBubble from './DeleteModelConfirmBubble'
import type { DeviceModel } from '../../types'

const PROTOCOLS = ['S7', 'Modbus TCP', 'OPC UA', 'MQTT', 'HTTP', 'CoAP', 'MTConnect', 'FOCAS', '自定义'] as const
const STATUS_OPTIONS = ['全部', '启用', '停用'] as const

function DeviceModelList() {
  const { deviceModels, loading, fetchDeviceModels, updateModelStatus } = useDeviceModelStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [protocolFilter, setProtocolFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // 弹窗状态
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<DeviceModel | null>(null)
  
  // 使用数量缓存
  const [usageMap, setUsageMap] = useState<Record<string, number>>({})
  
  // 批量选择
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    fetchDeviceModels()
  }, [fetchDeviceModels])

  // 获取使用数量
  useEffect(() => {
    if (deviceModels.length > 0) {
      deviceModels.forEach(async (model) => {
        try {
          const data = await getDeviceModelUsage(model.id)
          setUsageMap(prev => ({ ...prev, [model.id]: data.usage }))
        } catch (error) {
          console.error('获取使用数量失败:', error)
        }
      })
    }
  }, [deviceModels])

  // 筛选逻辑
  const filteredModels = deviceModels.filter((model) => {
    // 搜索筛选：名称、厂商、型号
    const searchMatch = searchTerm === '' || 
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.model.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 协议筛选
    const protocolMatch = protocolFilter === '' || model.protocol === protocolFilter
    
    // 状态筛选
    const statusMatch = statusFilter === '' || 
      statusFilter === '全部' ||
      (statusFilter === '启用' && model.status === 'ENABLED') ||
      (statusFilter === '停用' && model.status === 'DISABLED')
    
    return searchMatch && protocolMatch && statusMatch
  })

  // 状态切换
  const handleStatusToggle = async (model: DeviceModel) => {
    const newStatus = model.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
    try {
      await updateModelStatus(model.id, newStatus)
    } catch (error) {
      console.error('更新状态失败:', error)
    }
  }

  // 打开编辑弹窗
  const handleEdit = (model: DeviceModel) => {
    setSelectedModel(model)
    setIsEditModalOpen(true)
  }

  // 打开复制弹窗
  const handleDuplicate = (model: DeviceModel) => {
    setSelectedModel(model)
    setIsDuplicateModalOpen(true)
  }

  // 打开导入点位弹窗
  const handleImportPoints = (model: DeviceModel) => {
    setSelectedModel(model)
    setIsImportModalOpen(true)
  }

  // 打开版本历史弹窗
  const handleVersionHistory = (model: DeviceModel) => {
    setSelectedModel(model)
    setIsVersionModalOpen(true)
  }

  // 批量选择
  const handleSelectAll = () => {
    if (selectedIds.length === filteredModels.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredModels.map(m => m.id))
    }
  }

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // 批量停用
  const handleBatchDisable = async () => {
    if (selectedIds.length === 0) return
    for (const id of selectedIds) {
      try {
        await updateModelStatus(id, 'DISABLED')
      } catch (error) {
        console.error('批量停用失败:', error)
      }
    }
    setSelectedIds([])
  }

  const columns = [
    { key: 'checkbox', label: '' },
    { key: 'name', label: '名称' },
    { key: 'vendor', label: '厂商' },
    { key: 'model', label: '型号' },
    { key: 'protocol', label: '协议' },
    { key: 'status', label: '状态' },
    { key: 'pointCount', label: '点位数量' },
    { key: 'usage', label: '使用数量' },
    { key: 'actions', label: '操作' },
  ]

  const renderRow = (model: DeviceModel) => (
    <tr key={model.id} className="hover:bg-gray-50">
      <td className="px-4 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={selectedIds.includes(model.id)}
          onChange={() => handleSelectOne(model.id)}
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{model.name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{model.vendor}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{model.model}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {model.protocol}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={() => handleStatusToggle(model)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            model.status === 'ENABLED' ? 'bg-primary-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              model.status === 'ENABLED' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{model.points.length}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">
          {usageMap[model.id] !== undefined ? usageMap[model.id] : '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEdit(model)}
            className="text-primary-600 hover:text-primary-900 p-1"
            title="编辑"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => handleDuplicate(model)}
            className="text-gray-600 hover:text-gray-900 p-1"
            title="复制"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => handleImportPoints(model)}
            className="text-green-600 hover:text-green-900 p-1"
            title="导入点位"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
            </svg>
          </button>
          <button
            onClick={() => handleVersionHistory(model)}
            className="text-purple-600 hover:text-purple-900 p-1"
            title="版本历史"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <DeleteModelConfirmBubble
            model={model}
            onDelete={() => fetchDeviceModels()}
          />
        </div>
      </td>
    </tr>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备模型</h1>
          <p className="text-gray-500 mt-1">管理设备模型和点位配置</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            新建模型
          </button>
        </div>
      </div>

      {/* 搜索和筛选区域 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索名称、厂商、型号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* 协议筛选 */}
          <div className="min-w-[150px]">
            <select
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部协议</option>
              {PROTOCOLS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* 状态筛选 */}
          <div className="min-w-[120px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部状态</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 批量操作 */}
          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                已选择 {selectedIds.length} 项
              </span>
              <button
                onClick={handleBatchDisable}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                批量停用
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                取消选择
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 表格头部全选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center">
          <input
            type="checkbox"
            checked={selectedIds.length === filteredModels.length && filteredModels.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-500">全选</span>
        </div>
        
        <DataTable
          columns={columns}
          data={filteredModels}
          renderRow={renderRow}
          loading={loading}
        />
      </div>

      {/* 弹窗组件 */}
      <DeviceModelCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <DeviceModelEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        model={selectedModel}
      />

      <DeviceModelDuplicateModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        model={selectedModel}
        onDuplicateSuccess={() => fetchDeviceModels()}
      />

      <ImportPointsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        modelId={selectedModel?.id || ''}
        onImportSuccess={() => fetchDeviceModels()}
      />

      <VersionHistoryModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        modelId={selectedModel?.id || ''}
        modelName={selectedModel?.name || ''}
      />
    </div>
  )
}

export default DeviceModelList