function FairnessDisplay({ metrics }) {
  if (!metrics) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Fairness Metrics</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Overall Score</p>
          <p className="text-3xl font-bold text-blue-600">{metrics.overallScore}/100</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600">Fairness Level</p>
          <p className="text-3xl font-bold text-green-600">{metrics.fairnessLevel}</p>
        </div>
      </div>
      {metrics.details && (
        <div className="mt-4 space-y-2">
          {Object.entries(metrics.details).map(([key, value]) => (
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
