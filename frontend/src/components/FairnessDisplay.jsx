/**
 * FairnessDisplay — renders overall fairness score and detail breakdown.
 *
 * Accepts the `fairness_metrics` object from the backend/storage, which has:
 *   { fairness_score: 0–1, risk_level: string, recommendations: string[] }
 *
 * Also accepts a legacy `metrics` prop with { overallScore, fairnessLevel }
 * for backward compatibility.
 */
function FairnessDisplay({ metrics, fairnessMetrics }) {
  const data = fairnessMetrics || metrics

  if (!data) {
    return null
  }

  // Normalise field names — backend uses fairness_score (0–1), legacy used overallScore (0–100)
  const rawScore = data.fairness_score ?? data.overallScore
  const overallScore = rawScore !== undefined
    ? (rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore))
    : null

  const fairnessLevel = data.risk_level
    ? data.risk_level.charAt(0).toUpperCase() + data.risk_level.slice(1)
    : data.fairnessLevel || '—'

  const recommendations = data.recommendations || []

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Fairness Metrics</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Overall Score</p>
          <p className="text-3xl font-bold text-blue-600">
            {overallScore !== null ? `${overallScore}/100` : '—'}
          </p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600">Risk Level</p>
          <p className="text-3xl font-bold text-green-600">{fairnessLevel}</p>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Recommendations</p>
          <ul className="space-y-1">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.details && (
        <div className="mt-4 space-y-2">
          {Object.entries(data.details).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FairnessDisplay
