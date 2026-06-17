import { useEffect, useState } from 'react'
import { useDeviceModelStore } from '../../stores/device-model.store'
import DataTable from '../../components/DataTable'

function DeviceModelList() {
  const { deviceModels, loading, fetchDeviceModels } = useDeviceModelStore()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchDeviceModels()
  }, [fetchDeviceModels])

  const filteredModels = deviceModels.filter(
    (model) =>
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.protocol.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    { key: 'name', label: '名称' },
    { key: 'protocol', label: '协议' },
    { key: 'pointCount', label: '点位数量' },
    { key: 'description', label: '描述' },
    { key: 'createdAt', label: '创建时间' },
    { key: 'actions', label: '操作' },
  ]

  const renderRow = (model: typeof deviceModels[0]) => (
    <tr key={model.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{model.name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {model.protocol}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{model.points.length}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{model.description || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{new Date(model.createdAt).toLocaleString()}</div>
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
          <h1 className="text-2xl font-bold text-gray-900">设备模型</h1>
          <p className="text-gray-500 mt-1">管理设备模型和点位配置</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索模型..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
            新建模型
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredModels}
        renderRow={renderRow}
        loading={loading}
      />
    </div>
  )
}

export default DeviceModelList