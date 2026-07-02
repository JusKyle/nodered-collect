import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDeviceInstanceById, getMergedPoints, getDeviceRealtimeData, getDeviceHistoryData, upgradeTemplateVersion, deleteDeviceInstance } from '../../api/device-instance.api'
import { dispatchConfig, getSyncRecords } from '../../api/sync.api'
import type { MergedPointItem, RealtimeData, HistoryDataResult } from '../../api/device-instance.api'
import ConfigParamsDrawer from './ConfigParamsDrawer'
import PointManagementDrawer from './PointManagementDrawer'
import ChangeGatewayModal from './ChangeGatewayModal'
import AssignGatewayModal from './AssignGatewayModal'
import { showToast } from '../../utils/toast'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DeviceDetail {
  id: string
  name: string
  modelId: string
  modelName: string
  gatewayId: string | null
  gatewayName: string | null
  group: string | null
  deviceId: string | null
  nodeId: string
  status: string
  templateVersion: number
  latestTemplateVersion: number
  enabled: boolean
  commConfig: any
  lastSyncTime: string | null
  lastDataTime: string | null
  createdAt: string
  updatedAt: string
  description?: string | null
  gateway?: { id: string; name: string; status: string; lastHeartbeat: string | null; nodeRedVersion: string | null } | null
}

function DeviceInstanceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<DeviceDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false)
  const [isPointDrawerOpen, setIsPointDrawerOpen] = useState(false)
  const [isChangeGatewayModalOpen, setIsChangeGatewayModalOpen] = useState(false)
  const [isAssignGatewayModalOpen, setIsAssignGatewayModalOpen] = useState(false)

  const [mergedPoints, setMergedPoints] = useState<MergedPointItem[]>([])
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null)
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [historyData, setHistoryData] = useState<HistoryDataResult | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedPointTag, setSelectedPointTag] = useState('')
  const [historyTimeRange, setHistoryTimeRange] = useState('1h')
  const [historyViewTab, setHistoryViewTab] = useState<'chart' | 'table'>('chart')

  // 下发历史
  const [deployHistory, setDeployHistory] = useState<any[]>([])
  const [showAllPoints, setShowAllPoints] = useState(false)

  const loadDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const response = await getDeviceInstanceById(id)
      const data = (response as any).data || response
      setDetail(data)
    } catch (error: any) {
      showToast(error.response?.data?.message || '加载详情失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadMergedPoints = useCallback(async () => {
    if (!id) return
    try {
      const data = await getMergedPoints(id)
      setMergedPoints(data)
      if (data.length > 0 && !selectedPointTag) setSelectedPointTag(data[0].tag)
    } catch {
      showToast('加载点位失败', 'error')
    }
  }, [id, selectedPointTag])

  const loadRealtimeData = useCallback(async () => {
    if (!id) return
    try {
      const data = await getDeviceRealtimeData(id)
      setRealtimeData(data)
    } catch {
      // Redis可能未连接，忽略错误
    }
  }, [id])

  // Bug-005修复：从SyncRecord API获取下发历史
  const loadDeployHistory = useCallback(async () => {
    if (!id) return
    try {
      const result = await getSyncRecords({ deviceInstanceId: id, pageSize: 10 } as any)
      const records = (result as any).records || (result as any).data?.records || []
      setDeployHistory(records)
    } catch {
      setDeployHistory([])
    }
  }, [id])

  const loadHistoryData = useCallback(async () => {
    if (!id || !selectedPointTag) return
    setHistoryLoading(true)
    try {
      const now = new Date()
      let startTime = new Date()
      switch (historyTimeRange) {
        case '1h': startTime = new Date(now.getTime() - 3600000); break
        case '6h': startTime = new Date(now.getTime() - 21600000); break
        case '24h': startTime = new Date(now.getTime() - 86400000); break
        case '7d': startTime = new Date(now.getTime() - 604800000); break
        case '30d': startTime = new Date(now.getTime() - 2592000000); break
      }
      const data = await getDeviceHistoryData(id, {
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        tags: [selectedPointTag],
        pageSize: 500,
      })
      setHistoryData(data)
    } catch {
      showToast('加载历史数据失败', 'error')
    } finally {
      setHistoryLoading(false)
    }
  }, [id, selectedPointTag, historyTimeRange])

  useEffect(() => {
    loadDetail()
    loadMergedPoints()
    loadDeployHistory()
  }, [loadDetail, loadMergedPoints, loadDeployHistory])

  useEffect(() => {
    if (detail) {
      loadRealtimeData()
    }
  }, [detail, loadRealtimeData])

  useEffect(() => {
    if (detail && detail.status !== 'OFFLINE' && detail.status !== 'DISABLED') {
      autoRefreshRef.current = setInterval(loadRealtimeData, 5000)
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    }
  }, [detail, loadRealtimeData])

  useEffect(() => {
    loadHistoryData()
  }, [loadHistoryData])

  const handleSyncVersion = async () => {
    if (!detail || !window.confirm('确定同步到最新模板版本吗？')) return
    try {
      await upgradeTemplateVersion(detail.id)
      showToast('同步成功', 'success')
      loadDetail()
      loadMergedPoints()
    } catch (error: any) {
      showToast(error.response?.data?.message || '同步失败', 'error')
    }
  }

  const handleDeployConfig = async () => {
    if (!detail || !detail.gatewayId) {
      showToast('请先分配网关', 'error')
      return
    }
    if (!window.confirm('确定下发配置吗？')) return
    try {
      await dispatchConfig({ gatewayId: detail.gatewayId, deviceInstanceId: detail.id })
      showToast('下发成功', 'success')
      loadDetail()
      loadDeployHistory()
    } catch (error: any) {
      showToast(error.response?.data?.message || '下发失败', 'error')
    }
  }

  const handleDelete = async () => {
    if (!detail || !window.confirm('确定删除该设备实例吗？')) return
    try {
      await deleteDeviceInstance(detail.id)
      showToast('删除成功', 'success')
      navigate('/device-instance')
    } catch {
      showToast('删除失败', 'error')
    }
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      ONLINE: { label: '在线', className: 'bg-green-50 text-green-600' },
      COLLECTING: { label: '采集中', className: 'bg-blue-50 text-blue-600' },
      OFFLINE: { label: '离线', className: 'bg-gray-100 text-gray-500' },
      DISABLED: { label: '已禁用', className: 'bg-orange-50 text-orange-600' },
      ERROR: { label: '错误', className: 'bg-red-50 text-red-600' },
    }
    const info = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${info.className}`}>{info.label}</span>
  }

  // Bug-019修复：根据实时数据quality字段统计正常点位数
  const normalPointCount = realtimeData
    ? mergedPoints.filter(p => {
        const val = realtimeData.values?.[p.tag]
        return val && val.quality === 0
      }).length
    : mergedPoints.length

  const handleModalSuccess = () => {
    loadDetail()
    loadMergedPoints()
  }

  // Bug-009修复：准备趋势图数据
  const chartData = historyData ? historyData.list.map(record => ({
    time: new Date(record.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    value: parseFloat(record.value) || 0,
  })).reverse() : []

  if (loading) return <div className="flex justify-center items-center h-64"><i className="fas fa-spinner fa-spin text-2xl text-primary-500"></i></div>
  if (!detail) return <div className="text-center py-12 text-gray-500">设备实例不存在</div>

  return (
    <div>
      {/* 返回按钮 */}
      <button onClick={() => navigate('/device-instance')} className="flex items-center gap-2 text-gray-600 hover:text-primary-500 mb-6">
        <i className="fas fa-arrow-left"></i>
        <span>返回列表</span>
      </button>

      {/* 页头区 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl font-bold text-gray-900">{detail.name}</h1>
              {getStatusBadge(detail.status)}
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600 flex-wrap">
              <div><span className="text-gray-500">模板名称：</span>{detail.modelName}</div>
              <div><span className="text-gray-500">分组：</span>{detail.group || '-'}</div>
              <div><span className="text-gray-500">网关：</span>{detail.gatewayName || <span className="text-gray-400">未分配</span>}</div>
              <div><span className="text-gray-500">设备ID：</span>{detail.deviceId || '-'}</div>
              {/* Bug-017修复：显示模板版本信息 */}
              <div>
                <span className="text-gray-500">模板版本：</span>
                <span className="font-medium">{detail.templateVersion}</span>
                {detail.latestTemplateVersion > detail.templateVersion && (
                  <span className="ml-2 text-orange-500 text-xs">
                    (最新: v{detail.latestTemplateVersion}，<button onClick={handleSyncVersion} className="underline hover:text-orange-700">点击升级</button>)
                  </span>
                )}
                {detail.latestTemplateVersion <= detail.templateVersion && (
                  <span className="ml-1 text-green-500 text-xs">(最新)</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setIsConfigDrawerOpen(true)} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 font-medium text-sm">配置通信参数</button>
            {detail.gatewayId ? (
              <button onClick={() => setIsChangeGatewayModalOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">变更网关</button>
            ) : (
              <button onClick={() => setIsAssignGatewayModalOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">分配网关</button>
            )}
            <button onClick={() => setIsPointDrawerOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">点位管理</button>
            <button onClick={handleDeployConfig} disabled={!detail.gatewayId} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm disabled:text-gray-400 disabled:cursor-not-allowed">下发配置</button>
            <button onClick={handleDelete} className="px-4 py-2 bg-white border border-red-500 text-red-500 rounded-lg hover:bg-red-50 font-medium text-sm">删除</button>
          </div>
        </div>
      </div>

      {/* 卡片网格 - 通信参数 & 网关信息 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* 通信参数卡片 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">通信参数</h3>
            <button onClick={() => setIsConfigDrawerOpen(true)} className="text-primary-500 hover:text-indigo-800 text-sm font-medium">
              <i className="fas fa-edit mr-1"></i>编辑
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">IP地址</p>
              <p className="text-sm font-medium text-gray-900">{detail.commConfig?.ip || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">端口</p>
              <p className="text-sm font-medium text-gray-900">{detail.commConfig?.port || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">从站地址</p>
              <p className="text-sm font-medium text-gray-900">{detail.commConfig?.slaveId || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">协议类型</p>
              <p className="text-sm font-medium text-gray-900">Modbus TCP</p>
            </div>
          </div>
        </div>

        {/* 网关信息卡片 - Bug-006修复：正确处理未分配网关情况 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">网关信息</h3>
            {detail.gatewayId && (
              <button onClick={() => setIsChangeGatewayModalOpen(true)} className="text-primary-500 hover:text-indigo-800 text-sm font-medium">
                <i className="fas fa-exchange-alt mr-1"></i>变更网关
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">网关名称</p>
              {detail.gatewayName ? (
                <p className="text-sm font-medium text-primary-500 cursor-pointer hover:text-indigo-600">{detail.gatewayName}</p>
              ) : (
                <p className="text-sm font-medium text-gray-400">未分配</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">网关状态</p>
              {detail.gateway ? getStatusBadge(detail.gateway.status) : <span className="text-sm text-gray-400">-</span>}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">NR版本</p>
              <p className="text-sm font-medium text-gray-900">{detail.gateway?.nodeRedVersion || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">最后心跳</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(detail.gateway?.lastHeartbeat)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 采集状态卡片 - Bug-019修复：使用realtimeData quality统计正常点位 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">采集状态</h3>
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-2">当前状态</div>
            <div className="flex justify-center mb-2">{getStatusBadge(detail.status)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-2">最后数据时间</div>
            <div className="text-lg font-bold text-gray-900">{formatDate(detail.lastDataTime)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-2">点位总数</div>
            <div className="text-lg font-bold text-primary-500">{mergedPoints.length}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-2">采集正常点位数</div>
            <div className="text-lg font-bold text-green-600">{normalPointCount}</div>
          </div>
        </div>
      </div>

      {/* 点位实时值卡片 - Bug-020修复：去掉slice(0,10)限制，支持展开/收起 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">点位实时值</h3>
          {mergedPoints.length > 10 && (
            <button onClick={() => setShowAllPoints(!showAllPoints)} className="text-primary-500 hover:text-indigo-800 text-sm font-medium">
              {showAllPoints ? '收起' : `展开全部 (${mergedPoints.length})`}
            </button>
          )}
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">点位名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">当前值</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">单位</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">更新时间</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">来源</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mergedPoints.slice(0, showAllPoints ? mergedPoints.length : 10).map(p => {
              const realtimeValue = realtimeData?.values?.[p.tag]
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-primary-500 font-bold">{realtimeValue?.value || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.unit || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{realtimeValue?.timestamp ? formatDate(new Date(realtimeValue.timestamp).toISOString()) : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.source === 'TEMPLATE' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                      {p.source === 'TEMPLATE' ? '模板级' : '设备级'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelectedPointTag(p.tag); setHistoryTimeRange('1h'); }} className="text-primary-500 hover:text-indigo-800 text-sm font-medium">历史数据</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 下发历史卡片 - Bug-005修复：从API获取数据 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">下发历史</h3>
        {deployHistory.length === 0 ? (
          <div className="text-center py-6 text-gray-400">暂无下发记录</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">下发时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">下发类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">下发状态</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">网关名称</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deployHistory.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{formatDate(record.createdAt)}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">{record.type}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${record.status === 'SUCCESS' ? 'bg-green-50 text-green-600' : record.status === 'FAILED' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>{record.status}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.gateway?.name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 历史数据查询卡片 - Bug-009修复：实现Chart图表 */}
      <div id="historyCard" className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">历史数据查询</h3>
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">选择点位</label>
            <select value={selectedPointTag} onChange={(e) => setSelectedPointTag(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              {mergedPoints.map(p => <option key={p.tag} value={p.tag}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-end flex-wrap">
            <button onClick={() => setHistoryTimeRange('1h')} className={`px-4 py-2.5 ${historyTimeRange === '1h' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-300 text-gray-700'} rounded-lg text-sm font-medium`}>1小时</button>
            <button onClick={() => setHistoryTimeRange('6h')} className={`px-4 py-2.5 ${historyTimeRange === '6h' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-300 text-gray-700'} rounded-lg text-sm`}>6小时</button>
            <button onClick={() => setHistoryTimeRange('24h')} className={`px-4 py-2.5 ${historyTimeRange === '24h' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-300 text-gray-700'} rounded-lg text-sm font-medium`}>24小时</button>
            <button onClick={() => setHistoryTimeRange('7d')} className={`px-4 py-2.5 ${historyTimeRange === '7d' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-300 text-gray-700'} rounded-lg text-sm`}>7天</button>
            <button onClick={() => setHistoryTimeRange('30d')} className={`px-4 py-2.5 ${historyTimeRange === '30d' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-300 text-gray-700'} rounded-lg text-sm`}>30天</button>
          </div>
          <button onClick={loadHistoryData} className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium">查询</button>
        </div>

        <div className="border-b border-gray-200 mb-4">
          <nav className="flex gap-6">
            <button onClick={() => setHistoryViewTab('chart')} className={`px-1 py-3 text-sm font-medium ${historyViewTab === 'chart' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-700'}`}>趋势图</button>
            <button onClick={() => setHistoryViewTab('table')} className={`px-1 py-3 text-sm font-medium ${historyViewTab === 'table' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-700'}`}>列表</button>
          </nav>
        </div>

        {/* 趋势图区域 - Bug-009修复：使用recharts渲染 */}
        {historyViewTab === 'chart' && (
          <div className="h-80">
            {historyLoading ? (
              <div className="h-full flex items-center justify-center"><i className="fas fa-spinner fa-spin text-2xl text-primary-500"></i></div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} name="数值" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-center text-gray-400">
                  <i className="fas fa-chart-line text-4xl mb-2"></i>
                  <p className="text-sm">暂无历史数据</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 列表区域 */}
        {historyViewTab === 'table' && (
          <div>
            {historyLoading ? <div className="text-center py-8"><i className="fas fa-spinner fa-spin mr-2"></i>加载中...</div> : (
              historyData && historyData.list.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">时间</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">点位名称</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">数值</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyData.list.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDate(record.timestamp)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.pointName || record.pointCode}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="text-center py-8 text-gray-400">暂无历史数据</div>
            )}
          </div>
        )}
      </div>

      {/* 弹窗和抽屉 */}
      {detail && (
        <>
          <ConfigParamsDrawer isOpen={isConfigDrawerOpen} onClose={() => setIsConfigDrawerOpen(false)} instance={detail as any} onSuccess={handleModalSuccess} />
          <PointManagementDrawer isOpen={isPointDrawerOpen} onClose={() => setIsPointDrawerOpen(false)} instance={detail as any} />
          <ChangeGatewayModal isOpen={isChangeGatewayModalOpen} onClose={() => setIsChangeGatewayModalOpen(false)} instance={detail as any} onSuccess={handleModalSuccess} />
          <AssignGatewayModal isOpen={isAssignGatewayModalOpen} onClose={() => setIsAssignGatewayModalOpen(false)} instance={detail as any} onSuccess={handleModalSuccess} />
        </>
      )}
    </div>
  )
}

export default DeviceInstanceDetail