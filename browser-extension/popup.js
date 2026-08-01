// FAIRMEDIA Browser Extension — Popup Script
// Supports configurable API URL, all 7 bias categories, live highlighting

const DEFAULT_API = 'https://fairmedia.onrender.com'

// ── DOM refs ──────────────────────────────────────────────────────────────
const $loading        = document.getElementById('loading')
const $error          = document.getElementById('error')
const $results        = document.getElementById('results')
const $initial        = document.getElementById('initial')
const $analyzeBtn     = document.getElementById('analyzeBtn')
const $initialBtn     = document.getElementById('initialAnalyzeBtn')
const $viewFullBtn    = document.getElementById('viewFullBtn')
const $scoreBars      = document.getElementById('scoreBars')
const $issuesList     = document.getElementById('issuesList')
const $overallScore   = document.getElementById('overallScore')
const $riskBadge      = document.getElementById('riskBadge')
const $modelLabel     = document.getElementById('modelLabel')
const $apiUrlInput    = document.getElementById('apiUrlInput')
const $saveApiBtn     = document.getElementById('saveApiBtn')

let currentAnalysisId = null
let apiBase = DEFAULT_API

// ── Score bar config ──────────────────────────────────────────────────────
const SCORE_KEYS = [
  { key: 'gender_bias',       label: 'Gender Bias' },
  { key: 'stereotype',        label: 'Stereotype' },
  { key: 'age_bias',          label: 'Age Bias' },
  { key: 'disability_bias',   label: 'Disability Bias' },
  { key: 'religious_bias',    label: 'Religious Bias' },
  { key: 'socioeconomic_bias',label: 'Socioeconomic' },
  { key: 'language_dominance',label: 'Language Dominance' },
]

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Load saved API URL
  chrome.storage.local.get(['apiUrl', 'lastAnalysis'], (stored) => {
    apiBase = stored.apiUrl || DEFAULT_API
    $apiUrlInput.value = apiBase

    if (stored.lastAnalysis) {
      displayResults(stored.lastAnalysis)
    }
  })

  $saveApiBtn.addEventListener('click', () => {
    const url = $apiUrlInput.value.trim().replace(/\/$/, '')
    if (url) {
      apiBase = url
      chrome.storage.local.set({ apiUrl: url })
      $saveApiBtn.textContent = '✓'
      setTimeout(() => { $saveApiBtn.textContent = 'Save' }, 1500)
    }
  })

  $analyzeBtn.addEventListener('click', analyzePage)
  $initialBtn.addEventListener('click', analyzePage)
  $viewFullBtn.addEventListener('click', openFullReport)
})

// ── Analyze current page ──────────────────────────────────────────────────
async function analyzePage() {
  try {
    showLoading()

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    // Extract text from page
    const [{ result: pageText }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const body = document.body
        return (body.innerText || body.textContent || '').trim()
      },
    })

    if (!pageText || pageText.trim().length < 20) {
      throw new Error('Not enough text content found on this page')
    }

    const response = await fetch(`${apiBase}/api/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: pageText.slice(0, 5000),
        language: 'en',
        metadata: {
          source: 'browser-extension',
          url: tab.url,
          title: tab.title,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `API error: ${response.status}`)
    }

    const data = await response.json()
    currentAnalysisId = data.analysis_id

    // Cache results
    chrome.storage.local.set({ lastAnalysis: data })

    // Send highlights to content script
    const highlights = data.bias_detection?.highlighted_text || []
    if (highlights.length > 0) {
      chrome.tabs.sendMessage(tab.id, { action: 'highlightBias', highlights })
    }

    displayResults(data)

  } catch (err) {
    showError(err.message)
  }
}

// ── Display results ───────────────────────────────────────────────────────
function displayResults(data) {
  $initial.style.display  = 'none'
  $loading.style.display  = 'none'
  $error.style.display    = 'none'
  $results.style.display  = 'block'

  const scores = data.bias_detection?.bias_scores || {}
  const overall = scores.overall || 0

  // Overall score
  $overallScore.textContent = overall.toFixed(2)
  $overallScore.className = 'score-value ' + getScoreClass(overall)

  // Risk badge
  const risk = data.fairness_metrics?.risk_level || getRiskLevel(overall)
  $riskBadge.textContent = risk.toUpperCase()
  $riskBadge.className = `risk-badge risk-${risk}`

  // Model label
  const model = data.bias_detection?.model_version || ''
  $modelLabel.textContent = model ? `via ${model}` : ''

  // Score bars
  $scoreBars.innerHTML = SCORE_KEYS.map(({ key, label }) => {
    const val = scores[key] || 0
    const pct = Math.round(val * 100)
    const color = val > 0.6 ? '#dc2626' : val > 0.3 ? '#d97706' : '#16a34a'
    return `
      <div class="bar-row">
        <div class="bar-label">
          <span>${label}</span>
          <span>${val.toFixed(2)}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${color};"></div>
        </div>
      </div>`
  }).join('')

  // Issues list
  const highlights = data.bias_detection?.highlighted_text || []
  if (highlights.length > 0) {
    $issuesList.innerHTML = `
      <div class="issues-header">⚠️ Detected Issues (${highlights.length})</div>
      ${highlights.slice(0, 6).map(issue => `
        <div class="issue-item">
          <div class="issue-text">"${escHtml(issue.text)}"</div>
          <div class="issue-arrow">
            <span style="color:#6b7280;">${issue.bias_type?.replace(/_/g, ' ') || 'bias'} · ${issue.severity || 'medium'}</span>
          </div>
          ${issue.suggestion ? `<div class="issue-suggestion">→ ${escHtml(issue.suggestion)}</div>` : ''}
        </div>`).join('')}
      ${highlights.length > 6 ? `<div style="font-size:11px;color:#9ca3af;text-align:center;">+${highlights.length - 6} more issues</div>` : ''}
    `
  } else {
    $issuesList.innerHTML = `
      <div style="text-align:center;padding:10px 0;color:#16a34a;">
        <div style="font-size:20px;">✅</div>
        <div style="font-size:12px;margin-top:4px;">No bias detected</div>
      </div>`
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function showLoading() {
  $initial.style.display  = 'none'
  $results.style.display  = 'none'
  $error.style.display    = 'none'
  $loading.style.display  = 'block'
}

function showError(message) {
  $initial.style.display  = 'none'
  $results.style.display  = 'none'
  $loading.style.display  = 'none'
  $error.style.display    = 'block'
  $error.textContent = `❌ ${message}`
}

function getScoreClass(score) {
  if (score < 0.3) return 'score-low'
  if (score < 0.6) return 'score-medium'
  return 'score-high'
}

function getRiskLevel(score) {
  if (score < 0.25) return 'low'
  if (score < 0.5)  return 'medium'
  if (score < 0.75) return 'high'
  return 'critical'
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const FRONTEND_URL = 'https://fairmedia.vercel.app'

function openFullReport() {
  if (currentAnalysisId) {
    chrome.tabs.create({
      url: `${FRONTEND_URL}/?analysis=${currentAnalysisId}`,
    })
  }
}
