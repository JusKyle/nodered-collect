import { useState, useRef, useEffect } from 'react'
import type { DeviceInstance } from '../../types'
import * as deviceInstanceApi from '../../api/device-instance.api'

interface SyncPointsConfirmBubbleProps {
  instance: DeviceInstance
  onSyncSuccess: () => void
}

function SyncPointsConfirmBubble({ instance, onSyncSuccess }: SyncPointsConfirmBubbleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const bubbleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await deviceInstanceApi.syncPoints(instance.id)
      onSyncSuccess()
      setIsOpen(false)
    } catch (error) {
      console.error('Sync points failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="relative inline-block" ref={bubbleRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        同步点位
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-orange-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-gray-700">
                  将从模型「<span className="font-medium">{instance.model?.name || '-'}</span>」同步最新点位配置
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  继承点位将更新为模型最新版本，自定义点位不受影响
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 px-4 py-3 bg-gray-50 rounded-b-lg">
            <button
              onClick={() => setIsOpen(false)}
              disabled={isSyncing}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {isSyncing ? '同步中...' : '确认同步'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SyncPointsConfirmBubble