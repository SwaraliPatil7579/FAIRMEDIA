function ReviewSection({ originalText, spans = [] }) {
  if (!originalText) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Text Review</h2>
        <p className="text-gray-500">No text to review</p>
      </div>
    )
  }

  // Build highlighted parts safely (no dangerouslySetInnerHTML)
  const parts = []
  if (!spans || spans.length === 0) {
    parts.push({ text: originalText, highlighted: false })
  } else {
    const sorted = [...spans]
      .filter(s => s.start >= 0 && s.end > s.start && s.end <= originalText.length)
      .sort((a, b) => a.start - b.start)

    let cursor = 0
    for (const span of sorted) {
      if (span.start > cursor) {
        parts.push({ text: originalText.slice(cursor, span.start), highlighted: false })
      }
      parts.push({
        text: originalText.slice(span.start, span.end),
        highlighted: true,
        biasType: span.bias_type || 'gender_bias',
        suggestion: span.suggestion || null,
      })
      cursor = span.end
    }
    if (cursor < originalText.length) {
      parts.push({ text: originalText.slice(cursor), highlighted: false })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Text Review</h2>
      <div className="p-4 bg-gray-50 rounded-lg leading-relaxed text-sm text-gray-700">
        {parts.map((part, idx) =>
          part.highlighted ? (
            <span
              key={idx}
              className="bg-yellow-200 border-b-2 border-yellow-500 cursor-help rounded px-0.5"
              title={part.suggestion ? `Suggest: ${part.suggestion}` : part.biasType?.replace(/_/g, ' ')}
            >
              {part.text}
            </span>
          ) : (
            <span key={idx}>{part.text}</span>
          )
        )}
      </div>
    </div>
  )
}

export default ReviewSection
