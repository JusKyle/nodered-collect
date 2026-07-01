import { create } from 'zustand'
import type { DeviceModel, Point, ModelVersion } from '../types'
import * as deviceModelApi from '../api/device-model.api'

interface DeviceModelStore {
  deviceModels: DeviceModel[]
  loading: boolean
  error: string | null
  total: number
  page: number
  pageSize: number
  fetchDeviceModels: (params?: deviceModelApi.DeviceModelListParams) => Promise<void>
  createDeviceModel: (data: { name: string; modelDI: string; protocol: string; description?: string }) => Promise<void>
  updateDeviceModel: (id: string, data: Partial<DeviceModel>) => Promise<void>
  deleteDeviceModel: (id: string) => Promise<void>
  importPoints: (id: string, points: Point[]) => Promise<void>
  duplicateModel: (id: string, newName?: string) => Promise<void>
  getVersionHistory: (id: string) => Promise<ModelVersion[]>
  updateModelStatus: (id: string, status: 'ENABLED' | 'DISABLED') => Promise<void>
}

export const useDeviceModelStore = create<DeviceModelStore>((set) => ({
  deviceModels: [],
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,

  fetchDeviceModels: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const result = await deviceModelApi.getAllDeviceModels(params)
      set({
        deviceModels: result.list,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        loading: false
      })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  createDeviceModel: async (data) => {
    set({ loading: true, error: null })
    try {
      const deviceModel = await deviceModelApi.createDeviceModel(data)
      set((state) => ({ deviceModels: [...state.deviceModels, deviceModel], loading: false }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  updateDeviceModel: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const deviceModel = await deviceModelApi.updateDeviceModel(id, data)
      set((state) => ({
        deviceModels: state.deviceModels.map((m) => (m.id === id ? deviceModel : m)),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  deleteDeviceModel: async (id) => {
    set({ loading: true, error: null })
    try {
      await deviceModelApi.deleteDeviceModel(id)
      set((state) => ({
        deviceModels: state.deviceModels.filter((m) => m.id !== id),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  importPoints: async (id, points) => {
    set({ loading: true, error: null })
    try {
      await deviceModelApi.importPoints(id, points)
      const result = await deviceModelApi.getAllDeviceModels()
      set({ deviceModels: result.list, total: result.total, page: result.page, pageSize: result.pageSize, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  duplicateModel: async (id, newName) => {
    set({ loading: true, error: null })
    try {
      await deviceModelApi.duplicateDeviceModel(id, newName)
      const result = await deviceModelApi.getAllDeviceModels()
      set({ deviceModels: result.list, total: result.total, page: result.page, pageSize: result.pageSize, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  getVersionHistory: async (id) => {
    try {
      return await deviceModelApi.getDeviceModelVersions(id)
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  updateModelStatus: async (id, status) => {
    set({ loading: true, error: null })
    try {
      const updatedModel = await deviceModelApi.updateDeviceModelStatus(id, status)
      set((state) => ({
        deviceModels: state.deviceModels.map((m) => (m.id === id ? updatedModel : m)),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  }
}))