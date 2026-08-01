import { getSeverityColor } from '../utils/textHighlighter'

/**
 * BiasDisplay — renders a list of detected bias spans.
 *
 * Accepts the normalised `highlighted_text` array from analysisStorage,
 * where each item has: { text, bias_type, severity, suggestion }.
 *
 * Also accepts the legacy `biases` prop shape for backward compatibility.
 */
function BiasDisplay({ biases, spans }) {
  // Support both prop shapes
  const items = spans || biases || []

  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Bias Detection</h2>
        <p className="text-gray-500">No biases detected</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Detected Biases</h2>
      <div className="space-y-4">
        {items.map((item, index) => {
          // Normalise field names — backend uses bias_type, legacy used type
          const biasType = item.bias_type || item.type || 'unknown'
          const displayText = item.text || ''
          const explanation = item.suggestion || item.explanation || ''
          const severity = item.severity || 'medium'

          return (
            <div key={index} className="border-l-4 border-yellow-500 pl-4 py-2">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(severity)}`}>
                  {severity}
                </span>
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {biasType.replace(/_/g, ' ')}
                </span>
              </div>
              {displayText && (
                <p className="text-gray-600 text-sm mb-1">"{displayText}"</p>
              )}
              {explanation && (
                <p className="text-gray-500 text-xs">
                  {item.suggestion ? `Suggestion: ${explanation}` : explanation}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BiasDisplay
