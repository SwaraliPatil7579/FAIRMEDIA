// FAIRMEDIA Background Service Worker
// Handles context menu "Analyze for Bias" on selected text

const DEFAULT_API = 'https://fairmedia.onrender.com'

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'analyzeBias',
    title: 'Analyze for Bias (FAIRMEDIA)',
    contexts: ['selection'],
  })
})

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyzeBias' && info.selectionText) {
    analyzeSelectedText(info.selectionText, tab)
  }
})

async function analyzeSelectedText(text, tab) {
  // Get saved API URL
  const stored = await chrome.storage.local.get(['apiUrl'])
  const apiBase = stored.apiUrl || DEFAULT_API

  try {
    const response = await fetch(`${apiBase}/api/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: text.slice(0, 5000),
        language: 'en',
        metadata: { source: 'context-menu', url: tab?.url },
      }),
    })

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const score = data.bias_detection?.bias_scores?.overall || 0
    const risk = data.fairness_metrics?.risk_level || getRiskLevel(score)
    const highlights = data.bias_detection?.highlighted_text || []

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'FAIRMEDIA Bias Analysis',
      message: `Score: ${score.toFixed(2)} · Risk: ${risk.toUpperCase()}\n${highlights.length} issue(s) found. Click to view.`,
      priority: 2,
    })

    // Cache result for popup
    chrome.storage.local.set({ lastAnalysis: data })

    // Highlight on page if there are issues
    if (highlights.length > 0 && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'highlightBias', highlights }).catch(() => {})
    }

  } catch (error) {
    console.error('FAIRMEDIA analysis failed:', error)
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'FAIRMEDIA Error',
      message: `Analysis failed: ${error.message}`,
      priority: 1,
    })
  }
}

// Open popup when notification is clicked
chrome.notifications.onClicked.addListener(() => {
  chrome.action.openPopup().catch(() => {})
})

function getRiskLevel(score) {
  if (score < 0.25) return 'low'
  if (score < 0.5)  return 'medium'
  if (score < 0.75) return 'high'
  return 'critical'
}
