import type { ReactNode, MouseEvent } from 'react'

interface StatusBadgeProps {
  status: string
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void
  tooltip?: string
}

function StatusBadge({ status, onClick, tooltip }: StatusBadgeProps) {
  const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    ONLINE: { dot: 'bg-green-500', bg: 'bg-green-100', text: 'text-green-700', label: '在线' },
    OFFLINE: { dot: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-700', label: '离线' },
    DISABLED: { dot: 'bg-orange-500', bg: 'bg-orange-100', text: 'text-orange-700', label: '已禁用' },
    COLLECTING: { dot: 'bg-blue-500', bg: 'bg-blue-100', text: 'text-blue-700', label: '采集中' },
    ERROR: { dot: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-700', label: '错误' },
    TOKEN_EXPIRED: { dot: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-700', label: 'Token失效' },
    SUCCESS: { dot: 'bg-green-500', bg: 'bg-green-100', text: 'text-green-700', label: '成功' },
    FAILED: { dot: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-700', label: '失败' },
  }

  const config = statusConfig[status] || { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600', label: status }
  const isClickable = !!onClick
  const cursorClass = isClickable ? 'cursor-pointer' : ''

  let content: ReactNode = (
    <span className={`inline-flex items-center gap-1.5 ${cursorClass}`} onClick={onClick} title={tooltip}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    </span>
  )

  return content
}

export default StatusBadge
