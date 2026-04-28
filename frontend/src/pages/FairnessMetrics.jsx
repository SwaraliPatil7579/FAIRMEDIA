import { getAnalyses } from '../utils/analysisStorage'

function FairnessMetrics() {
  const analyses = getAnalyses()
  const total = analyses.length

  const riskCounts = analyses.reduce(
    (acc, a) => {
      const level = (a.risk_level || 'low').toLowerCase()
      acc[level] = (acc[level] || 0) + 1
      return acc
    },
    { low: 0, medium: 0, high: 0, critical: 0 }
  )

  const avgScores =
    total > 0
      ? analyses.reduce(
          (acc, a) => {
            acc.gender_bias += a.bias_detection?.bias_scores?.gender_bias || 0
            acc.stereotype += a.bias_detection?.bias_scores?.stereotype || 0
            acc.language_dominance += a.bias_detection?.bias_scores?.language_dominance || 0
            return acc
          },
          { gender_bias: 0, stereotype: 0, language_dominance: 0 }
        )
      : { gender_bias: 0, stereotype: 0, language_dominance: 0 }

  const divisor = total || 1

  const overallFairness =
    total > 0
      ? 100 - (analyses.reduce((sum, a) => sum + (a.bias_score || 0), 0) / total) * 100
      : 100

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Fairness Metrics</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Overall Fairness Score</h2>
            <div className="flex items-center justify-center">
              <div className="text-6xl font-bold text-green-600">
                {overallFairness.toFixed(1)}
              </div>
            </div>
            <p className="text-center text-gray-600 mt-4">
              Based on average bias score across all analyses
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Risk Distribution</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Low Risk</span>
                <span className="font-semibold text-green-600">{riskCounts.low}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Medium Risk</span>
                <span className="font-semibold text-yellow-600">{riskCounts.medium}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">High Risk</span>
                <span className="font-semibold text-orange-600">{riskCounts.high}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Critical Risk</span>
                <span className="font-semibold text-red-600">{riskCounts.critical}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Bias Type Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">Gender Bias</h3>
              <p className="text-3xl font-bold text-blue-600">
                {(avgScores.gender_bias / divisor).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Average score</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">Stereotype</h3>
              <p className="text-3xl font-bold text-purple-600">
                {(avgScores.stereotype / divisor).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Average score</p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">Language Dominance</h3>
              <p className="text-3xl font-bold text-indigo-600">
                {(avgScores.language_dominance / divisor).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Average score</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FairnessMetrics
