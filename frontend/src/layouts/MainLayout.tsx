import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useAppStore } from '../stores/app.store'

function MainLayout() {
  const { sidebarOpen } = useAppStore()

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default MainLayout