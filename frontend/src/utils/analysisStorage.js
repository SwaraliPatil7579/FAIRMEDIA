/**
 * Analysis Storage Utility
 * Manages analysis data in localStorage
 */

const STORAGE_KEY = 'fairmedia_analyses'

export const saveAnalysis = (analysis) => {
  const analyses = getAnalyses()
  const newAnalysis = {
    id: analysis.analysis_id,
    timestamp: analysis.timestamp || new Date().toISOString(),
    content: analysis.content || '',
    bias_score: analysis.bias_detection?.bias_scores?.overall || 0,
    language: analysis.bias_detection?.language_detected || 'en',
    bias_type: getBiasType(analysis.bias_detection?.bias_scores, analysis.bias_detection?.highlighted_text),
    mitigated: false,
    reviewed: false,
    risk_level: analysis.fairness_metrics?.risk_level || 'low',
    highlighted_text: analysis.bias_detection?.highlighted_text || [],
    recommendations: analysis.fairness_metrics?.recommendations || [],
    bias_detection: analysis.bias_detection || null   // ← full object saved for HumanReview
  }

  analyses.push(newAnalysis)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses))
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
  const analyses = getAnalyses()
  return analyses.find(a => a.id === id)
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
  const analyses = getAnalyses()
  const filtered = analyses.filter(a => a.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export const clearAllAnalyses = () => {
  localStorage.removeItem(STORAGE_KEY)
}

export const getStats = () => {
  const analyses = getAnalyses()
  return {
    total: analyses.length,
    biasDetected: analyses.filter(a => a.bias_score > 0.4).length,
    mitigated: analyses.filter(a => a.mitigated).length,
    pendingReviews: analyses.filter(a => !a.reviewed && a.bias_score > 0.4).length,
    byLanguage: analyses.reduce((acc, a) => {
      acc[a.language] = (acc[a.language] || 0) + 1
      return acc
    }, {}),
    byBiasType: analyses.reduce((acc, a) => {
      acc[a.bias_type] = (acc[a.bias_type] || 0) + 1
      return acc
    }, {})
  }
}

export const exportToCSV = (analyses = null) => {
  const data = analyses || getAnalyses()

  const headers = ['ID', 'Timestamp', 'Language', 'Bias Score', 'Bias Type', 'Risk Level', 'Mitigated', 'Reviewed']
  const rows = data.map(a => [
    a.id,
    new Date(a.timestamp).toLocaleString(),
    a.language.toUpperCase(),
    (a.bias_score ?? 0).toFixed(2),
    a.bias_type,
    a.risk_level,
    a.mitigated ? 'Yes' : 'No',
    a.reviewed ? 'Yes' : 'No'
  ])

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fairmedia-analyses-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export const exportToJSON = (analyses = null) => {
  const data = analyses || getAnalyses()
  const json = JSON.stringify(data, null, 2)

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fairmedia-analyses-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Determine the dominant bias type for a given analysis ──────────────────
// Priority: actual detected span types > score comparison > fallback
const getBiasType = (biasScores, highlightedSpans) => {
  if (!biasScores) return 'unknown'

  // Step 1: Count bias types from actual detected spans
  // This is the most accurate signal — what did the detector actually flag?
  if (highlightedSpans && highlightedSpans.length > 0) {
    const typeCounts = highlightedSpans.reduce((acc, span) => {
      const t = span.bias_type || 'unknown'
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
    const dominant = Object.entries(typeCounts).reduce((a, b) => a[1] > b[1] ? a : b)
    if (dominant[1] > 0) return dominant[0]
  }

  // Step 2: Fallback to scores — but only pick language_dominance if it's
  // genuinely much higher than the others (0.2 margin), since the mock
  // service tends to inflate it
  const g = biasScores.gender_bias || 0
  const s = biasScores.stereotype || 0
  const l = biasScores.language_dominance || 0

  if (g >= s && g >= l) return 'gender_bias'
  if (s >= g && s >= l) return 'stereotype'
  if (l > g + 0.2 && l > s + 0.2) return 'language_dominance'

  // Step 3: Final fallback — prefer gender_bias or stereotype over language_dominance
  if (g > 0 || s > 0) return g >= s ? 'gender_bias' : 'stereotype'
  return 'language_dominance'
}