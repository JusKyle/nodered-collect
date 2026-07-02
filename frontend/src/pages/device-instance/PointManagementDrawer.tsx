import { useEffect, useState } from 'react'
import { getMergedPoints, createDevicePoint, updateDevicePoint, deleteDevicePoint } from '../../api/device-instance.api'
import { showToast } from '../../utils/toast'
import type { DeviceInstanceListItem, MergedPointItem } from '../../api/device-instance.api'

interface PointManagementDrawerProps {
  isOpen: boolean
  onClose: () => void
  instance: DeviceInstanceListItem | null
}

function PointManagementDrawer({ isOpen, onClose, instance }: PointManagementDrawerProps) {
  const [points, setPoints] = useState<MergedPointItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddMode, setIsAddMode] = useState(false)
  const [editingPoint, setEditingPoint] = useState<MergedPointItem | null>(null)

  const [formData, setFormData] = useState({ name: '', tag: '', dataType: 'FLOAT32', address: '', unit: '', description: '' })

  useEffect(() => {
    if (isOpen && instance) fetchPoints()
  }, [isOpen, instance])

  const fetchPoints = async () => {
    if (!instance) return
    setLoading(true)
    try {
      const data = await getMergedPoints(instance.id)
      setPoints(data)
    } catch {
      showToast('加载点位失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPoint = async () => {
    if (!instance || !formData.tag) return
    try {
      await createDevicePoint(instance.id, formData)
      showToast('添加成功', 'success')
      setIsAddMode(false)
      setFormData({ name: '', tag: '', dataType: 'FLOAT32', address: '', unit: '', description: '' })
      fetchPoints()
    } catch (error: any) {
      showToast(error.response?.data?.message || '添加失败', 'error')
    }
  }

  const handleUpdatePoint = async () => {
    if (!editingPoint) return
    try {
      await updateDevicePoint(editingPoint.id, formData)
      showToast('更新成功', 'success')
      setEditingPoint(null)
      setFormData({ name: '', tag: '', dataType: 'FLOAT32', address: '', unit: '', description: '' })
      fetchPoints()
    } catch (error: any) {
      showToast(error.response?.data?.message || '更新失败', 'error')
    }
  }

  const handleDeletePoint = async (pointId: string) => {
    if (!window.confirm('确定删除该点位吗？')) return
    try {
      await deleteDevicePoint(pointId)
      showToast('删除成功', 'success')
      fetchPoints()
    } catch {
      showToast('删除失败', 'error')
    }
  }

  const startEdit = (point: MergedPointItem) => {
    setEditingPoint(point)
    setFormData({ name: point.name, tag: point.tag, dataType: point.dataType, address: point.address, unit: point.unit || '', description: point.description || '' })
  }

  const cancelEdit = () => {
    setIsAddMode(false)
    setEditingPoint(null)
    setFormData({ name: '', tag: '', dataType: 'FLOAT32', address: '', unit: '', description: '' })
  }

  if (!isOpen || !instance) return null

  return (
    <div className={`fixed inset-y-0 right-0 w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">点位管理 - {instance.name}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* 添加点位区域 */}
        {(isAddMode || editingPoint) && editingPoint?.source !== 'TEMPLATE' && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">点位名称</label>
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">标识(tag)</label>
                <input value={formData.tag} onChange={(e) => setFormData({ ...formData, tag: e.target.value })} disabled={!!editingPoint} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">数据类型</label>
                <select value={formData.dataType} onChange={(e) => setFormData({ ...formData, dataType: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="FLOAT32">FLOAT32</option>
                  <option value="INT16">INT16</option>
                  <option value="UINT16">UINT16</option>
                  <option value="BOOL">BOOL</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">地址</label>
                <input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={cancelEdit} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={editingPoint ? handleUpdatePoint : handleAddPoint} className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-indigo-600">{editingPoint ? '更新' : '添加'}</button>
            </div>
          </div>
        )}

        {/* 点位列表 */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500">共 {points.length} 个点位</span>
              {!isAddMode && !editingPoint && (
                <button onClick={() => setIsAddMode(true)} className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-indigo-600">
                  <i className="fas fa-plus mr-1"></i>添加点位
                </button>
              )}
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>加载中...</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">点位名称</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">标识</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">数据类型</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">地址</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">来源</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {points.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{p.name}</td>
                      <td className="px-4 py-3 text-sm">{p.tag}</td>
                      <td className="px-4 py-3 text-sm">{p.dataType}</td>
                      <td className="px-4 py-3 text-sm">{p.address}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.source === 'TEMPLATE' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                          {p.source === 'TEMPLATE' ? '模板级' : '设备级'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.source === 'DEVICE' && (
                          <div className="flex gap-2 text-sm">
                            <button onClick={() => startEdit(p)} className="text-primary-500 hover:text-indigo-800">编辑</button>
                            <button onClick={() => handleDeletePoint(p.id)} className="text-red-500 hover:text-red-700">删除</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PointManagementDrawer