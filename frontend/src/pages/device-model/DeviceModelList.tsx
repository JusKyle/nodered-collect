import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeviceModelStore } from '../../stores/device-model.store'
import DeviceModelCreateModal from './DeviceModelCreateModal'
import DeviceModelEditModal from './DeviceModelEditModal'
import DeviceModelDuplicateModal from './DeviceModelDuplicateModal'
import ImportPointsModal from './ImportPointsModal'
import VersionHistoryModal from './VersionHistoryModal'
import DeleteModelConfirmBubble from './DeleteModelConfirmBubble'
import type { DeviceModel } from '../../types'

const PROTOCOLS = ['Modbus TCP', 'Modbus RTU', 'S7', 'OPC UA', 'MQTT', 'TCP', 'HTTP', 'CoAP', 'MTConnect', 'FOCAS', '自定义'] as const

function DeviceModelList() {
  const navigate = useNavigate()
  const { deviceModels, loading, fetchDeviceModels } = useDeviceModelStore()
  const [searchName, setSearchName] = useState('')
  const [filterProtocol, setFilterProtocol] = useState('')
  const [filterName, setFilterName] = useState('')
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<DeviceModel | null>(null)

  useEffect(() => {
    fetchDeviceModels()
  }, [fetchDeviceModels])

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

  const handleSearch = () => {
    setFilterName(searchName)
  }

  const handleReset = () => {
    setSearchName('')
    setFilterProtocol('')
    setFilterName('')
  }

  const filteredModels = deviceModels.filter((model) => {
    const nameMatch = filterName === '' || 
      model.name.toLowerCase().includes(filterName.toLowerCase())
    const protocolMatch = filterProtocol === '' || model.protocol === filterProtocol
    return nameMatch && protocolMatch
  })

  const handleEdit = (model: DeviceModel) => {
    setSelectedModel(model)
    setIsEditModalOpen(true)
  }

  const handleDuplicate = (model: DeviceModel) => {
    setSelectedModel(model)
    setIsDuplicateModalOpen(true)
  }

  const handleImportPoints = (model: DeviceModel) => {
    setSelectedModel(model)
    setIsImportModalOpen(true)
  }

  const handleVersionHistory = (model: DeviceModel) => {
    setSelectedModel(model)
    setIsVersionModalOpen(true)
  }

  const handleViewDetail = (model: DeviceModel) => {
    navigate(`/device-models/${model.id}`)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备模型</h1>
          <p className="text-gray-500 mt-1">管理设备采集模板和点位配置</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 font-medium flex items-center gap-2 shadow-sm"
          >
            <i className="fas fa-plus"></i>新建模板
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
        <div className="flex gap-5 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">模板名称</label>
            <input
              type="text"
              placeholder="搜索模板名称"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">协议类型</label>
            <select
              value={filterProtocol}
              onChange={(e) => setFilterProtocol(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部</option>
              {PROTOCOLS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模板名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">协议类型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">点位数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">版本号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <i className="fas fa-spinner fa-spin mr-2"></i>加载中...
                </td>
              </tr>
            )}
            {!loading && filteredModels.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
            {!loading && filteredModels.map((model) => (
              <tr key={model.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleViewDetail(model)}
                    className="text-sm font-semibold text-gray-900 hover:text-primary-500"
                  >
                    {model.name}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {model.protocol}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {model.points?.length || 0}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                    v{model.version || '1.0'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(model.createdAt)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      onClick={() => handleEdit(model)}
                      className="text-primary-500 hover:text-indigo-800 font-medium"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDuplicate(model)}
                      className="text-gray-500 hover:text-primary-500 font-medium"
                    >
                      复制
                    </button>
                    <button
                      onClick={() => handleImportPoints(model)}
                      className="text-gray-500 hover:text-primary-500 font-medium"
                    >
                      导入点位
                    </button>
                    <button
                      onClick={() => handleVersionHistory(model)}
                      className="text-gray-500 hover:text-primary-500 font-medium"
                    >
                      版本历史
                    </button>
                    <DeleteModelConfirmBubble
                      model={model}
                      onDelete={() => fetchDeviceModels()}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
