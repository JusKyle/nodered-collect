import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import api from '../../api/axios'
import type { Point } from '../../types'

interface ImportPointsModalProps {
  isOpen: boolean
  onClose: () => void
  modelId: string
  onImportSuccess: () => void
}

interface ParsedRow {
  name: string
  address: string
  type: string
  unit?: string
  description?: string
  isValid: boolean
  error?: string
}

type Phase = 'upload' | 'preview'

const CSV_TEMPLATE = `name,address,type,unit,description
temperature,30001,int,Temperature,Celsius
humidity,30002,int,Humidity,Percent`

function ImportPointsModal({ isOpen, onClose, modelId, onImportSuccess }: ImportPointsModalProps) {
  const [phase, setPhase] = useState<Phase>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    setPhase('upload')
    setParsedData([])
    setIsDragging(false)
    onClose()
  }

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows: ParsedRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const row: ParsedRow = {
        name: '',
        address: '',
        type: '',
        isValid: false,
      }

      headers.forEach((header, index) => {
        const value = values[index]?.trim() || ''
        switch (header) {
          case 'name':
            row.name = value
            break
          case 'address':
            row.address = value
            break
          case 'type':
            row.type = value
            break
          case 'unit':
            row.unit = value
            break
          case 'description':
            row.description = value
            break
        }
      })

      // Validate row
      const errors: string[] = []
      if (!row.name) errors.push('缺少名称')
      if (!row.address) errors.push('缺少地址')
      if (!row.type) errors.push('缺少类型')

      if (errors.length > 0) {
        row.isValid = false
        row.error = errors.join('; ')
      } else {
        row.isValid = true
      }

      rows.push(row)
    }

    return rows
  }

  // Simple CSV line parser handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('仅支持 CSV 格式文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const data = parseCSV(text)
      setParsedData(data)
      setPhase('preview')
    }
    reader.readAsText(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'points_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    const validPoints: Point[] = parsedData
      .filter(row => row.isValid)
      .map(row => ({
        name: row.name,
        address: row.address,
        type: row.type,
        unit: row.unit,
        description: row.description,
      }))

    if (validPoints.length === 0) {
      alert('没有有效的点位数据')
      return
    }

    setIsImporting(true)
    try {
      await api.post(`/device-models/${modelId}/points/import`, { points: validPoints })
      onImportSuccess()
      handleClose()
    } catch (error: any) {
      console.error('导入失败:', error)
      alert(error.response?.data?.message || '导入失败')
    } finally {
      setIsImporting(false)
    }
  }

  if (!isOpen) return null

  const successCount = parsedData.filter(row => row.isValid).length
  const failureCount = parsedData.filter(row => !row.isValid).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {phase === 'upload' ? '导入点位' : '预览导入'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-auto flex-1">
          {phase === 'upload' ? (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600 mb-2">将 CSV 文件拖拽到此处，或点击选择文件</p>
                <p className="text-sm text-gray-400 mb-4">支持 CSV 格式</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  选择文件
                </button>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载导入模板
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 text-sm">
                <span className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span>
                  成功: {successCount}
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span>
                  失败: {failureCount}
                </span>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">名称</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">地址</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">单位</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">描述</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsedData.map((row, index) => (
                      <tr key={index} className={row.isValid ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="px-4 py-2">
                          {row.isValid ? (
                            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{row.address}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{row.type}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{row.unit || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{row.error || row.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t">
          {phase === 'preview' ? (
            <>
              <button
                onClick={() => setPhase('upload')}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                重新上传
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting || successCount === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isImporting ? '导入中...' : `导入 (${successCount})`}
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportPointsModal
