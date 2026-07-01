import type { TestResultItem } from '../../api/gateway.api'

interface TestResultModalProps {
  isOpen: boolean
  onClose: () => void
  results: TestResultItem[]
}

function TestResultModal({ isOpen, onClose, results }: TestResultModalProps) {
  if (!isOpen) return null

  const passedCount = results.filter(r => r.passed).length
  const failedCount = results.filter(r => !r.passed).length

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[500px] overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">测试连接结果</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6">
          <div className="divide-y divide-gray-100">
            {results.map((item, index) => (
              <div key={index} className="flex items-center gap-4 py-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.passed ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <i className={`fas ${item.passed ? 'fa-check' : 'fa-times'} text-white text-xs`}></i>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-green-600">{passedCount}</span> 项通过，
            <span className="font-medium text-red-500"> {failedCount}</span> 项未通过
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default TestResultModal
