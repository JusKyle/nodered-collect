import { useEffect, useState } from 'react'
import { getPerformanceHistory } from '../api/gateway.api'
import type { PerformancePoint } from '../api/gateway.api'

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

  const fieldMap: Record<string, keyof PerformancePoint> = {
    CPU: 'cpuUsage',
    Memory: 'memoryUsage',
    Disk: 'diskUsage'
  }

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
      .reduce((acc, p, i) => {
        return acc + (i === 0 ? `M ${p}` : ` L ${p}`)
      }, '')

    const areaPath = pathData
      ? `${pathData} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`
      : ''

    const fieldKey = fieldMap[label] || (label.toLowerCase() as keyof PerformancePoint)
    const latestValue = latest && latest[fieldKey] !== null
      ? `${(latest[fieldKey] as number).toFixed(1)}%`
      : '-'

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">{label}</span>
          <span className="text-lg font-bold" style={{ color }}>
            {latestValue}
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
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">时间范围</span>
          <select
            value={interval}
            onChange={(e) => setIntervalVal(e.target.value as any)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
          >
            {intervalOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={loadData}
          className="text-xs text-primary-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
        >
          <i className="fas fa-sync-alt text-[10px]"></i>刷新
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {renderMiniChart(cpuValues, '#6366F1', 'CPU')}
          {renderMiniChart(memValues, '#10B981', 'Memory')}
          {renderMiniChart(diskValues, '#F59E0B', 'Disk')}
        </div>
      )}

      {data.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">暂无性能数据</p>
          <p className="text-xs mt-1">等待网关上报心跳数据</p>
        </div>
      )}
    </div>
  )
}

export default PerformanceMonitor
