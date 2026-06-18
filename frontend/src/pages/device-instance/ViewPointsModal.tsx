import { useState, useMemo } from 'react'
import type { DeviceInstance, Point } from '../../types'

interface ViewPointsModalProps {
  isOpen: boolean
  onClose: () => void
  instance: DeviceInstance
}

type FilterType = 'all' | 'inherited' | 'custom'

interface PointWithSource extends Point {
  source: 'inherited' | 'custom'
}

function ViewPointsModal({ isOpen, onClose, instance }: ViewPointsModalProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  const allPoints = useMemo<PointWithSource[]>(() => {
    const inheritedPoints: PointWithSource[] = (instance as any).points?.map((p: Point) => ({
      ...p,
      source: 'inherited' as const
    })) || []

    const customPoints: PointWithSource[] = (instance as any).customPoints?.map((p: Point) => ({
      ...p,
      source: 'custom' as const
    })) || []

    if (inheritedPoints.length === 0 && customPoints.length === 0 && instance.model?.points) {
      return instance.model.points.map((p: Point) => ({
        ...p,
        source: 'inherited' as const
      }))
    }

    return [...inheritedPoints, ...customPoints]
  }, [instance])

  const filteredPoints = useMemo(() => {
    if (filter === 'all') return allPoints
    return allPoints.filter(p => p.source === filter)
  }, [allPoints, filter])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">查看点位 - {instance.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex space-x-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              全部 ({allPoints.length})
            </button>
            <button
              onClick={() => setFilter('inherited')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'inherited'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              仅继承 ({allPoints.filter(p => p.source === 'inherited').length})
            </button>
            <button
              onClick={() => setFilter('custom')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'custom'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              仅自定义 ({allPoints.filter(p => p.source === 'custom').length})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredPoints.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              暂无点位数据
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">来源</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">编码</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">地址</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">读写类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数据类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">单位</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPoints.map((point, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          point.source === 'inherited'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {point.source === 'inherited' ? '继承' : '自定义'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{point.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{point.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{point.address}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{point.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{point.dataType}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{point.unit || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{point.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default ViewPointsModal
