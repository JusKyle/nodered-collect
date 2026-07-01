import { useEffect, useState } from 'react'
import { useDeviceModelStore } from '../../stores/device-model.store'
import { createPoint, deletePoint, exportPoints as exportModelPoints, getModelPoints, updatePoint } from '../../api/device-model.api'
import DeviceModelCreateModal from './DeviceModelCreateModal'
import DeviceModelEditModal from './DeviceModelEditModal'
import DeviceModelDuplicateModal from './DeviceModelDuplicateModal'
import ImportPointsModal from './ImportPointsModal'
import DeleteModelConfirmBubble from './DeleteModelConfirmBubble'
import PointModal from './components/PointModal'
import { showToast } from '../../utils/toast'
import type { DeviceModel, Point } from '../../types'

const PROTOCOLS = [
  { label: 'Modbus TCP', value: 'MODBUS_TCP' },
  { label: 'Modbus RTU', value: 'MODBUS_RTU' },
  { label: 'S7', value: 'S7' },
  { label: 'OPC UA', value: 'OPC_UA' },
  { label: 'MQTT', value: 'MQTT' },
  { label: 'TCP', value: 'TCP' },
]

const getPointAccess = (point: Point) => point.readWrite || point.config?.access || point.config?.readWrite || '只读'

function DeviceModelList() {
  const { deviceModels, loading, fetchDeviceModels, total, page, pageSize } = useDeviceModelStore()
  const [searchName, setSearchName] = useState('')
  const [filterProtocol, setFilterProtocol] = useState('')

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false)
  const [isCreatePointOpen, setIsCreatePointOpen] = useState(false)
  const [editingPoint, setEditingPoint] = useState<Point | null>(null)
  const [selectedModel, setSelectedModel] = useState<DeviceModel | null>(null)
  const [points, setPoints] = useState<Point[]>([])
  const [pointsTotal, setPointsTotal] = useState(0)
  const [pointsLoading, setPointsLoading] = useState(false)

  useEffect(() => {
    fetchDeviceModels({ page: 1, pageSize })
  }, [fetchDeviceModels, pageSize])

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

  const queryModels = (nextPage = 1) => {
    fetchDeviceModels({
      name: searchName || undefined,
      protocol: filterProtocol || undefined,
      page: nextPage,
      pageSize,
    })
  }

  const handleReset = () => {
    setSearchName('')
    setFilterProtocol('')
    fetchDeviceModels({ page: 1, pageSize })
  }

  const loadPoints = async (model = selectedModel) => {
    if (!model?.id) return
    setPointsLoading(true)
    try {
      const result = await getModelPoints(model.id, { page: 1, pageSize: 1000 })
      setPoints(result.list)
      setPointsTotal(result.total)
    } catch (error: any) {
      showToast(error.response?.data?.message || '加载点位失败', 'error')
    } finally {
      setPointsLoading(false)
    }
  }

  const handleOpenPoints = async (model: DeviceModel) => {
    setSelectedModel(model)
    setIsPointsModalOpen(true)
    await loadPoints(model)
  }

  const closePointsModal = () => {
    setIsPointsModalOpen(false)
    setSelectedModel(null)
    setPoints([])
    setPointsTotal(0)
  }

  const handleCreatePoint = async (data: Partial<Point>) => {
    if (!selectedModel?.id) return
    await createPoint(selectedModel.id, data)
    showToast('保存成功', 'success')
    await loadPoints(selectedModel)
    queryModels(page)
  }

  const handleUpdatePoint = async (data: Partial<Point>) => {
    if (!selectedModel?.id || !editingPoint?.id) return
    await updatePoint(selectedModel.id, editingPoint.id, data)
    showToast('保存成功', 'success')
    setEditingPoint(null)
    await loadPoints(selectedModel)
    queryModels(page)
  }

  const handleDeletePoint = async (point: Point) => {
    if (!selectedModel?.id || !point.id) return
    if (!window.confirm(`确定删除点位「${point.name}」吗？`)) return
    await deletePoint(selectedModel.id, point.id)
    showToast('删除成功', 'success')
    await loadPoints(selectedModel)
    queryModels(page)
  }

  const handleExportPoints = async () => {
    if (!selectedModel?.id) return
    const blob = await exportModelPoints(selectedModel.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedModel.name || 'points'}-points.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('导出成功', 'success')
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备模型</h1>
          <p className="text-gray-500 mt-1">管理设备采集模板和点位配置</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 font-medium flex items-center gap-2 shadow-sm"
        >
          <i className="fas fa-plus"></i>新建模板
        </button>
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
              {PROTOCOLS.map((protocol) => (
                <option key={protocol.value} value={protocol.value}>{protocol.label}</option>
              ))}
            </select>
          </div>
          <button onClick={() => queryModels(1)} className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium">
            查询
          </button>
          <button onClick={handleReset} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm">
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
            {!loading && deviceModels.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">暂无数据</td>
              </tr>
            )}
            {!loading && deviceModels.map((model) => (
              <tr key={model.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-gray-900">{model.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 font-mono">{model.modelDI || model.model}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {model.protocol}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{model.pointCount ?? model.points?.length ?? 0}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                    v{model.version || 1}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(model.createdAt)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 text-sm">
                    <button onClick={() => handleOpenPoints(model)} className="text-primary-500 hover:text-indigo-800 font-medium">点位</button>
                    <button onClick={() => { setSelectedModel(model); setIsEditModalOpen(true) }} className="text-gray-500 hover:text-primary-500 font-medium">编辑</button>
                    <button onClick={() => { setSelectedModel(model); setIsDuplicateModalOpen(true) }} className="text-gray-500 hover:text-primary-500 font-medium">复制</button>
                    <DeleteModelConfirmBubble model={model} onDelete={() => queryModels(page)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 text-sm text-gray-600">
          <span>共 {total} 条，第 {page} / {totalPages} 页</span>
          <div className="flex gap-2">
            <button
              onClick={() => queryModels(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              上一页
            </button>
            <button
              onClick={() => queryModels(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {isPointsModalOpen && selectedModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={closePointsModal}></div>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col mx-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">点位管理</h3>
                <p className="text-sm text-gray-500 mt-0.5">{selectedModel.name} - 编辑点位信息，保存后将升级版本号</p>
              </div>
              <button onClick={closePointsModal} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">共 {pointsTotal} 个点位</div>
              <div className="flex gap-2">
                <button onClick={() => setIsImportModalOpen(true)} className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><i className="fas fa-upload mr-1"></i>导入点位</button>
                <button onClick={handleExportPoints} className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><i className="fas fa-download mr-1"></i>导出点位</button>
                <button onClick={() => setIsCreatePointOpen(true)} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium transition-colors"><i className="fas fa-plus mr-1"></i>新增点位</button>
              </div>
            </div>

            <div className="overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">点位名称</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">地址</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数据类型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">读写权限</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">单位</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pointsLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>}
                  {!pointsLoading && points.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">暂无点位，点击新增</td></tr>}
                  {!pointsLoading && points.map((point) => (
                    <tr key={point.id || point.tag} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3"><div className="text-sm font-medium text-gray-900">{point.name}</div><div className="text-xs text-gray-400 mt-0.5">{point.tag || point.code}</div></td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{point.address}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{point.dataType}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{getPointAccess(point)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{point.unit || '-'}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-3 text-sm"><button onClick={() => setEditingPoint(point)} className="text-primary-500 hover:text-indigo-800 font-medium">编辑</button><button onClick={() => handleDeletePoint(point)} className="text-red-500 hover:text-red-700 font-medium">删除</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <DeviceModelCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <DeviceModelEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} model={selectedModel} />
      <DeviceModelDuplicateModal isOpen={isDuplicateModalOpen} onClose={() => setIsDuplicateModalOpen(false)} model={selectedModel} onDuplicateSuccess={() => queryModels(page)} />
      <ImportPointsModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} modelId={selectedModel?.id || ''} onImportSuccess={() => { loadPoints(); queryModels(page) }} />
      <PointModal isOpen={isCreatePointOpen} title="新增点位" protocol={selectedModel?.protocol || ''} onClose={() => setIsCreatePointOpen(false)} onSubmit={handleCreatePoint} />
      <PointModal isOpen={!!editingPoint} title="编辑点位" protocol={selectedModel?.protocol || ''} point={editingPoint} onClose={() => setEditingPoint(null)} onSubmit={handleUpdatePoint} />
    </div>
  )
}

export default DeviceModelList
