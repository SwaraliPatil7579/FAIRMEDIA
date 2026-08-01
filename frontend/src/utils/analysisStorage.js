/**
 * Analysis Storage Utility
 * Manages analysis data in localStorage
 */

const STORAGE_KEY = 'fairmedia_analyses'

// ── Normalise highlighted_text spans from backend format → {start,end} ──────
// Backend returns: { span: [start, end], text, bias_type, severity, suggestion }
// HumanReview needs: { start, end, text, bias_type, severity, suggestion }
const normaliseSpans = (spans) => {
  if (!spans || !Array.isArray(spans)) return []
  return spans.map(s => ({
    start:      s.start      ?? s.span?.[0] ?? 0,
    end:        s.end        ?? s.span?.[1] ?? 0,
    text:       s.text       || '',
    bias_type:  s.bias_type  || 'gender_bias',
    severity:   s.severity   || 'medium',
    suggestion: s.suggestion || null,
  })).filter(s => s.text && s.end > s.start)
}

export const saveAnalysis = (analysis) => {
  const analyses = getAnalyses()

  const rawSpans = analysis.bias_detection?.highlighted_text || []
  const normalisedSpans = normaliseSpans(rawSpans)

  const newAnalysis = {
    id:               analysis.analysis_id || ('local-' + Date.now()),
    timestamp:        analysis.timestamp   || new Date().toISOString(),
    content:          analysis.content     || '',
    bias_score:       analysis.bias_detection?.bias_scores?.overall || 0,
    language:         analysis.bias_detection?.language_detected    || 'en',
    bias_type:        getBiasType(
                        analysis.bias_detection?.bias_scores,
                        normalisedSpans
                      ),
    mitigated:        false,
    reviewed:         false,
    risk_level:       analysis.fairness_metrics?.risk_level         || 'low',
    highlighted_text: normalisedSpans,
    recommendations:  analysis.fairness_metrics?.recommendations    || [],
    // Full bias_detection object for HumanReview detail panel
    bias_detection: analysis.bias_detection
      ? {
          ...analysis.bias_detection,
          highlighted_text: normalisedSpans,   // use normalised spans
        }
      : null,
  }

  // Guard against undefined id
  if (!newAnalysis.id) {
    newAnalysis.id = 'local-' + Date.now()
  }

  // Avoid duplicate IDs
  const existing = analyses.findIndex(a => a.id === newAnalysis.id)
  if (existing !== -1) {
    analyses[existing] = newAnalysis
  } else {
    analyses.push(newAnalysis)
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses))
  } catch (err) {
    // localStorage quota exceeded — remove the oldest entry and retry once
    console.warn('localStorage quota exceeded, pruning oldest entry:', err)
    if (analyses.length > 1) {
      analyses.shift()
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses))
      } catch (retryErr) {
        console.error('Failed to save analysis even after pruning:', retryErr)
      }
    }
  }
  return newAnalysis
}

export const getAnalyses = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error loading analyses:', error)
    return []
  }
}

export const getAnalysisById = (id) => {
  return getAnalyses().find(a => a.id === id) || null
}

export const updateAnalysis = (id, updates) => {
  const analyses = getAnalyses()
  const index = analyses.findIndex(a => a.id === id)
  if (index !== -1) {
    analyses[index] = { ...analyses[index], ...updates }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses))
    return analyses[index]
  }
  return null
}

export const deleteAnalysis = (id) => {
  const filtered = getAnalyses().filter(a => a.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export const clearAllAnalyses = () => {
  localStorage.removeItem(STORAGE_KEY)
}

export const getStats = () => {
  const analyses = getAnalyses()
  return {
    total:          analyses.length,
    biasDetected:   analyses.filter(a => a.bias_score > 0.4).length,
    mitigated:      analyses.filter(a => a.mitigated).length,
    pendingReviews: analyses.filter(a => !a.reviewed && a.bias_score > 0.4).length,
    byLanguage: analyses.reduce((acc, a) => {
      acc[a.language] = (acc[a.language] || 0) + 1
      return acc
    }, {}),
    byBiasType: analyses.reduce((acc, a) => {
      acc[a.bias_type] = (acc[a.bias_type] || 0) + 1
      return acc
    }, {}),
  }
}

export const exportToCSV = (analyses = null) => {
  const data = analyses || getAnalyses()

  // Escape a CSV field: wrap in quotes if it contains comma, quote, or newline
  const escapeField = (val) => {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }

  const headers = ['ID', 'Timestamp', 'Language', 'Bias Score', 'Bias Type', 'Risk Level', 'Mitigated', 'Reviewed']
  const rows = data.map(a => [
    a.id,
    new Date(a.timestamp).toLocaleString(),
    (a.language || 'en').toUpperCase(),
    (a.bias_score ?? 0).toFixed(2),
    a.bias_type || 'unknown',
    a.risk_level || 'low',
    a.mitigated ? 'Yes' : 'No',
    a.reviewed  ? 'Yes' : 'No',
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(escapeField).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `fairmedia-analyses-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export const exportToJSON = (analyses = null) => {
  const data = analyses || getAnalyses()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `fairmedia-analyses-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Determine the dominant bias type ─────────────────────────────────────────
const getBiasType = (biasScores, normalisedSpans) => {
  if (!biasScores) return 'unknown'

  // Priority 1: most frequent span type
  if (normalisedSpans && normalisedSpans.length > 0) {
    const counts = normalisedSpans.reduce((acc, s) => {
      const t = s.bias_type || 'unknown'
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (dominant && dominant[1] > 0) return dominant[0]
  }

  // Priority 2: highest score (excluding language_dominance unless clearly dominant)
  const scores = {
    gender_bias:        biasScores.gender_bias        || 0,
    stereotype:         biasScores.stereotype         || 0,
    age_bias:           biasScores.age_bias           || 0,
    disability_bias:    biasScores.disability_bias    || 0,
    religious_bias:     biasScores.religious_bias     || 0,
    socioeconomic_bias: biasScores.socioeconomic_bias || 0,
    language_dominance: biasScores.language_dominance || 0,
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const top = sorted[0]

  // If all scores are zero, return 'unknown' — not 'language_dominance'
  if (!top || top[1] === 0) return 'unknown'

  // Don't pick language_dominance unless it's clearly higher than everything else
  if (top[0] === 'language_dominance') {
    const second = sorted[1]
    if (second && second[1] > top[1] - 0.15) return second[0]
  }

  return top[0]
}
