import { useState, useEffect } from 'react'
import { getStats, getAnalyses } from '../utils/analysisStorage'
import { healthCheck } from '../api/api_client'
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  FileSearch,
  BarChart3,
  UserCheck,
  Shield,
  Zap,
  AlertCircle,
  Activity
} from 'lucide-react'

function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    total: 0,
    biasDetected: 0,
    mitigated: 0,
    pendingReviews: 0
  })
  const [recentAnalyses, setRecentAnalyses] = useState([])
  const [apiStatus, setApiStatus] = useState(null)

  useEffect(() => {
    loadDashboardData()
    checkApi()
    // Refresh every 5 seconds
    const interval = setInterval(loadDashboardData, 5000)
    const apiInterval = setInterval(checkApi, 30000)
    return () => { clearInterval(interval); clearInterval(apiInterval) }
  }, [])

  const loadDashboardData = () => {
    const statsData = getStats()
    setStats({
      total: statsData.total,
      biasDetected: statsData.biasDetected,
      mitigated: statsData.mitigated,
      pendingReviews: statsData.pendingReviews
    })
    const analyses = getAnalyses()
    setRecentAnalyses(analyses.slice(-5).reverse())
  }

  const checkApi = () => {
    healthCheck().then(setApiStatus).catch(() => setApiStatus({ healthy: false }))
  }

  const getStatusIcon = (analysis) => {
    if (analysis.reviewed) return <CheckCircle className="w-5 h-5 text-green-500" />
    if (analysis.mitigated) return <Zap className="w-5 h-5 text-blue-500" />
    if (analysis.bias_score > 0.7) return <AlertCircle className="w-5 h-5 text-red-500" />
    if (analysis.bias_score > 0.4) return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    return <CheckCircle className="w-5 h-5 text-green-500" />
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time bias detection and fairness monitoring</p>
        </div>

        {/* API Status Banner */}
        {apiStatus !== null && (
          <div className={`mb-6 p-3 rounded-lg border flex items-center gap-3 ${
            apiStatus.healthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${apiStatus.healthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <Activity className={`w-4 h-4 ${apiStatus.healthy ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`text-sm font-medium ${apiStatus.healthy ? 'text-green-800' : 'text-red-800'}`}>
              {apiStatus.healthy
                ? `Backend connected · AI: ${apiStatus.ai_model || 'active'}`
                : 'Backend offline — analyses will use local detection'}
            </span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-3d card-shimmer group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 font-medium">Articles Analyzed</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 group-hover:animate-bounce" />
                  Total analyses
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center icon-bounce-hover transition-all group-hover:scale-110 group-hover:rotate-6">
                <FileText className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-3d card-shimmer group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 font-medium">Bias Detected</p>
                <p className="text-3xl font-bold text-orange-600">{stats.biasDetected}</p>
                <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 group-hover:animate-pulse" />
                  Score &gt; 0.4
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg flex items-center justify-center icon-bounce-hover transition-all group-hover:scale-110 group-hover:rotate-6">
                <AlertTriangle className="w-7 h-7 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-3d card-shimmer group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 font-medium">After Mitigation</p>
                <p className="text-3xl font-bold text-green-600">{stats.mitigated}</p>
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 group-hover:animate-spin" />
                  Successfully mitigated
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center icon-bounce-hover transition-all group-hover:scale-110 group-hover:rotate-6">
                <Shield className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-3d card-shimmer group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 font-medium">Pending Reviews</p>
                <p className="text-3xl font-bold text-purple-600">{stats.pendingReviews}</p>
                <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3 group-hover:animate-pulse" />
                  Awaiting review
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg flex items-center justify-center icon-bounce-hover transition-all group-hover:scale-110 group-hover:rotate-6">
                <UserCheck className="w-7 h-7 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
          <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
          {recentAnalyses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No analyses yet</p>
              <p className="text-sm mt-2">Start analyzing content to see activity here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAnalyses.map((analysis) => (
                <div key={analysis.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 border border-gray-200 hover:border-blue-200 card-shimmer group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                      {getStatusIcon(analysis)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 capitalize group-hover:text-blue-700 transition-colors">
                        {analysis.bias_type.replace(/_/g, ' ')} detected
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <span className="font-medium">Score: {analysis.bias_score.toFixed(2)}</span>
                        <span>•</span>
                        <span className="uppercase text-xs bg-gray-200 px-2 py-0.5 rounded group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">{analysis.language}</span>
                        <span>•</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          analysis.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                          analysis.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {analysis.risk_level} risk
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(analysis.timestamp).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(analysis.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white card-tilt card-ripple group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                  <FileSearch className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold">Analyze Content</h3>
              </div>
              <p className="text-blue-100 text-sm mb-4">Start analyzing new content for bias detection</p>
              <button
                onClick={() => onNavigate && onNavigate('analyzer')}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-all w-full flex items-center justify-center gap-2 group-hover:scale-105 shadow-lg"
              >
                Go to Analyzer
                <FileSearch className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white card-tilt card-ripple group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold">View Scores</h3>
              </div>
              <p className="text-green-100 text-sm mb-4">Review all bias scores and export data</p>
              <button
                onClick={() => onNavigate && onNavigate('bias-scores')}
                className="bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-all w-full flex items-center justify-center gap-2 group-hover:scale-105 shadow-lg"
              >
                View Scores
                <BarChart3 className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white card-tilt card-ripple group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold">Human Review</h3>
              </div>
              <p className="text-purple-100 text-sm mb-4">Review and approve flagged content</p>
              <button
                onClick={() => onNavigate && onNavigate('human-review')}
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-all w-full flex items-center justify-center gap-2 group-hover:scale-105 shadow-lg"
              >
                Review Now
                <UserCheck className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
