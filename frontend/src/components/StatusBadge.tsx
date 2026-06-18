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
    ERROR: { dot: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-700', label: '错误' },
    SYNCING: { dot: 'bg-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-700', label: '同步中' },
    PENDING: { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600', label: '未绑定' },
    UNBOUND: { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600', label: '未绑定' },
    PENDING_SYNC: { dot: 'bg-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-700', label: '待同步' },
    RUNNING: { dot: 'bg-green-500', bg: 'bg-green-100', text: 'text-green-700', label: '运行中' },
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
