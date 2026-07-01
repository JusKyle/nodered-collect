import { create } from 'zustand'
import type { Gateway } from '../types'
import * as gatewayApi from '../api/gateway.api'
import type { TestConnectionResult, GatewayListQuery } from '../api/gateway.api'

interface GatewayStore {
  gateways: Gateway[]
  loading: boolean
  error: string | null
  // 分页
  page: number
  pageSize: number
  total: number
  totalPages: number
  // 筛选
  filterName: string
  filterAddress: string
  filterStatus: string
  fetchGateways: (query?: GatewayListQuery) => Promise<void>
  createGateway: (data: { name: string; address: string; port?: number }) => Promise<Gateway>
  updateGateway: (id: string, data: Partial<Gateway>) => Promise<void>
  updateGatewayStatus: (id: string, status: string, extra?: Partial<Gateway>) => void
  deleteGateway: (id: string) => Promise<void>
  testConnection: (data: { gatewayId?: string; address?: string; port?: number; adminToken?: string }) => Promise<TestConnectionResult>
  setPage: (page: number) => void
  setFilterName: (name: string) => void
  setFilterAddress: (address: string) => void
  setFilterStatus: (status: string) => void
}

export const useGatewayStore = create<GatewayStore>((set, get) => ({
  gateways: [],
  loading: false,
  error: null,
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  filterName: '',
  filterAddress: '',
  filterStatus: '',

  fetchGateways: async (query?: GatewayListQuery) => {
    set({ loading: true, error: null })
    try {
      const state = get()
      const params: GatewayListQuery = {
        page: query?.page ?? state.page,
        pageSize: query?.pageSize ?? state.pageSize,
        name: query?.name ?? state.filterName,
        address: query?.address ?? state.filterAddress,
        status: query?.status as GatewayListQuery['status'] ?? undefined
      }
      // 清除空参数
      if (!params.name) delete params.name
      if (!params.address) delete params.address
      if (!params.status) delete params.status
      const result = await gatewayApi.getAllGateways(params)
      set({
        gateways: result.list,
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

  createGateway: async (data) => {
    set({ loading: true, error: null })
    try {
      const gateway = await gatewayApi.createGateway(data)
      set((state) => ({ gateways: [...state.gateways, gateway], loading: false }))
      return gateway
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  updateGateway: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const gateway = await gatewayApi.updateGateway(id, data)
      set((state) => ({
        gateways: state.gateways.map((g) => (g.id === id ? gateway : g)),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  updateGatewayStatus: (id, status, extra) => {
    const cleanedExtra = Object.fromEntries(
      Object.entries(extra || {}).filter(([, value]) => value !== undefined)
    ) as Partial<Gateway>

    set((state) => ({
      gateways: state.gateways.map((g) =>
        g.id === id ? { ...g, status: status as any, ...cleanedExtra } : g
      )
    }))
  },

  deleteGateway: async (id) => {
    set({ loading: true, error: null })
    try {
      await gatewayApi.deleteGateway(id)
      set((state) => ({
        gateways: state.gateways.filter((g) => g.id !== id),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  testConnection: async (data) => {
    return await gatewayApi.testConnection(data)
  },

  setPage: (page) => set({ page }),

  setFilterName: (filterName) => set({ filterName, page: 1 }),

  setFilterAddress: (filterAddress) => set({ filterAddress, page: 1 }),

  setFilterStatus: (filterStatus) => set({ filterStatus, page: 1 })
}))
