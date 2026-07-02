import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import MainLayout from './layouts/MainLayout'
import GatewayList from './pages/gateway/GatewayList'
import GatewayDetail from './pages/gateway/GatewayDetail'
import DeviceModelList from './pages/device-model/DeviceModelList'
import DeviceModelDetail from './pages/device-model/DeviceModelDetail'
import DeviceInstanceList from './pages/device-instance/DeviceInstanceList'
import DeviceInstanceDetail from './pages/device-instance/Detail'
import SyncRecords from './pages/sync/SyncRecords'
import SystemConfigPage from './pages/system/SystemConfigPage'
import { TOAST_EVENT, ToastEventDetail, ToastType } from './utils/toast'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const toastStyles: Record<ToastType, string> = {
  error: 'bg-red-600 text-white',
  success: 'bg-green-600 text-white',
  info: 'bg-blue-600 text-white',
}

function App() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastEventDetail>
      const { message, type } = customEvent.detail
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3000)
    }

    window.addEventListener(TOAST_EVENT, handleToast as EventListener)
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast as EventListener)
    }
  }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<GatewayList />} />
          <Route path="gateways" element={<GatewayList />} />
          <Route path="gateways/:id" element={<GatewayDetail />} />
          <Route path="device-models" element={<DeviceModelList />} />
          <Route path="device-models/:id" element={<DeviceModelDetail />} />
          <Route path="device-instances" element={<DeviceInstanceList />} />
          <Route path="device-instance/:id" element={<DeviceInstanceDetail />} />
          <Route path="sync" element={<SyncRecords />} />
          <Route path="system-config" element={<SystemConfigPage />} />
        </Route>
      </Routes>

      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded shadow-lg min-w-[240px] text-sm ${toastStyles[toast.type]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  )
}

export default App
