import { useEffect, useState } from 'react'
import { getPerformanceHistory } from '../../api/gateway.api'
import type { PerformancePoint } from '../../api/gateway.api'

interface PerformanceMonitorProps {
  gatewayId: string
}

const intervalOptions = [
  { value: '5m', label: '5分钟' },
  { value: '15m', label: '15分钟' },
  { value: '1h', label: '1小时' },
  { value: '1d', label: '1天' }
]

function PerformanceMonitor({ gatewayId }: PerformanceMonitorProps) {
  const [data, setData] = useState<PerformancePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [interval, setIntervalVal] = useState<'5m' | '15m' | '1h' | '1d'>('5m')

  useEffect(() => {
    loadData()
  }, [gatewayId, interval])

  const loadData = async () => {
    if (!gatewayId) return
    setLoading(true)
    try {
      const result = await getPerformanceHistory({
        gatewayId,
        interval
      })
      setData(result)
    } catch (error) {
      console.error('加载性能数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const latest = data.length > 0 ? data[data.length - 1] : null

  const renderMiniChart = (
    values: (number | null)[],
    color: string,
    label: string
  ) => {
    const validValues = values.filter(v => v !== null) as number[]
    if (validValues.length === 0) {
      return (
        <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
          暂无数据
        </div>
      )
    }

    const max = Math.max(...validValues, 1)
    const min = 0
    const width = 100
    const height = 80
    const padding = 4

    const points = values.map((v, i) => {
      if (v === null) return null
      const x = (i / (values.length - 1 || 1)) * (width - padding * 2) + padding
      const y = height - padding - ((v - min) / (max - min || 1)) * (height - padding * 2)
      return `${x},${y}`
    })

    const pathData = points
      .filter(p => p !== null)
      .reduce((acc, p, i, arr) => {
        return acc + (i === 0 ? `M ${p}` : ` L ${p}`)
      }, '')

    const areaPath = pathData
      ? `${pathData} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`
      : ''

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">{label}</span>
          <span className="text-lg font-bold" style={{ color }}>
            {latest && latest[label.toLowerCase() as keyof PerformancePoint] !== null
              ? `${(latest[label.toLowerCase() as keyof PerformancePoint] as number).toFixed(1)}%`
              : '-'}
          </span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
          <defs>
            <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.05 }} />
            </linearGradient>
          </defs>
          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#gradient-${label})`}
            />
          )}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>
    )
  }

  const cpuValues = data.map(d => d.cpuUsage)
  const memValues = data.map(d => d.memoryUsage)
  const diskValues = data.map(d => d.diskUsage)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">性能监控</h2>
        <div className="flex items-center space-x-2">
          <select
            value={interval}
            onChange={(e) => setIntervalVal(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {intervalOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={loadData}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            刷新
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderMiniChart(cpuValues, '#3b82f6', 'CPU')}
          {renderMiniChart(memValues, '#10b981', 'Memory')}
          {renderMiniChart(diskValues, '#f59e0b', 'Disk')}
        </div>
      )}

      {data.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-400">
          <p>暂无性能数据</p>
          <p className="text-sm mt-1">等待网关上报心跳数据</p>
        </div>
      )}
    </div>
  )
}

export default PerformanceMonitor
