import { useState, useEffect, useCallback } from 'react'
import type { DeviceInstance } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import PointValueTable from './PointValueTable'
import DataTrendChart from './DataTrendChart'
import * as deviceDataApi from '../../api/device-data.api'
import type { CurrentDataResponse, HistoryDataResponse } from '../../api/device-data.api'

type Tab = 'realtime' | 'trend'

interface DeviceDataPanelProps {
  isOpen: boolean
  onClose: () => void
  instance: DeviceInstance
}

function DeviceDataPanel({ isOpen, onClose, instance }: DeviceDataPanelProps) {
  const [tab, setTab] = useState<Tab>('realtime')
  const [currentData, setCurrentData] = useState<CurrentDataResponse | null>(null)
  const [trendData, setTrendData] = useState<HistoryDataResponse | null>(null)
  const [selectedPointCode, setSelectedPointCode] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchCurrent = useCallback(async () => {
    try {
      const data = await deviceDataApi.getCurrentData(instance.id)
      setCurrentData(data)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Failed to fetch current data', err)
    }
  }, [instance.id])

  const fetchTrend = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {
        pageSize: 500
      }
      if (selectedPointCode) params.pointCode = selectedPointCode
      const data = await deviceDataApi.getHistoryData(instance.id, params)
      setTrendData(data)
    } catch (err) {
      console.error('Failed to fetch trend data', err)
    } finally {
      setLoading(false)
    }
  }, [instance.id, selectedPointCode])

  // 初始加载
  useEffect(() => {
    if (isOpen) {
      fetchCurrent()
      fetchTrend()
    }
  }, [isOpen])

  // 实时轮询：每 5s 刷新最新值
  useEffect(() => {
    if (!isOpen || tab !== 'realtime') return
    fetchCurrent()
    const interval = setInterval(fetchCurrent, 5000)
    return () => clearInterval(interval)
  }, [isOpen, tab, fetchCurrent])

  // 趋势图数据刷新
  useEffect(() => {
    if (isOpen && tab === 'trend') {
      fetchTrend()
    }
  }, [isOpen, tab, fetchTrend])

  if (!isOpen) return null

  const allPointCodes = currentData?.points.map(p => p.code) || []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-stretch justify-end z-50">
      <div className="bg-white w-full max-w-5xl h-full flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">设备数据 - {instance.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={instance.status} />
              <span className="text-sm text-gray-500">
                网关：{instance.gateway?.name || '-'}
              </span>
              {lastUpdate && (
                <span className="text-xs text-gray-400">
                  更新：{lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setTab('realtime')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'realtime'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            实时数据
          </button>
          <button
            onClick={() => setTab('trend')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'trend'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            数据趋势
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {tab === 'realtime' && (
            <PointValueTable
              points={currentData?.points || []}
              loading={!currentData}
            />
          )}
          {tab === 'trend' && (
            <div className="space-y-4">
              {/* 点位选择 */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">选择点位：</label>
                <select
                  value={selectedPointCode}
                  onChange={(e) => setSelectedPointCode(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">全部点位</option>
                  {allPointCodes.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
                <button
                  onClick={fetchTrend}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                >
                  刷新
                </button>
              </div>

              {/* 趋势图 */}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <span className="text-gray-500">加载中...</span>
                </div>
              ) : (
                <DataTrendChart
                  records={trendData?.records || []}
                  pointCode={selectedPointCode}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DeviceDataPanel
