import { create } from 'zustand'
import type { DeviceInstance } from '../types'
import * as deviceInstanceApi from '../api/device-instance.api'

interface DeviceInstanceStore {
  deviceInstances: DeviceInstance[]
  loading: boolean
  error: string | null
  fetchDeviceInstances: () => Promise<void>
  createDeviceInstance: (data: { name: string; modelId: string; gatewayId: string; nodeId: string; config?: Record<string, any> }) => Promise<void>
  batchCreateDeviceInstances: (data: { instances: Array<{ name: string; modelId: string; gatewayId: string; nodeId: string; config?: Record<string, any> }> }) => Promise<void>
  updateDeviceInstance: (id: string, data: Partial<DeviceInstance>) => Promise<void>
  deleteDeviceInstance: (id: string) => Promise<void>
}

export const useDeviceInstanceStore = create<DeviceInstanceStore>((set) => ({
  deviceInstances: [],
  loading: false,
  error: null,

  fetchDeviceInstances: async () => {
    set({ loading: true, error: null })
    try {
      const deviceInstances = await deviceInstanceApi.getAllDeviceInstances()
      set({ deviceInstances, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  createDeviceInstance: async (data) => {
    set({ loading: true, error: null })
    try {
      const deviceInstance = await deviceInstanceApi.createDeviceInstance(data)
      set((state) => ({ deviceInstances: [...state.deviceInstances, deviceInstance], loading: false }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  batchCreateDeviceInstances: async (data) => {
    set({ loading: true, error: null })
    try {
      const deviceInstances = await deviceInstanceApi.batchCreateDeviceInstances(data)
      set((state) => ({ deviceInstances: [...state.deviceInstances, ...deviceInstances], loading: false }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  updateDeviceInstance: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const deviceInstance = await deviceInstanceApi.updateDeviceInstance(id, data)
      set((state) => ({
        deviceInstances: state.deviceInstances.map((i) => (i.id === id ? deviceInstance : i)),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  deleteDeviceInstance: async (id) => {
    set({ loading: true, error: null })
    try {
      await deviceInstanceApi.deleteDeviceInstance(id)
      set((state) => ({
        deviceInstances: state.deviceInstances.filter((i) => i.id !== id),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  }
}))