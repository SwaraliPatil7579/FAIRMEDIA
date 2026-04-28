import { getAnalyses, exportToCSV, exportToJSON } from '../utils/analysisStorage'
import {
  FileText,
  Download,
  Share2,
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react'

function AuditReports() {
  const analyses = getAnalyses()

  const total = analyses.length
  const highBias = analyses.filter((a) => a.bias_score > 0.7).length
  const mitigated = analyses.filter((a) => a.mitigated).length
  const avgBias =
    total > 0
      ? analyses.reduce((sum, a) => sum + a.bias_score, 0) / total
      : 0

  const fairnessMetrics = [
    {
      name: 'High Bias Rate',
      description: 'Articles with bias score > 0.7',
      value: total ? highBias / total : 0,
      displayValue: total ? `${highBias} / ${total}` : '—',
      target: 0.2,
      // Lower is better for high bias rate
      status: total === 0 ? 'no-data' : (highBias / total <= 0.2 ? 'good' : 'warning'),
      lowerIsBetter: true,
    },
    {
      name: 'Mitigation Rate',
      description: 'Articles that have been mitigated',
      value: total ? mitigated / total : 0,
      displayValue: total ? `${mitigated} / ${total}` : '—',
      target: 0.7,
      status: total === 0 ? 'no-data' : (mitigated / total >= 0.7 ? 'excellent' : 'warning'),
      lowerIsBetter: false,
    },
    {
      name: 'Average Bias Score',
      description: 'Mean bias score across all analyses',
      value: avgBias,
      displayValue: total ? avgBias.toFixed(2) : '—',
      target: 0.4,
      status: total === 0 ? 'no-data' : (avgBias <= 0.4 ? 'good' : 'warning'),
      lowerIsBetter: true,
    },
  ]

  const getStatusColor = (status) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800',
      good:      'bg-blue-100 text-blue-800',
      warning:   'bg-yellow-100 text-yellow-800',
      poor:      'bg-red-100 text-red-800',
      'no-data': 'bg-gray-100 text-gray-500',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // Progress bar: for "lower is better" metrics, full bar = at/below target (good)
  const getBarWidth = (metric) => {
    if (metric.status === 'no-data' || metric.target === 0) return 0
    if (metric.lowerIsBetter) {
      // 100% bar when value = 0, 0% bar when value >= target*2
      return Math.max(0, Math.min(100, (1 - metric.value / (metric.target * 2)) * 100))
    }
    return Math.min(100, (metric.value / metric.target) * 100)
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Reports</h1>
            <p className="text-gray-600 mt-1">Fairness metrics and compliance reports</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportToCSV(analyses)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => exportToJSON(analyses)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export JSON
            </button>
            <button
              onClick={() => {
                if (analyses.length === 0) {
                  alert('No analyses to share.')
                  return
                }
                const payload = {
                  analyses,
                  summary: {
                    total,
                    highBias,
                    mitigated,
                    avgBias: Number(avgBias.toFixed(2)),
                  },
                }
                navigator.clipboard
                  .writeText(JSON.stringify(payload, null, 2))
                  .then(() => alert('Audit summary copied to clipboard.'))
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              API Share
            </button>
          </div>
        </div>

        {/* Fairness Metrics */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">Fairness Metrics (AIF360)</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {fairnessMetrics.map((metric, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900 text-sm">{metric.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(metric.status)}`}>
                    {metric.status === 'no-data' ? 'no data' : metric.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{metric.description}</p>
                <div className="flex items-end gap-4 mb-3">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{metric.displayValue}</p>
                    <p className="text-xs text-gray-500">Current</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-gray-500">{metric.target.toFixed(1)}</p>
                    <p className="text-xs text-gray-400">Target {metric.lowerIsBetter ? '≤' : '≥'}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      metric.status === 'excellent' ? 'bg-green-500' :
                      metric.status === 'good'      ? 'bg-blue-500' :
                      metric.status === 'warning'   ? 'bg-yellow-500' :
                      metric.status === 'no-data'   ? 'bg-gray-300' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${getBarWidth(metric)}%` }}
                  />
                </div>
                {metric.status === 'no-data' && (
                  <p className="text-xs text-gray-400 mt-1">Analyze some content to see this metric</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Report Summary (live from current analyses) */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-3d card-shimmer group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">Total Analyses</h3>
            </div>
            <p className="text-4xl font-bold text-gray-900 group-hover:scale-110 transition-transform">{total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-3d card-shimmer group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-50 to-red-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                <AlertCircle className="w-5 h-5 text-red-600 group-hover:animate-pulse" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">High Bias Articles</h3>
            </div>
            <p className="text-4xl font-bold text-red-600 group-hover:scale-110 transition-transform">{highBias}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-3d card-shimmer group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                <CheckCircle className="w-5 h-5 text-green-600 group-hover:animate-spin" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">Mitigated Articles</h3>
            </div>
            <p className="text-4xl font-bold text-green-600 group-hover:scale-110 transition-transform">{mitigated}</p>
          </div>
        </div>

        {/* Detailed Report */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4">Detailed Audit Log</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Language</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Bias Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Risk Level</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analyses.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(a.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm uppercase">{a.language}</td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {a.bias_score.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">{a.risk_level}</td>
                    <td className="px-4 py-3 text-sm">
                      {a.reviewed
                        ? 'Reviewed'
                        : a.mitigated
                        ? 'Mitigated'
                        : 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuditReports
