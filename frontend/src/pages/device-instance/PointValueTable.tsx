import type { PointValue } from '../../api/device-data.api'

interface PointValueTableProps {
  points: PointValue[]
  loading?: boolean
}

const qualityLabel: Record<number, { text: string; className: string }> = {
  0: { text: 'Good', className: 'bg-green-100 text-green-700' },
  1: { text: 'Bad', className: 'bg-red-100 text-red-700' },
  2: { text: 'Uncertain', className: 'bg-yellow-100 text-yellow-700' },
  [-1]: { text: '无数据', className: 'bg-gray-100 text-gray-500' }
}

function PointValueTable({ points, loading }: PointValueTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-gray-500">加载中...</span>
      </div>
    )
  }

  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500">
        <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>暂无点位数据</p>
        <p className="text-sm mt-1">请确保设备已下发并正在采集数据</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">点位名称</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">编码</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">当前值</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">质量</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">更新时间</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {points.map((point) => {
            const q = point.quality ?? -1
            const qInfo = qualityLabel[q] || qualityLabel[-1]
            return (
              <tr key={point.code} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{point.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{point.code}</td>
                <td className="px-4 py-3">
                  {point.value !== null ? (
                    <span className="text-sm font-semibold text-gray-900 font-mono">
                      {point.value}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 italic">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{point.dataType}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${qInfo.className}`}>
                    {qInfo.text}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {point.timestamp ? new Date(point.timestamp).toLocaleString() : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default PointValueTable
