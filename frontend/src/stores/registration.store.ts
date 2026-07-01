import { create } from 'zustand'
import type { RegistrationCode, RegistrationCodeListQuery, BatchGenerateRequest } from '../api/registration.api'
import * as registrationApi from '../api/registration.api'

interface RegistrationCodeStore {
  codes: RegistrationCode[]
  loading: boolean
  error: string | null
  page: number
  pageSize: number
  total: number
  totalPages: number
  filterStatus: string
  filterCode: string
  fetchCodes: (query?: RegistrationCodeListQuery) => Promise<void>
  batchGenerate: (data: BatchGenerateRequest) => Promise<RegistrationCode[]>
  revokeCode: (id: string) => Promise<void>
  deleteCode: (id: string) => Promise<void>
  setPage: (page: number) => void
  setFilterStatus: (status: string) => void
  setFilterCode: (code: string) => void
}

export const useRegistrationCodeStore = create<RegistrationCodeStore>((set, get) => ({
  codes: [],
  loading: false,
  error: null,
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  filterStatus: '',
  filterCode: '',

  fetchCodes: async (query?: RegistrationCodeListQuery) => {
    set({ loading: true, error: null })
    try {
      const state = get()
      const params: RegistrationCodeListQuery = {
        page: query?.page ?? state.page,
        pageSize: query?.pageSize ?? state.pageSize,
        status: (query?.status ?? (state.filterStatus as RegistrationCodeListQuery['status'])) || undefined,
        code: (query?.code ?? state.filterCode) || undefined
      }
      if (!params.status) delete params.status
      if (!params.code) delete params.code
      const result = await registrationApi.getRegistrationCodeList(params)
      set({
        codes: result.list,
        total: result.total,
        totalPages: result.totalPages,
        page: result.page,
        pageSize: result.pageSize,
        loading: false
      })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  batchGenerate: async (data: BatchGenerateRequest) => {
    const result = await registrationApi.batchGenerateRegistrationCodes(data)
    return result.codes
  },

  revokeCode: async (id: string) => {
    await registrationApi.revokeRegistrationCode(id)
  },

  deleteCode: async (id: string) => {
    await registrationApi.deleteRegistrationCode(id)
  },

  setPage: (page) => set({ page }),

  setFilterStatus: (filterStatus) => set({ filterStatus, page: 1 }),

  setFilterCode: (filterCode) => set({ filterCode, page: 1 })
}))
