const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001'

// ── Analyze text for bias ─────────────────────────────────────────────────
export const analyzeText = async (text, options = {}) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: text, ...options }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `API error: ${response.status}`)
  }
  return response.json()
}

// ── Get a stored analysis by ID ───────────────────────────────────────────
export const getAnalysis = async (analysisId) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/analyze/${analysisId}`)
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `API error: ${response.status}`)
  }
  return response.json()
}

// ── Fetch URL content (server-side proxy) ────────────────────────────────
export const fetchUrl = async (url) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/fetch-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `API error: ${response.status}`)
  }
  return response.json()
}

// ── Start a batch analysis job ────────────────────────────────────────────
export const startBatchAnalysis = async (items, batchName = '') => {
  const response = await fetch(`${API_BASE_URL}/api/v1/batch-analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, batch_name: batchName }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `API error: ${response.status}`)
  }
  return response.json()
}

// ── Poll batch job status ─────────────────────────────────────────────────
export const getBatchStatus = async (batchId) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/batch-analyze/${batchId}`)
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `API error: ${response.status}`)
  }
  return response.json()
}

// ── Health check ──────────────────────────────────────────────────────────
export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`)
    if (!response.ok) return { healthy: false }
    const data = await response.json()
    return { healthy: true, ...data }
  } catch {
    return { healthy: false }
  }
}

// Legacy alias kept for backward compatibility
export const getFairnessMetrics = getAnalysis
