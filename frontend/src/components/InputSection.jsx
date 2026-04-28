import { useState } from 'react'

function InputSection({ onAnalyze, isLoading }) {
  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (text.trim()) {
      onAnalyze(text)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Input Text for Analysis</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter text to analyze for bias and fairness..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          disabled={isLoading || !text.trim()}
        >
          {isLoading ? 'Analyzing...' : 'Analyze Text'}
        </button>
      </form>
    </div>
  )
}

export default InputSection
