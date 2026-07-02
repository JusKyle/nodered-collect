import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createPoint, deletePoint, exportPoints as exportModelPoints, getDeviceModelById, getModelPoints, updatePoint } from '../../api/device-model.api'
import type { DeviceModel, Point } from '../../types'
import DeviceModelEditModal from './DeviceModelEditModal'
import ImportPointsModal from './ImportPointsModal'
import PointModal from './components/PointModal'
import { showToast } from '../../utils/toast'

const getPointAccess = (point: Point) => point.readWrite || point.config?.access || point.config?.readWrite || '只读'

function DeviceModelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [model, setModel] = useState<DeviceModel | null>(null)
  const [points, setPoints] = useState<Point[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [searchName, setSearchName] = useState('')
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isCreatePointOpen, setIsCreatePointOpen] = useState(false)
  const [editingPoint, setEditingPoint] = useState<Point | null>(null)
  const [editingPointIndex, setEditingPointIndex] = useState<number>(-1)

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

  const loadModel = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getDeviceModelById(id)
      setModel(data)
    } catch (error: any) {
      showToast(error.response?.data?.message || '加载模型失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadPoints = async (nextPage = page) => {
    if (!id) return
    const result = await getModelPoints(id, { name: searchName || undefined, page: nextPage, pageSize })
    setPoints(result.list)
    setTotal(result.total)
    setPage(result.page)
  }

  const reloadAll = async () => {
    await loadModel()
    await loadPoints(1)
  }

  useEffect(() => {
    reloadAll()
  }, [id])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handleExportPoints = async () => {
    if (!id) return
    const blob = await exportModelPoints(id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${model?.name || 'points'}-points.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('导出成功', 'success')
  }

  const handleCreatePoint = async (data: Partial<Point>) => {
    if (!id) return
    await createPoint(id, data)
    showToast('保存成功', 'success')
    await reloadAll()
  }

  const handleUpdatePoint = async (data: Partial<Point>) => {
    if (!id || editingPointIndex < 0) return
    await updatePoint(id, editingPointIndex, data)
    showToast('保存成功', 'success')
    setEditingPoint(null)
    setEditingPointIndex(-1)
    await reloadAll()
  }

  const handleDeletePoint = async (index: number, point: Point) => {
    if (!id) return
    if (!window.confirm(`确定删除点位「${point.name}」吗？`)) return
    await deletePoint(id, index)
    showToast('删除成功', 'success')
    await reloadAll()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <i className="fas fa-spinner fa-spin text-primary-500 text-2xl mr-3"></i>
        <span className="text-gray-500">加载中...</span>
      </div>
    )
  }

  if (!model) {
    return <div className="flex items-center justify-center h-64"><span className="text-gray-500">模型不存在</span></div>
  }

  return (
    <div>
      <button onClick={() => navigate('/device-models')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <i className="fas fa-arrow-left"></i><span>返回列表</span>
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
          <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <i className="fas fa-edit text-gray-500"></i><span>编辑</span>
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex"><span className="w-24 text-sm text-gray-500 flex-shrink-0">模型名称</span><span className="text-sm text-gray-900 font-medium">{model.name}</span></div>
            <div className="flex"><span className="w-24 text-sm text-gray-500 flex-shrink-0">协议类型</span><span className="text-sm text-gray-900">{model.protocol}</span></div>
            <div className="flex"><span className="w-24 text-sm text-gray-500 flex-shrink-0">模型ID</span><span className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-0.5 rounded">{model.modelDI || model.model}</span></div>
            <div className="flex"><span className="w-24 text-sm text-gray-500 flex-shrink-0">版本号</span><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">v{model.version}</span></div>
            <div className="flex"><span className="w-24 text-sm text-gray-500 flex-shrink-0">创建时间</span><span className="text-sm text-gray-900">{formatDate(model.createdAt)}</span></div>
            <div className="flex col-span-2"><span className="w-24 text-sm text-gray-500 flex-shrink-0">备注</span><span className="text-sm text-gray-900">{model.description || '-'}</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">点位列表</h2>
            <p className="text-sm text-gray-500 mt-0.5">共 {total} 个点位</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsImportModalOpen(true)} className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><i className="fas fa-upload mr-1"></i>导入</button>
            <button onClick={handleExportPoints} className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><i className="fas fa-download mr-1"></i>导出</button>
            <button onClick={() => setIsCreatePointOpen(true)} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium transition-colors"><i className="fas fa-plus mr-1"></i>新增点位</button>
          </div>
        </div>

        <div className="px-6 py-4 border-b bg-gray-50 flex gap-3">
          <input value={searchName} onChange={(event) => setSearchName(event.target.value)} placeholder="按名称/标识搜索" className="w-72 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <button onClick={() => loadPoints(1)} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm">查询</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">点位名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">地址</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">数据类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">读写权限</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">单位</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {points.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">暂无点位，点击新增</td></tr>}
              {points.map((point, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{point.name}</div><div className="text-xs text-gray-400 mt-0.5">{point.tag || point.code}</div></td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{point.address}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{point.dataType}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{getPointAccess(point)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{point.unit || '-'}</td>
                  <td className="px-6 py-4"><div className="flex items-center gap-3 text-sm"><button onClick={() => { setEditingPoint(point); setEditingPointIndex(index) }} className="text-primary-500 hover:text-indigo-800 font-medium">编辑</button><button onClick={() => handleDeletePoint(index, point)} className="text-red-500 hover:text-red-700 font-medium">删除</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 text-sm text-gray-600">
          <span>共 {total} 条，第 {page} / {totalPages} 页</span>
          <div className="flex gap-2">
            <button onClick={() => loadPoints(page - 1)} disabled={page <= 1} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-50">上一页</button>
            <button onClick={() => loadPoints(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-50">下一页</button>
          </div>
        </div>
      </div>

      <DeviceModelEditModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); reloadAll() }} model={model} />
      <ImportPointsModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} modelId={model.id} onImportSuccess={() => reloadAll()} />
      <PointModal isOpen={isCreatePointOpen} title="新增点位" protocol={model.protocol} onClose={() => setIsCreatePointOpen(false)} onSubmit={handleCreatePoint} />
      <PointModal isOpen={!!editingPoint} title="编辑点位" protocol={model.protocol} point={editingPoint} onClose={() => setEditingPoint(null)} onSubmit={handleUpdatePoint} />
    </div>
  )
}

export default DeviceModelDetail
