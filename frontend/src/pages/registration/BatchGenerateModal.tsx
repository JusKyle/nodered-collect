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
  { value: 3650, label: '永不过期' },
  { value: -1, label: '自定义' },
]

function BatchGenerateModal({ isOpen, onClose, onSuccess }: BatchGenerateModalProps) {
  const { batchGenerate } = useRegistrationCodeStore()
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  const [showCustomDays, setShowCustomDays] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      count: 1,
      validityDays: 30
    }
  })

  const handleClose = () => {
    reset()
    setGeneratedCodes([])
    setShowCustomDays(false)
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

  const handleValiditySelect = (value: number) => {
    if (value === -1) {
      setShowCustomDays(true)
    } else {
      setShowCustomDays(false)
      setValue('validityDays', value)
    }
  }

  if (!isOpen) return null

  const currentValidity = watch('validityDays')

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[440px] overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">批量生成注册码</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6">
          {generatedCodes.length === 0 ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  生成数量 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('count', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={50}
                  placeholder="1-50"
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.count ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                <p className="text-xs text-gray-400 mt-1.5">单次最多生成 50 个注册码</p>
                {errors.count && <p className="mt-1.5 text-xs text-red-500">{errors.count.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  有效期 <span className="text-red-500">*</span>
                </label>
                <select
                  value={showCustomDays ? -1 : currentValidity}
                  onChange={(e) => handleValiditySelect(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {validityOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {showCustomDays && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <input
                        {...register('validityDays', { valueAsNumber: true })}
                        type="number"
                        min={1}
                        max={3650}
                        placeholder="请输入天数"
                        className={`flex-1 px-4 py-2.5 bg-gray-50 border rounded-lg text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm ${
                          errors.validityDays ? 'border-red-500' : 'border-gray-200'
                        }`}
                      />
                      <span className="text-sm text-gray-500">天</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">范围：1 - 3650 天</p>
                  </div>
                )}
                {errors.validityDays && <p className="mt-1.5 text-xs text-red-500">{errors.validityDays.message}</p>}
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
                  className="text-sm text-primary-500 hover:text-indigo-600 font-medium transition-colors"
                >
                  复制全部
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto border border-gray-100">
                <ul className="space-y-1.5">
                  {generatedCodes.map((code, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between text-sm font-mono text-gray-700 py-1.5 px-2 hover:bg-white rounded-lg transition-colors"
                    >
                      <span>{code}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(code)
                          showToast('已复制', 'success')
                        }}
                        className="text-gray-400 hover:text-primary-500 transition-colors"
                      >
                        <i className="fas fa-copy text-xs"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          {generatedCodes.length === 0 ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-indigo-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '生成中...' : '生成'}
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="px-5 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-indigo-600 font-medium transition-colors"
            >
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default BatchGenerateModal
