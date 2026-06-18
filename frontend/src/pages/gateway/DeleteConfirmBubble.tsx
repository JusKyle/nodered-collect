import { useState, useRef, useEffect } from 'react'
import type { Gateway } from '../../types'
import { useGatewayStore } from '../../stores/gateway.store'

interface DeleteConfirmBubbleProps {
  gateway: Gateway
  onDelete: () => void
}

function DeleteConfirmBubble({ gateway, onDelete }: DeleteConfirmBubbleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { deleteGateway: deleteGatewayFromStore } = useGatewayStore()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        bubbleRef.current &&
        !bubbleRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
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

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteGatewayFromStore(gateway.id)
      onDelete()
      setIsOpen(false)
    } catch (error) {
      console.error('删除网关失败:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="text-red-600 hover:text-red-900"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={bubbleRef}
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
        >
          <div className="p-4">
            <div className="text-sm text-gray-900 mb-2">
              确定删除网关「{gateway.name}」吗？
            </div>
            <div className="text-sm text-gray-500 mb-4">
              该网关下 {(gateway as { deviceCount?: number }).deviceCount || 0} 个设备将转为未绑定状态
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? '删除中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeleteConfirmBubble
