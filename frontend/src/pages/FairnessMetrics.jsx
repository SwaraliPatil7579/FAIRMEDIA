import { useState, useEffect } from 'react'
import { getAnalyses } from '../utils/analysisStorage'
import { healthCheck } from '../api/api_client'
import { Activity, Shield, AlertTriangle, CheckCircle, Zap } from 'lucide-react'

const BIAS_CATEGORIES = [
  { key: 'gender_bias',        label: 'Gender Bias',        color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  { key: 'stereotype',         label: 'Stereotype',         color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { key: 'age_bias',           label: 'Age Bias',           color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { key: 'disability_bias',    label: 'Disability Bias',    color: 'text-pink-600',   bg: 'bg-pink-50',   border: 'border-pink-200' },
  { key: 'religious_bias',     label: 'Religious Bias',     color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { key: 'socioeconomic_bias', label: 'Socioeconomic Bias', color: 'text-teal-600',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  { key: 'language_dominance', label: 'Language Dominance', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
]

function FairnessMetrics() {
  const [analyses, setAnalyses] = useState([])
  const [apiHealth, setApiHealth] = useState(null)

  useEffect(() => {
    setAnalyses(getAnalyses())
    healthCheck().then(setApiHealth).catch(() => setApiHealth({ healthy: false }))
  }, [])

  const total = analyses.length

  // Risk distribution
  const riskCounts = analyses.reduce(
    (acc, a) => {
      const level = (a.risk_level || 'low').toLowerCase()
      acc[level] = (acc[level] || 0) + 1
      return acc
    },
    { low: 0, medium: 0, high: 0, critical: 0 }
  )

  // Average scores per category
  const avgScores = BIAS_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = total > 0
      ? analyses.reduce((sum, a) => sum + (a.bias_detection?.bias_scores?.[cat.key] || 0), 0) / total
      : 0
    return acc
  }, {})

  // Overall fairness (0–100, higher = fairer)
  const overallFairness = total > 0
    ? Math.max(0, 100 - (analyses.reduce((sum, a) => sum + (a.bias_score || 0), 0) / total) * 100)
    : 100

  // Trend: last 5 vs previous 5
  const recent5  = analyses.slice(-5)
  const prev5    = analyses.slice(-10, -5)
  const avgRecent = recent5.length  ? recent5.reduce((s, a) => s + (a.bias_score || 0), 0) / recent5.length  : 0
  const avgPrev   = prev5.length    ? prev5.reduce((s, a) => s + (a.bias_score || 0), 0)   / prev5.length    : 0
  const trend = avgPrev === 0 ? 'stable' : avgRecent < avgPrev ? 'improving' : avgRecent > avgPrev ? 'worsening' : 'stable'

  const fairnessColor = overallFairness >= 70 ? 'text-green-600' : overallFairness >= 40 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Fairness Metrics</h1>
          <p className="text-gray-600 mt-1">Real-time fairness analysis across all 7 bias categories</p>
        </div>

        {/* API Status */}
        {apiHealth !== null && (
          <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
            apiHealth.healthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className={`w-3 h-3 rounded-full ${apiHealth.healthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <div className="flex-1">
              <span className={`text-sm font-semibold ${apiHealth.healthy ? 'text-green-800' : 'text-red-800'}`}>
                {apiHealth.healthy ? '✅ Backend Connected' : '❌ Backend Offline'}
              </span>
              {apiHealth.healthy && apiHealth.ai_model && (
                <span className="text-xs text-green-600 ml-2">· AI: {apiHealth.ai_model}</span>
              )}
            </div>
            {apiHealth.healthy && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                <Zap className="w-3 h-3" /> Live
              </span>
            )}
          </div>
        )}

        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Overall Fairness</p>
            <p className={`text-4xl font-bold ${fairnessColor}`}>{overallFairness.toFixed(1)}%</p>
            <p className="text-xs text-gray-400 mt-1">Higher = fairer content</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Total Analyses</p>
            <p className="text-4xl font-bold text-blue-600">{total}</p>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">High Risk</p>
            <p className="text-4xl font-bold text-red-600">{(riskCounts.high || 0) + (riskCounts.critical || 0)}</p>
            <p className="text-xs text-gray-400 mt-1">Needs attention</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Trend</p>
            <p className={`text-2xl font-bold ${
              trend === 'improving' ? 'text-green-600' :
              trend === 'worsening' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend === 'improving' ? '📈 Improving' : trend === 'worsening' ? '📉 Worsening' : '➡️ Stable'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Last 5 vs previous 5</p>
          </div>
        </div>

        {/* Risk distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Risk Distribution
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Low Risk',      count: riskCounts.low      || 0, color: 'text-green-600',  bg: 'bg-green-50',  bar: 'bg-green-500' },
              { label: 'Medium Risk',   count: riskCounts.medium   || 0, color: 'text-yellow-600', bg: 'bg-yellow-50', bar: 'bg-yellow-500' },
              { label: 'High Risk',     count: riskCounts.high     || 0, color: 'text-orange-600', bg: 'bg-orange-50', bar: 'bg-orange-500' },
              { label: 'Critical Risk', count: riskCounts.critical || 0, color: 'text-red-600',    bg: 'bg-red-50',    bar: 'bg-red-500' },
            ].map(({ label, count, color, bg, bar }) => (
              <div key={label} className={`${bg} rounded-lg p-4 border border-gray-100`}>
                <p className="text-sm text-gray-600 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{count}</p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className={`${bar} h-1.5 rounded-full transition-all`}
                    style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {total > 0 ? `${Math.round((count / total) * 100)}%` : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* All 7 bias categories */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Average Bias Score by Category
          </h2>
          {total === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No analyses yet. Analyze some content to see metrics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BIAS_CATEGORIES.map(({ key, label, color, bg, border }) => {
                const avg = avgScores[key] || 0
                const pct = Math.round(avg * 100)
                const barColor = avg > 0.6 ? 'bg-red-500' : avg > 0.3 ? 'bg-yellow-500' : 'bg-green-500'
                return (
                  <div key={key} className={`${bg} rounded-lg p-4 border ${border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <span className={`text-xl font-bold ${color}`}>{avg.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {avg < 0.2 ? '✅ Low' : avg < 0.5 ? '⚠️ Moderate' : '🔴 High'} · avg across {total} analyses
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Fairness score gauge */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Fairness Score Breakdown
          </h2>
          <div className="space-y-3">
            {BIAS_CATEGORIES.map(({ key, label }) => {
              const avg = avgScores[key] || 0
              const fairness = Math.round((1 - avg) * 100)
              const barColor = fairness >= 70 ? 'bg-green-500' : fairness >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{label} Fairness</span>
                    <span className="font-semibold text-gray-900">{fairness}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${fairness}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

export default FairnessMetrics
