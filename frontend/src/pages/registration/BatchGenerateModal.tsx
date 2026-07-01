import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRegistrationCodeStore } from '../../stores/registration.store'
import { showToast } from '../../utils/toast'

interface BatchGenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const schema = z.object({
  count: z
    .number()
    .min(1, '数量至少为 1')
    .max(50, '数量最多为 50'),
  validityDays: z
    .number()
    .min(1, '有效期至少为 1 天')
    .max(3650, '有效期最多为 3650 天')
})

type FormData = z.infer<typeof schema>

const validityOptions = [
  { value: 7, label: '7 天' },
  { value: 30, label: '30 天' },
  { value: 90, label: '90 天' },
  { value: 180, label: '180 天' },
  { value: 3650, label: '永不过期' }
]

function BatchGenerateModal({ isOpen, onClose, onSuccess }: BatchGenerateModalProps) {
  const { batchGenerate } = useRegistrationCodeStore()
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      count: 10,
      validityDays: 30
    }
  })

  const handleClose = () => {
    reset()
    setGeneratedCodes([])
    onClose()
  }

  const onSubmit = async (data: FormData) => {
    try {
      const codes = await batchGenerate(data)
      setGeneratedCodes(codes.map((c) => c.code))
      showToast(`成功生成 ${codes.length} 个注册码`, 'success')
      onSuccess?.()
    } catch (error: any) {
      showToast(error.response?.data?.message || '生成失败', 'error')
    }
  }

  const copyAllCodes = () => {
    if (generatedCodes.length > 0) {
      navigator.clipboard.writeText(generatedCodes.join('\n'))
      showToast('已复制全部注册码', 'success')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">批量生成注册码</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {generatedCodes.length === 0 ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  生成数量 <span className="text-gray-400">(1-50个)</span>
                </label>
                <input
                  {...register('count', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={50}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.count ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.count && <p className="mt-1 text-sm text-red-500">{errors.count.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">有效期</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {validityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => register('validityDays', { value: opt.value })}
                      onClickCapture={(e) => {
                        e.preventDefault()
                        reset({ count: watch('count'), validityDays: opt.value })
                      }}
                      className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                        watch('validityDays') === opt.value
                          ? 'bg-primary-50 border-primary-500 text-primary-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-500">自定义：</label>
                  <input
                    {...register('validityDays', { valueAsNumber: true })}
                    type="number"
                    min={1}
                    max={3650}
                    className={`w-32 px-3 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.validityDays ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <span className="text-sm text-gray-500">天</span>
                </div>
                {errors.validityDays && <p className="mt-1 text-sm text-red-500">{errors.validityDays.message}</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? '生成中...' : '生成'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  已生成 <span className="font-semibold text-gray-900">{generatedCodes.length}</span> 个注册码
                </p>
                <button
                  onClick={copyAllCodes}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  复制全部
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <ul className="space-y-1">
                  {generatedCodes.map((code, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between text-sm font-mono text-gray-700 py-1 hover:bg-white rounded px-2"
                    >
                      <span>{code}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(code)
                          showToast('已复制', 'success')
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  完成
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BatchGenerateModal
