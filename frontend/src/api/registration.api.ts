import { api } from '../utils/api'

export interface RegistrationCode {
  id: string
  code: string
  batchId: string | null
  status: 'UNUSED' | 'USED' | 'EXPIRED' | 'REVOKED'
  expiresAt: string
  gatewayId: string | null
  usedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export interface RegistrationCodeListResponse {
  list: RegistrationCode[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface RegistrationCodeListQuery {
  status?: 'UNUSED' | 'USED' | 'EXPIRED' | 'REVOKED'
  code?: string
  page?: number
  pageSize?: number
}

export interface BatchGenerateRequest {
  count: number
  validityDays: number
}

export interface BatchGenerateResponse {
  codes: RegistrationCode[]
  batchId: string
}

export const getRegistrationCodeList = async (
  query?: RegistrationCodeListQuery
): Promise<RegistrationCodeListResponse> => {
  const params = new URLSearchParams()
  if (query?.status) params.append('status', query.status)
  if (query?.code) params.append('code', query.code)
  if (query?.page) params.append('page', String(query.page))
  if (query?.pageSize) params.append('pageSize', String(query.pageSize))
  const response = await api.get(`/registration/codes?${params.toString()}`)
  return response.data
}

export const batchGenerateRegistrationCodes = async (
  data: BatchGenerateRequest
): Promise<BatchGenerateResponse> => {
  const response = await api.post('/registration/batch-generate', data)
  return response.data
}

export const revokeRegistrationCode = async (id: string): Promise<RegistrationCode> => {
  const response = await api.post(`/registration/codes/${id}/revoke`)
  return response.data
}
