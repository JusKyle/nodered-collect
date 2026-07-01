import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Point } from '../../../types'

interface PointModalProps {
  isOpen: boolean
  title: string
  protocol: string
  point?: Point | null
  onClose: () => void
  onSubmit: (data: Partial<Point>) => Promise<void>
}

const DATA_TYPES = ['BOOL', 'INT16', 'UINT16', 'INT32', 'UINT32', 'FLOAT32', 'FLOAT64', 'STRING']

const schema = z.object({
  tag: z.string().min(1, '请输入点位标识').max(50, '点位标识不能超过50个字符').regex(/^\w+$/, '点位标识只能包含字母、数字和下划线'),
  name: z.string().min(1, '请输入点位名称').max(100, '点位名称不能超过100个字符'),
  dataType: z.string().min(1, '请选择数据类型'),
  unit: z.string().max(20, '单位不能超过20个字符').optional(),
  description: z.string().max(200, '描述不能超过200个字符').optional(),
  readWrite: z.string().optional(),
  address: z.string().optional(),
  slaveId: z.coerce.number().optional(),
  registerType: z.string().optional(),
  startAddress: z.coerce.number().optional(),
  quantity: z.coerce.number().optional(),
  byteOrder: z.string().optional(),
  dbBlock: z.coerce.number().optional(),
  byteOffset: z.coerce.number().optional(),
  bitOffset: z.coerce.number().optional(),
  namespaceIndex: z.coerce.number().optional(),
  nodeId: z.string().optional(),
  jsonPath: z.string().optional(),
  parseRule: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const buildConfig = (protocol: string, data: FormData) => {
  if (protocol === 'MODBUS_TCP' || protocol === 'MODBUS_RTU') {
    return {
      slaveId: data.slaveId,
      registerType: data.registerType,
      startAddress: data.startAddress,
      quantity: data.quantity || 1,
      byteOrder: data.byteOrder || 'BE'
    }
  }
  if (protocol === 'S7') {
    return { dbBlock: data.dbBlock, byteOffset: data.byteOffset, bitOffset: data.bitOffset }
  }
  if (protocol === 'OPC_UA') {
    return { namespaceIndex: data.namespaceIndex, nodeId: data.nodeId }
  }
  if (protocol === 'MQTT') {
    return { jsonPath: data.jsonPath }
  }
  if (protocol === 'TCP') {
    return { parseRule: data.parseRule }
  }
  return {}
}

function PointModal({ isOpen, title, protocol, point, onClose, onSubmit }: PointModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (isOpen) {
      const config = point?.config || {}
      reset({
        tag: point?.tag || point?.code || '',
        name: point?.name || '',
        dataType: point?.dataType || '',
        unit: point?.unit || '',
        description: point?.description || '',
        readWrite: point?.readWrite || config.access || config.readWrite || '只读',
        address: point?.address || '',
        slaveId: config.slaveId ?? 1,
        registerType: config.registerType || 'Holding',
        startAddress: config.startAddress ?? 0,
        quantity: config.quantity ?? 1,
        byteOrder: config.byteOrder || 'BE',
        dbBlock: config.dbBlock ?? 1,
        byteOffset: config.byteOffset ?? 0,
        bitOffset: config.bitOffset ?? 0,
        namespaceIndex: config.namespaceIndex ?? 2,
        nodeId: config.nodeId || '',
        jsonPath: config.jsonPath || '',
        parseRule: config.parseRule || '',
      })
    }
  }, [isOpen, point, reset])

  const submit = async (data: FormData) => {
    const config = buildConfig(protocol, data)
    await onSubmit({
      tag: data.tag,
      name: data.name,
      dataType: data.dataType,
      address: data.address || data.nodeId || data.jsonPath || data.parseRule || String(data.startAddress ?? data.byteOffset ?? ''),
      unit: data.unit || undefined,
      description: data.description || undefined,
      readWrite: data.readWrite || '只读',
      config: { ...config, access: data.readWrite || '只读' }
    })
    reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <div><h2 className="text-lg font-semibold text-gray-900">{title}</h2><p className="text-sm text-gray-500 mt-1">{protocol} 协议</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="p-6 space-y-5">
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">点位ID *</label><input {...register('tag')} className={`w-full px-3 py-2 border rounded-lg ${errors.tag ? 'border-red-500' : 'border-gray-300'}`} />{errors.tag && <p className="mt-1 text-sm text-red-500">{errors.tag.message}</p>}</div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">点位名称 *</label><input {...register('name')} className={`w-full px-3 py-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />{errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}</div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">数据类型 *</label><select {...register('dataType')} className={`w-full px-3 py-2 border rounded-lg ${errors.dataType ? 'border-red-500' : 'border-gray-300'}`}><option value="">请选择</option>{DATA_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">读写权限 *</label><select {...register('readWrite')} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="只读">只读</option><option value="读写">读写</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">单位</label><input {...register('unit')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">协议特殊字段</h3>
            {(protocol === 'MODBUS_TCP' || protocol === 'MODBUS_RTU') && <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-gray-700 mb-1">站号</label><input type="number" {...register('slaveId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm text-gray-700 mb-1">寄存器类型</label><select {...register('registerType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="Coil">Coil</option><option value="Holding">Holding</option><option value="Input">Input</option><option value="Discrete">Discrete</option></select></div><div><label className="block text-sm text-gray-700 mb-1">起始地址</label><input type="number" {...register('startAddress')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm text-gray-700 mb-1">数量</label><input type="number" {...register('quantity')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div></div>}
            {protocol === 'S7' && <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm text-gray-700 mb-1">DB 号</label><input type="number" {...register('dbBlock')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm text-gray-700 mb-1">字节偏移</label><input type="number" {...register('byteOffset')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm text-gray-700 mb-1">位偏移</label><input type="number" {...register('bitOffset')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div></div>}
            {protocol === 'OPC_UA' && <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-gray-700 mb-1">命名空间索引</label><input type="number" {...register('namespaceIndex')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm text-gray-700 mb-1">节点ID</label><input {...register('nodeId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div></div>}
            {protocol === 'MQTT' && <div><label className="block text-sm text-gray-700 mb-1">字段路径 JSONPath</label><input {...register('jsonPath')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>}
            {protocol === 'TCP' && <div><label className="block text-sm text-gray-700 mb-1">解析规则表达式</label><input {...register('parseRule')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>}
          </section>

          <div><label className="block text-sm font-medium text-gray-700 mb-1">描述</label><input {...register('description')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">取消</button><button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-primary-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-60">{isSubmitting ? '保存中...' : '确定'}</button></div>
        </form>
      </div>
    </div>
  )
}

export default PointModal
