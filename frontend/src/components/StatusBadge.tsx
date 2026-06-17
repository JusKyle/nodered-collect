interface StatusBadgeProps {
  status: string
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    ONLINE: { bg: 'bg-green-100', text: 'text-green-700', label: '在线' },
    OFFLINE: { bg: 'bg-gray-100', text: 'text-gray-600', label: '离线' },
    SYNCING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '同步中' },
    ERROR: { bg: 'bg-red-100', text: 'text-red-700', label: '错误' },
    PENDING: { bg: 'bg-blue-100', text: 'text-blue-700', label: '待处理' },
    SUCCESS: { bg: 'bg-green-100', text: 'text-green-700', label: '成功' },
    FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: '失败' },
  }

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

export default StatusBadge