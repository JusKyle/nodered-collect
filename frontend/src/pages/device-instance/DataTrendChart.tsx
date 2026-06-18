import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { HistoryRecord } from '../../api/device-data.api'

interface DataTrendChartProps {
  records: HistoryRecord[]
  pointCode: string
}

function DataTrendChart({ records, pointCode }: DataTrendChartProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        <p>暂无历史数据</p>
        <p className="text-sm mt-1">请等待数据采集后查看趋势</p>
      </div>
    )
  }

  // 将数据转换为图表格式（按时间升序）
  const chartData = [...records]
    .reverse()
    .slice(-200) // 最多显示最近 200 条
    .map(record => ({
      time: new Date(record.timestamp).toLocaleTimeString(),
      value: parseFloat(record.value) || 0,
      quality: record.quality,
      timestamp: record.timestamp
    }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-xs text-gray-500">{data.timestamp}</p>
          <p className="text-sm font-semibold text-gray-900">
            值: <span className="font-mono">{data.value}</span>
          </p>
          <p className={`text-xs mt-1 ${
            data.quality === 0 ? 'text-green-600' :
            data.quality === 1 ? 'text-red-600' : 'text-yellow-600'
          }`}>
            质量: {
              data.quality === 0 ? 'Good' :
              data.quality === 1 ? 'Bad' : 'Uncertain'
            }
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            name={pointCode || '值'}
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default DataTrendChart
