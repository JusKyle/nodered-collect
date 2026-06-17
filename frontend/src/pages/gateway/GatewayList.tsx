import { useEffect, useState } from 'react'
import { useGatewayStore } from '../../stores/gateway.store'
import DataTable from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import GatewayCreateModal from './GatewayCreateModal'
import GatewayEditModal from './GatewayEditModal'
import RegistrationCodeModal from './RegistrationCodeModal'
import type { Gateway } from '../../types'

function GatewayList() {
  const { gateways, loading, fetchGateways } = useGatewayStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isRegistrationCodeModalOpen, setIsRegistrationCodeModalOpen] = useState(false)
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null)

  useEffect(() => {
    fetchGateways()
  }, [fetchGateways])

  const filteredGateways = gateways.filter(
    (gateway) =>
      gateway.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gateway.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    { key: 'name', label: '名称' },
    { key: 'address', label: '地址' },
    { key: 'port', label: '端口' },
    { key: 'status', label: '状态' },
    { key: 'lastHeartbeat', label: '最后心跳' },
    { key: 'actions', label: '操作' },
  ]

  const handleEditClick = (gateway: Gateway) => {
    setSelectedGateway(gateway)
    setIsEditModalOpen(true)
  }

  const renderRow = (gateway: typeof gateways[0]) => (
    <tr key={gateway.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{gateway.name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{gateway.address}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{gateway.port}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={gateway.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">
          {gateway.lastHeartbeat ? new Date(gateway.lastHeartbeat).toLocaleString() : '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={() => handleEditClick(gateway)}
          className="text-primary-600 hover:text-primary-900 mr-4"
        >
          编辑
        </button>
        <button className="text-red-600 hover:text-red-900">删除</button>
      </td>
    </tr>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">采集网关</h1>
          <p className="text-gray-500 mt-1">管理所有采集网关的注册和状态</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索网关..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            新建网关
          </button>
          <button
            onClick={() => setIsRegistrationCodeModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            生成注册码
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredGateways}
        renderRow={renderRow}
        loading={loading}
      />

      <GatewayCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <GatewayEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedGateway(null)
        }}
        gateway={selectedGateway}
      />

      <RegistrationCodeModal
        isOpen={isRegistrationCodeModalOpen}
        onClose={() => setIsRegistrationCodeModalOpen(false)}
      />
    </div>
  )
}

export default GatewayList