function SuggestionDisplay({ suggestions }) {
  if (!suggestions || suggestions.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Suggestions for Improvement</h2>
      <div className="space-y-4">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">{suggestion.title}</h3>
            <p className="text-gray-600 text-sm mb-2">{suggestion.description}</p>
            {suggestion.example && (
              <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                <p className="text-xs text-gray-500 mb-1">Suggested alternative:</p>
                <p className="text-sm text-gray-700">{suggestion.example}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SuggestionDisplay
