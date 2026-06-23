import { create } from 'zustand'
import type { Gateway } from '../types'
import * as gatewayApi from '../api/gateway.api'

interface GatewayStore {
  gateways: Gateway[]
  loading: boolean
  error: string | null
  fetchGateways: () => Promise<void>
  createGateway: (data: { name: string; address: string; port?: number; adminToken: string }) => Promise<void>
  updateGateway: (id: string, data: Partial<Gateway>) => Promise<void>
  updateGatewayStatus: (id: string, status: string, extra?: Partial<Gateway>) => void
  deleteGateway: (id: string) => Promise<void>
  testConnection: (data: { gatewayId?: string; address: string; port?: number; adminToken: string }) => Promise<{ success: boolean; tokenExpired: boolean; message: string }>
}

export const useGatewayStore = create<GatewayStore>((set) => ({
  gateways: [],
  loading: false,
  error: null,

  fetchGateways: async () => {
    set({ loading: true, error: null })
    try {
      const gateways = await gatewayApi.getAllGateways()
      set({ gateways, loading: false })
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
  }
}))
