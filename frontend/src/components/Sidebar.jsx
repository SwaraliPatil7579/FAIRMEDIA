import { 
  LayoutDashboard, 
  FileSearch, 
  BarChart3, 
  UserCheck, 
  Scale, 
  FileText, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Activity,
  Gauge
} from 'lucide-react'

function Sidebar({ currentPage, onNavigate, pendingReviews, collapsed, onToggleCollapse }) {
  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      badge: null
    },
    { 
      id: 'analyzer', 
      label: 'Content Analyzer', 
      icon: FileSearch,
      badge: null
    },
    { 
      id: 'bias-scores', 
      label: 'Bias Scores', 
      icon: BarChart3,
      badge: null
    },
    { 
      id: 'human-review', 
      label: 'Human Review', 
      icon: UserCheck,
      badge: pendingReviews
    },
    { 
      id: 'fair-ranking', 
      label: 'Fair Ranking', 
      icon: Scale,
      badge: null
    },
    { 
      id: 'audit-reports', 
      label: 'Audit Reports', 
      icon: FileText,
      badge: null
    },
    { 
      id: 'fairness-metrics', 
      label: 'Fairness Metrics', 
      icon: Gauge,
      badge: null
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: SettingsIcon,
      badge: null
    },
  ]

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-lg transition-all duration-300 z-50 ${
      collapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 relative">
        {!collapsed && (
          <>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FAIRMEDIA
            </h1>
            <p className="text-xs text-gray-500 mt-1">AI Bias Audit System</p>
            <div className="mt-3 flex items-center gap-2">
              <Activity className="w-3 h-3 text-green-500 animate-pulse" />
              <span className="text-xs text-gray-600">System Active</span>
            </div>
          </>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              FM
            </div>
          </div>
        )}
        
        {/* Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-8 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-md transition-all"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4 overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3 px-4 py-3 rounded-lg transition-all group relative ${
                    currentPage === item.id
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 font-medium shadow-sm border border-blue-100'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                  }`}
                  title={collapsed ? item.label : ''}
                >
                  <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                    <Icon className={`${collapsed ? 'w-5 h-5' : 'w-5 h-5'} ${currentPage === item.id ? 'text-blue-600' : ''}`} />
                    {!collapsed && <span className="text-sm">{item.label}</span>}
                  </div>
                  {!collapsed && item.badge && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50">
        {!collapsed ? (
          <div className="text-xs text-gray-600">
            <div className="flex justify-between mb-1">
              <span>Version</span>
              <span className="font-semibold text-gray-700">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-green-600 font-semibold flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Healthy
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
