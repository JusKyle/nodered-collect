import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import GatewayList from './pages/gateway/GatewayList'
import DeviceModelList from './pages/device-model/DeviceModelList'
import DeviceInstanceList from './pages/device-instance/DeviceInstanceList'
import SyncRecords from './pages/sync/SyncRecords'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<GatewayList />} />
        <Route path="gateways" element={<GatewayList />} />
        <Route path="device-models" element={<DeviceModelList />} />
        <Route path="device-instances" element={<DeviceInstanceList />} />
        <Route path="sync" element={<SyncRecords />} />
      </Route>
    </Routes>
  )
}

export default App