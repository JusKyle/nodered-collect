import { create } from 'zustand'
import type { SyncRecord } from '../types'
import * as syncApi from '../api/sync.api'

interface SyncQueryParams {
  gatewayId?: string
  status?: string
  type?: string
  startDate?: string
  endDate?: string
  page: number
  pageSize: number
}

interface Pagination {
  total: number
  page: number
  pageSize: number
}

interface SyncStore {
  records: SyncRecord[]
  loading: boolean
  error: string | null
  pagination: Pagination
  queryParams: SyncQueryParams
  fetchRecords: (params?: Partial<SyncQueryParams>) => Promise<void>
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setFilters: (filters: Partial<Omit<SyncQueryParams, 'page' | 'pageSize'>>) => void
  resetFilters: () => void
}

const defaultQueryParams: SyncQueryParams = {
  page: 1,
  pageSize: 10
}

const defaultPagination: Pagination = {
  total: 0,
  page: 1,
  pageSize: 10
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  records: [],
  loading: false,
  error: null,
  pagination: defaultPagination,
  queryParams: defaultQueryParams,

  fetchRecords: async (params) => {
    const newQueryParams = { ...get().queryParams, ...params }
    set({ loading: true, error: null, queryParams: newQueryParams })
    
    try {
      const response = await syncApi.getSyncRecords(newQueryParams)
      set({
        records: response.records,
        pagination: response.pagination,
        loading: false
      })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  setPage: (page) => {
    const { fetchRecords } = get()
    fetchRecords({ page })
  },

  setPageSize: (pageSize) => {
    const { fetchRecords } = get()
    fetchRecords({ pageSize, page: 1 })
  },

  setFilters: (filters) => {
    const { fetchRecords } = get()
    fetchRecords({ ...filters, page: 1 })
  },

  resetFilters: () => {
    const { fetchRecords } = get()
    fetchRecords({ ...defaultQueryParams })
  }
}))