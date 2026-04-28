import { getSeverityColor } from '../utils/textHighlighter'

function BiasDisplay({ biases }) {
  if (!biases || biases.length === 0) {
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
        {biases.map((bias, index) => (
          <div key={index} className="border-l-4 border-yellow-500 pl-4 py-2">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(bias.severity)}`}>
                {bias.severity}
              </span>
              <span className="text-sm font-medium text-gray-700">{bias.type}</span>
            </div>
            <p className="text-gray-600 text-sm mb-1">"{bias.text}"</p>
            <p className="text-gray-500 text-xs">{bias.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BiasDisplay
