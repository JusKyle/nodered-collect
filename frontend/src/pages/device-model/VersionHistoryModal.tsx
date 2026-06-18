import { useState, useEffect } from 'react'
import * as deviceModelApi from '../../api/device-model.api'
import type { ModelVersion, Point } from '../../types'

interface VersionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  modelId: string
  modelName: string
}

function VersionHistoryModal({ isOpen, onClose, modelId, modelName }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<ModelVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && modelId) {
      fetchVersions()
    }
  }, [isOpen, modelId])

  const fetchVersions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await deviceModelApi.getDeviceModelVersions(modelId)
      setVersions(data)
    } catch (err: any) {
      setError(err.message || '获取版本历史失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setExpandedVersion(null)
    onClose()
  }

  const toggleVersion = (versionId: string) => {
    setExpandedVersion(expandedVersion === versionId ? null : versionId)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">版本历史 - {modelName}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && versions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              暂无版本历史
            </div>
          )}

          {!loading && !error && versions.length > 0 && (
            <div className="space-y-3">
              {versions.map((version) => (
                <div key={version.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleVersion(version.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {version.version}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(version.createdAt)}
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedVersion === version.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedVersion === version.id && (
                    <div className="p-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">点位列表 ({(version.points as Point[]).length} 个)</h4>
                      {(version.points as Point[]).length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded">
                          该版本无点位数据
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编码</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地址</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据类型</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单位</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(version.points as Point[]).map((point, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-sm text-gray-900">{point.name}</td>
                                  <td className="px-3 py-2 text-sm text-gray-600 font-mono">{point.code}</td>
                                  <td className="px-3 py-2 text-sm text-gray-600 font-mono">{point.address}</td>
                                  <td className="px-3 py-2 text-sm text-gray-600">{point.type}</td>
                                  <td className="px-3 py-2 text-sm text-gray-600">{point.dataType}</td>
                                  <td className="px-3 py-2 text-sm text-gray-600">{point.unit || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-white transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default VersionHistoryModal