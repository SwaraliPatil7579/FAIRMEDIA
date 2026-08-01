/**
 * Build an array of text parts with highlight metadata.
 * Returns plain React-renderable parts — no dangerouslySetInnerHTML needed.
 *
 * @param {string} text - Original text
 * @param {Array<{text:string, start:number, end:number, severity:string, bias_type:string}>} spans
 * @returns {Array<{text:string, highlighted:boolean, severity?:string, biasType?:string}>}
 */
export const buildHighlightParts = (text, spans) => {
  if (!text) return []
  if (!spans || spans.length === 0) return [{ text, highlighted: false }]

  const sorted = [...spans]
    .filter(s => s.start >= 0 && s.end > s.start && s.end <= text.length)
    .sort((a, b) => a.start - b.start)

  const parts = []
  let cursor = 0
  for (const span of sorted) {
    if (span.start > cursor) {
      parts.push({ text: text.slice(cursor, span.start), highlighted: false })
    }
    parts.push({
      text: text.slice(span.start, span.end),
      highlighted: true,
      severity: span.severity || 'medium',
      biasType: span.bias_type || 'gender_bias',
      suggestion: span.suggestion || null,
    })
    cursor = span.end
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), highlighted: false })
  }
  return parts
}

/**
 * Returns a Tailwind class string for a severity level badge.
 * Handles all four levels: low / medium / high / critical.
 */
export const getSeverityColor = (severity) => {
  const colors = {
    low:      'bg-yellow-100 text-yellow-800',
    medium:   'bg-orange-100 text-orange-800',
    high:     'bg-red-100 text-red-800',
    critical: 'bg-red-200 text-red-900',
  }
  return colors[severity] || colors.medium
}
