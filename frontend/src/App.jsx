import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import LoadingScreen from './components/LoadingScreen'
import Dashboard from './pages/Dashboard'
import ContentAnalyzer from './pages/ContentAnalyzer'
import BiasScores from './pages/BiasScores'
import HumanReview from './pages/HumanReview'
import FairRanking from './pages/FairRanking'
import AuditReports from './pages/AuditReports'
import Settings from './pages/Settings'
import FairnessMetrics from './pages/FairnessMetrics'
import { getStats } from './utils/analysisStorage'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [pendingReviews, setPendingReviews] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Refresh badge count every time the page changes or every 3 seconds
  useEffect(() => {
    const update = () => setPendingReviews(getStats().pendingReviews)
    update()
    const interval = setInterval(update, 3000)
    return () => clearInterval(interval)
  }, [currentPage])

  const handleLoadingComplete = () => {
    setIsLoading(false)
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />
      case 'analyzer':
        return <ContentAnalyzer />
      case 'bias-scores':
        return <BiasScores />
      case 'human-review':
        return <HumanReview />
      case 'fair-ranking':
        return <FairRanking />
      case 'audit-reports':
        return <AuditReports />
      case 'settings':
        return <Settings />
      case 'fairness-metrics':
        return <FairnessMetrics />
      default:
        return <Dashboard />
    }
  }

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        pendingReviews={pendingReviews}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        {renderPage()}
      </main>
    </div>
  )
}

export default App