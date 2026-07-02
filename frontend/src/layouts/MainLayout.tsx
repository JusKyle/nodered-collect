import { Outlet, Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/gateways', label: '采集网关', icon: 'fa-server' },
  { path: '/device-models', label: '设备模型', icon: 'fa-microchip' },
  { path: '/device-instances', label: '设备实例', icon: 'fa-cubes' },
  { path: '/sync', label: '配置记录', icon: 'fa-sync' },
  { path: '/system-config', label: '系统配置', icon: 'fa-cog' },
]

function MainLayout() {
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => {
    if (path === '/gateways') {
      return currentPath === '/gateways' || currentPath === '/' || currentPath.startsWith('/gateways/')
    }
    return currentPath.startsWith(path)
  }

  const getPageTitle = () => {
    const item = navItems.find(item => isActive(item.path))
    return item?.label || '数据采集系统'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-server text-white"></i>
              </div>
              <span className="text-lg font-bold text-gray-900">{getPageTitle()}</span>
            </div>
            <div className="flex items-center gap-6">
              <nav className="flex gap-5 text-sm text-gray-600">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`pb-1 transition-colors ${
                      isActive(item.path)
                        ? 'text-primary-500 font-medium border-b-2 border-primary-500'
                        : 'hover:text-primary-500 border-b-2 border-transparent'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Admin</span>
                <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                  <i className="fas fa-user text-gray-600 text-sm"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
