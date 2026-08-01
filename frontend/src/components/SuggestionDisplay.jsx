/**
 * SuggestionDisplay — renders improvement suggestions.
 *
 * Handles two shapes:
 *   1. Backend shape: suggestions is List[str]  (plain strings)
 *   2. Legacy shape:  suggestions is Array<{ title, description, example }>
 */
function SuggestionDisplay({ suggestions }) {
  if (!suggestions || suggestions.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Suggestions for Improvement</h2>
      <div className="space-y-4">
        {suggestions.map((suggestion, index) => {
          // Plain string (backend List[str])
          if (typeof suggestion === 'string') {
            return (
              <div key={index} className="p-4 bg-blue-50 rounded-lg flex items-start gap-3">
                <span className="text-blue-500 mt-0.5 text-lg leading-none">•</span>
                <p className="text-gray-700 text-sm">{suggestion}</p>
              </div>
            )
          }

          // Object shape (legacy { title, description, example })
          return (
            <div key={index} className="p-4 bg-blue-50 rounded-lg">
              {suggestion.title && (
                <h3 className="font-medium text-gray-800 mb-2">{suggestion.title}</h3>
              )}
              {suggestion.description && (
                <p className="text-gray-600 text-sm mb-2">{suggestion.description}</p>
              )}
              {suggestion.example && (
                <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                  <p className="text-xs text-gray-500 mb-1">Suggested alternative:</p>
                  <p className="text-sm text-gray-700">{suggestion.example}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SuggestionDisplay
