import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDeviceModelById } from '../../api/device-model.api'
import type { DeviceModel, Point } from '../../types'
import DeviceModelEditModal from './DeviceModelEditModal'
import ImportPointsModal from './ImportPointsModal'
import { showToast } from '../../utils/toast'

function DeviceModelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [model, setModel] = useState<DeviceModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

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

  useEffect(() => {
    loadModel()
  }, [id])

  const handleExportPoints = () => {
    if (!model) return
    const dataStr = JSON.stringify(model.points, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${model.name}-points.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('导出成功', 'success')
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
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-gray-500">模型不存在</span>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/device-models')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <i className="fas fa-arrow-left"></i>
        <span>返回列表</span>
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <i className="fas fa-edit text-gray-500"></i>
            <span>编辑</span>
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex">
              <span className="w-24 text-sm text-gray-500 flex-shrink-0">模型名称</span>
              <span className="text-sm text-gray-900 font-medium">{model.name}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-sm text-gray-500 flex-shrink-0">协议类型</span>
              <span className="text-sm text-gray-900">{model.protocol}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-sm text-gray-500 flex-shrink-0">模型ID</span>
              <span className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-0.5 rounded">{model.id}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-sm text-gray-500 flex-shrink-0">版本号</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                v{model.version}
              </span>
            </div>
            <div className="flex">
              <span className="w-24 text-sm text-gray-500 flex-shrink-0">创建时间</span>
              <span className="text-sm text-gray-900">{formatDate(model.createdAt)}</span>
            </div>
            <div className="flex col-span-2">
              <span className="w-24 text-sm text-gray-500 flex-shrink-0">备注</span>
              <span className="text-sm text-gray-900">{model.description || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">点位列表</h2>
            <p className="text-sm text-gray-500 mt-0.5">共 {model.points?.length || 0} 个点位</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <i className="fas fa-upload mr-1"></i>导入
            </button>
            <button
              onClick={handleExportPoints}
              className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <i className="fas fa-download mr-1"></i>导出
            </button>
            <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium transition-colors">
              <i className="fas fa-plus mr-1"></i>新增点位
            </button>
          </div>
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
              {model.points?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    暂无点位数据
                  </td>
                </tr>
              )}
              {model.points?.map((point: Point, index: number) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{point.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{point.code}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{point.address}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{point.dataType}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      point.type === 'read' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {point.type === 'read' ? '只读' : '读写'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{point.unit || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-sm">
                      <button className="text-primary-500 hover:text-indigo-800 font-medium">编辑</button>
                      <button className="text-red-500 hover:text-red-700 font-medium">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DeviceModelEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          loadModel()
        }}
        model={model}
      />

      <ImportPointsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        modelId={model.id}
        onImportSuccess={() => loadModel()}
      />
    </div>
  )
}

export default DeviceModelDetail
