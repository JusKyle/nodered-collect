import { useEffect, useState } from 'react'
import { useDeviceInstanceStore } from '../../stores/device-instance.store'
import DataTable from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'

function DeviceInstanceList() {
  const { deviceInstances, loading, fetchDeviceInstances } = useDeviceInstanceStore()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchDeviceInstances()
  }, [fetchDeviceInstances])

  const filteredInstances = deviceInstances.filter(
    (instance) =>
      instance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (instance.model?.name && instance.model.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (instance.gateway?.name && instance.gateway.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const columns = [
    { key: 'name', label: '名称' },
    { key: 'model', label: '设备模型' },
    { key: 'gateway', label: '所属网关' },
    { key: 'status', label: '状态' },
    { key: 'lastSyncTime', label: '最后同步' },
    { key: 'actions', label: '操作' },
  ]

  const renderRow = (instance: typeof deviceInstances[0]) => (
    <tr key={instance.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{instance.name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{instance.model?.name || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{instance.gateway?.name || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={instance.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">
          {instance.lastSyncTime ? new Date(instance.lastSyncTime).toLocaleString() : '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button className="text-primary-600 hover:text-primary-900 mr-4">编辑</button>
        <button className="text-red-600 hover:text-red-900">删除</button>
      </td>
    </tr>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备实例</h1>
          <p className="text-gray-500 mt-1">管理所有设备实例</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索实例..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
            新增实例
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            批量导入
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredInstances}
        renderRow={renderRow}
        loading={loading}
      />
    </div>
  )
}

export default DeviceInstanceList