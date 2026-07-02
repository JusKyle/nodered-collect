import { useState, useRef } from 'react'
import type { DeviceInstance } from '../../types'
import { dispatchConfig } from '../../api/sync.api'
import { useDeviceInstanceStore } from '../../stores/device-instance.store'
import { showToast } from '../../utils/toast'

interface DispatchConfirmBubbleProps {
  instance: DeviceInstance
  onDispatchSuccess: () => void
}

function DispatchConfirmBubble({ instance, onDispatchSuccess }: DispatchConfirmBubbleProps) {
  const [showBubble, setShowBubble] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { updateDeviceInstance } = useDeviceInstanceStore()

  const gatewayName = instance.gateway?.name || instance.gatewayId

  const handleDispatch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await dispatchConfig({
        gatewayId: instance.gatewayId,
        deviceInstanceId: instance.id,
      })
      await updateDeviceInstance(instance.id, { status: 'COLLECTING' })
      setShowBubble(false)
      showToast('配置下发成功', 'success')
      onDispatchSuccess()
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || '下发失败'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleButtonClick = () => {
    setShowBubble(!showBubble)
    setError(null)
  }

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
      >
        下发配置
      </button>

      {showBubble && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowBubble(false)}
          />
          <div className="absolute left-0 top-full mt-2 z-20 w-72 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  确定下发配置到网关「{gatewayName}」吗？
                </p>
                {error && (
                  <p className="mt-1 text-sm text-red-500">{error}</p>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowBubble(false)}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDispatch}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? '下发中...' : '确定'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DispatchConfirmBubble
