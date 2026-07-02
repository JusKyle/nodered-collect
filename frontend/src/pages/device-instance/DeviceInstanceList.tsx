import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useGatewayStore } from '../../stores/gateway.store'
import { useDeviceModelStore } from '../../stores/device-model.store'
import { getDeviceInstances, getDeviceGroups, deleteDeviceInstance as deleteInstanceApi, changeGateway as changeGatewayApi, batchUpgradeTemplate as batchUpgradeApi, upgradeTemplateVersion } from '../../api/device-instance.api'
import { dispatchConfig } from '../../api/sync.api'
import { showToast } from '../../utils/toast'
import type { DeviceInstanceListItem } from '../../api/device-instance.api'
import DeviceInstanceCreateModal from './DeviceInstanceCreateModal'
import DeviceInstanceBatchModal from './DeviceInstanceBatchModal'
import ChangeGatewayModal from './ChangeGatewayModal'
import AssignGatewayModal from './AssignGatewayModal'
import ConfigParamsDrawer from './ConfigParamsDrawer'
import PointManagementDrawer from './PointManagementDrawer'

function DeviceInstanceList() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { gateways, fetchGateways } = useGatewayStore()
  const { deviceModels, fetchDeviceModels } = useDeviceModelStore()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [isChangeGatewayModalOpen, setIsChangeGatewayModalOpen] = useState(false)
  const [isAssignGatewayModalOpen, setIsAssignGatewayModalOpen] = useState(false)
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false)
  const [isPointDrawerOpen, setIsPointDrawerOpen] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<DeviceInstanceListItem | null>(null)
  const [deployConfirm, setDeployConfirm] = useState<{ open: boolean; instance: DeviceInstanceListItem | null }>({ open: false, instance: null })
  const [isDeploying, setIsDeploying] = useState(false)

  const gatewayFromUrl = searchParams.get('gateway') || ''
  const [filterGroup, setFilterGroup] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterGateway, setFilterGateway] = useState(gatewayFromUrl)
  const [filterStatus, setFilterStatus] = useState('')

  const [page, setPage] = useState(1)
  const pageSize = 20
  const [total, setTotal] = useState(0)
  const [instances, setInstances] = useState<DeviceInstanceListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 收集所有分组 - Bug-001修复：从API获取全量分组列表
  const [allGroups, setAllGroups] = useState<string[]>([])

  const totalPages = Math.ceil(total / pageSize)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getDeviceInstances({
        page,
        pageSize,
        group: filterGroup || undefined,
        modelId: filterModel || undefined,
        gatewayId: filterGateway || undefined,
        status: filterStatus || undefined,
      })
      setInstances(result.list)
      setTotal(result.total)
    } catch {
      showToast('加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, filterGroup, filterModel, filterGateway, filterStatus])

  const fetchGroups = useCallback(async () => {
    try {
      const groups = await getDeviceGroups()
      setAllGroups(groups)
    } catch {
      // 忽略错误
    }
  }, [])

  useEffect(() => {
    fetchGateways()
    fetchDeviceModels()
    fetchGroups()
  }, [fetchGateways, fetchDeviceModels, fetchGroups])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  // 操作处理
  const handleConfigParams = (instance: DeviceInstanceListItem) => {
    setSelectedInstance(instance)
    setIsConfigDrawerOpen(true)
  }

  const handleChangeGateway = (instance: DeviceInstanceListItem) => {
    setSelectedInstance(instance)
    setIsChangeGatewayModalOpen(true)
  }

  const handleAssignGateway = (instance: DeviceInstanceListItem) => {
    setSelectedInstance(instance)
    setIsAssignGatewayModalOpen(true)
  }

  const handlePointManagement = (instance: DeviceInstanceListItem) => {
    setSelectedInstance(instance)
    setIsPointDrawerOpen(true)
  }

  const handleSyncVersion = async (instance: DeviceInstanceListItem) => {
    if (!window.confirm(`确定要将实例 "${instance.name}" 同步到最新模板版本吗？`)) return
    try {
      await upgradeTemplateVersion(instance.id)
      showToast('同步成功', 'success')
      fetchList()
    } catch (err: any) {
      showToast(err.response?.data?.message || '同步失败', 'error')
    }
  }

  const handleDeployConfig = (instance: DeviceInstanceListItem) => {
    if (!instance.gatewayId) {
      showToast('请先分配网关', 'error')
      return
    }
    setDeployConfirm({ open: true, instance })
  }

  const confirmDeploy = async () => {
    const instance = deployConfirm.instance
    if (!instance?.gatewayId) return
    setIsDeploying(true)
    try {
      await dispatchConfig({ gatewayId: instance.gatewayId, deviceInstanceId: instance.id })
      showToast('下发成功', 'success')
      setDeployConfirm({ open: false, instance: null })
      fetchList()
    } catch (err: any) {
      showToast(err.response?.data?.message || '下发失败', 'error')
    } finally {
      setIsDeploying(false)
    }
  }

  const handleDelete = async (instance: DeviceInstanceListItem) => {
    if (!window.confirm(`确定要删除实例 "${instance.name}" 吗？`)) return
    try {
      await deleteInstanceApi(instance.id)
      showToast('删除成功', 'success')
      fetchList()
    } catch {
      showToast('删除失败', 'error')
    }
  }

  const handleViewDetail = (instance: DeviceInstanceListItem) => {
    navigate(`/device-instance/${instance.id}`)
  }

  // 批量操作
  const handleSelectAll = () => {
    if (selectedIds.size === instances.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(instances.map(i => i.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const handleBatchAssign = async () => {
    if (selectedIds.size === 0) return
    // Bug-010修复：实现批量分配网关 - 使用第一个选中设备的网关作为目标
    const gatewayId = window.prompt('请输入要分配的网关ID:')
    if (!gatewayId) return
    try {
      const ids = Array.from(selectedIds)
      for (const id of ids) {
        await changeGatewayApi(id, gatewayId)
      }
      showToast(`成功分配 ${ids.length} 个设备到指定网关`, 'success')
      setSelectedIds(new Set())
      fetchList()
    } catch (error: any) {
      showToast(error.response?.data?.message || '批量分配失败', 'error')
    }
  }

  const handleBatchChange = async () => {
    if (selectedIds.size === 0) return
    const gatewayId = window.prompt('请输入要变更到的网关ID:')
    if (!gatewayId) return
    try {
      const ids = Array.from(selectedIds)
      for (const id of ids) {
        await changeGatewayApi(id, gatewayId)
      }
      showToast(`成功变更 ${ids.length} 个设备的网关`, 'success')
      setSelectedIds(new Set())
      fetchList()
    } catch (error: any) {
      showToast(error.response?.data?.message || '批量变更失败', 'error')
    }
  }

  const handleBatchDeploy = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`确定要批量下发 ${selectedIds.size} 个设备的配置吗？`)) return
    try {
      const ids = Array.from(selectedIds)
      let successCount = 0
      for (const id of ids) {
        const instance = instances.find(i => i.id === id)
        if (instance?.gatewayId) {
          await dispatchConfig({ gatewayId: instance.gatewayId, deviceInstanceId: id })
          successCount++
        }
      }
      showToast(`批量下发完成，成功 ${successCount} 个`, 'success')
      setSelectedIds(new Set())
      fetchList()
    } catch (error: any) {
      showToast(error.response?.data?.message || '批量下发失败', 'error')
    }
  }

  const handleBatchUpgrade = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`确定要批量升级 ${selectedIds.size} 个设备的模板版本吗？`)) return
    try {
      const ids = Array.from(selectedIds)
      const result = await batchUpgradeApi(ids)
      showToast(`批量升级完成，成功 ${result.successCount} 个`, 'success')
      setSelectedIds(new Set())
      fetchList()
    } catch (error: any) {
      showToast(error.response?.data?.message || '批量升级失败', 'error')
    }
  }

  const handleSearch = () => { setPage(1); fetchList() }
  const handleReset = () => {
    setFilterGroup(''); setFilterModel(''); setFilterGateway(''); setFilterStatus('')
    setPage(1)
  }

  const handleModalSuccess = () => {
    fetchList()
    fetchGroups()
    setSelectedInstance(null)
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

  return (
    <div>
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备实例</h1>
          <p className="text-gray-500 mt-1">管理所有设备实例的创建、配置和数据采集</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 font-medium flex items-center gap-2 shadow-sm"
          >
            <i className="fas fa-plus"></i>新增设备
          </button>
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 shadow-sm"
          >
            <i className="fas fa-upload"></i>批量导入
          </button>
        </div>
      </div>

      {/* 筛选卡片 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
        <div className="flex gap-5 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">分组</label>
            <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option value="">全部</option>
              {allGroups.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">模板名称</label>
            <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option value="">全部</option>
              {deviceModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">网关名称</label>
            <select value={filterGateway} onChange={(e) => setFilterGateway(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option value="">全部</option>
              {gateways.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">状态</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option value="">全部</option>
              <option value="ONLINE">在线</option>
              <option value="COLLECTING">采集中</option>
              <option value="OFFLINE">离线</option>
              <option value="DISABLED">已禁用</option>
              <option value="ERROR">错误</option>
            </select>
          </div>
          <button onClick={handleSearch} className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium">查询</button>
          <button onClick={handleReset} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm">重置</button>
        </div>
      </div>

      {/* 批量操作区 */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="fas fa-check-circle text-primary-500 text-lg"></i>
              <span className="text-sm text-gray-700">已选择 <span className="font-semibold text-primary-500">{selectedIds.size}</span> 个实例</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleBatchAssign} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                <i className="fas fa-share-nodes mr-1.5"></i>批量分配网关
              </button>
              <button onClick={handleBatchChange} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                <i className="fas fa-exchange-alt mr-1.5"></i>批量变更网关
              </button>
              <button onClick={handleBatchDeploy} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                <i className="fas fa-paper-plane mr-1.5"></i>批量下发
              </button>
              <button onClick={handleBatchUpgrade} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                <i className="fas fa-sync-alt mr-1.5"></i>批量升级模板
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 数据表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-12 px-5 py-3.5">
                <input
                  type="checkbox"
                  checked={instances.length > 0 && selectedIds.size === instances.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-primary-500 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                />
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">实例名称</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">模板名称</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">分组</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">网关名称</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">状态</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>
            )}
            {!loading && instances.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">暂无数据</td></tr>
            )}
            {!loading && instances.map((inst) => (
              <tr key={inst.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(inst.id) ? 'bg-primary-50' : ''}`}>
                <td className="w-12 px-5 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(inst.id)}
                    onChange={() => handleSelectOne(inst.id)}
                    className="w-4 h-4 text-primary-500 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                  />
                </td>
                <td className="px-5 py-4">
                  <button onClick={() => handleViewDetail(inst)} className="font-semibold text-gray-900 hover:text-primary-500">{inst.name}</button>
                </td>
                <td className="px-5 py-4 text-gray-600 text-sm">{inst.modelName}</td>
                <td className="px-5 py-4 text-gray-600 text-sm">{inst.group || '-'}</td>
                <td className="px-5 py-4 text-gray-600 text-sm">{inst.gatewayName || <span className="text-gray-400">未分配</span>}</td>
                <td className="px-5 py-4">{getStatusBadge(inst.status)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3 text-sm">
                    <button onClick={() => handleConfigParams(inst)} className="text-primary-500 hover:text-indigo-800 font-medium">配置通信参数</button>
                    {inst.gatewayId ? (
                      <button onClick={() => handleChangeGateway(inst)} className="text-gray-500 hover:text-primary-500 font-medium">变更网关</button>
                    ) : (
                      <button onClick={() => handleAssignGateway(inst)} className="text-primary-500 hover:text-indigo-800 font-medium">分配网关</button>
                    )}
                    <button onClick={() => handlePointManagement(inst)} className="text-gray-500 hover:text-primary-500 font-medium">点位管理</button>
                    {inst.status === 'COLLECTING' ? (
                      <button className="text-gray-400 cursor-not-allowed font-medium" disabled>同步模板版本</button>
                    ) : (
                      <button onClick={() => handleSyncVersion(inst)} className="text-primary-500 hover:text-indigo-800 font-medium">同步模板版本</button>
                    )}
                    {inst.gatewayId ? (
                      <button onClick={() => handleDeployConfig(inst)} className="text-gray-500 hover:text-primary-500 font-medium">下发配置</button>
                    ) : (
                      <button className="text-gray-400 cursor-not-allowed font-medium" disabled>下发配置</button>
                    )}
                    <button onClick={() => handleDelete(inst)} className="text-red-500 hover:text-red-700 font-medium">删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 - Bug-013修复：无数据时不显示分页 */}
      {total > 0 && (
        <div className="flex justify-between items-center mt-5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共</span>
            <span className="font-medium text-gray-900">{total}</span>
            <span>条记录</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-50">
              <i className="fas fa-chevron-left text-xs"></i>
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p: number
              if (totalPages <= 7) { p = i + 1 }
              else if (page <= 4) { p = i + 1 }
              else if (page >= totalPages - 3) { p = totalPages - 6 + i }
              else { p = page - 3 + i }
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${page === p ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || totalPages === 0}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-50">
              <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>
      )}

      {/* 弹窗和抽屉 */}
      <DeviceInstanceCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <DeviceInstanceBatchModal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} onSuccess={handleModalSuccess} />
      {deployConfirm.open && deployConfirm.instance && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">下发配置确认</h3>
              <button onClick={() => setDeployConfirm({ open: false, instance: null })} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                确定要将设备 <span className="font-semibold text-gray-900">{deployConfirm.instance.name}</span> 的配置下发到网关 <span className="font-semibold text-gray-900">{deployConfirm.instance.gatewayName}</span> 吗？
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setDeployConfirm({ open: false, instance: null })} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">取消</button>
              <button onClick={confirmDeploy} disabled={isDeploying} className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium disabled:opacity-50">{isDeploying ? '下发中...' : '确认下发'}</button>
            </div>
          </div>
        </div>
      )}
      {selectedInstance && (
        <>
          <ChangeGatewayModal isOpen={isChangeGatewayModalOpen} onClose={() => { setIsChangeGatewayModalOpen(false); setSelectedInstance(null) }} instance={selectedInstance as any} onSuccess={handleModalSuccess} />
          <AssignGatewayModal isOpen={isAssignGatewayModalOpen} onClose={() => { setIsAssignGatewayModalOpen(false); setSelectedInstance(null) }} instance={selectedInstance} onSuccess={handleModalSuccess} />
          <ConfigParamsDrawer isOpen={isConfigDrawerOpen} onClose={() => { setIsConfigDrawerOpen(false); setSelectedInstance(null) }} instance={selectedInstance} onSuccess={handleModalSuccess} />
          <PointManagementDrawer isOpen={isPointDrawerOpen} onClose={() => { setIsPointDrawerOpen(false); setSelectedInstance(null) }} instance={selectedInstance} />
        </>
      )}
    </div>
  )
}

export default DeviceInstanceList