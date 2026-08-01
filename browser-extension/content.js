// FAIRMEDIA Content Script — highlights biased text on any webpage

const STYLE_ID = 'fairmedia-styles'

// Listen for messages from popup / background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'highlightBias') {
    injectStyles()
    highlightBiasOnPage(request.highlights || [])
    sendResponse({ success: true, count: (request.highlights || []).length })
  } else if (request.action === 'clearHighlights') {
    clearHighlights()
    sendResponse({ success: true })
  }
  return true // keep channel open for async
})

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .fm-highlight {
      background-color: #fef3c7 !important;
      border-bottom: 2px solid #f59e0b !important;
      border-radius: 2px !important;
      cursor: help !important;
      position: relative !important;
    }
    .fm-highlight-high {
      background-color: #fee2e2 !important;
      border-bottom-color: #ef4444 !important;
    }
    .fm-highlight-low {
      background-color: #f0fdf4 !important;
      border-bottom-color: #22c55e !important;
    }
    .fm-tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 4px);
      left: 0;
      background: #1f2937;
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      pointer-events: none;
      max-width: 280px;
      white-space: normal;
      line-height: 1.4;
    }
    .fm-highlight:hover .fm-tooltip { display: block; }
  `
  document.head.appendChild(style)
}

function highlightBiasOnPage(highlights) {
  if (!highlights || highlights.length === 0) return

  highlights.forEach(highlight => {
    if (!highlight.text || highlight.text.length < 2) return
    const severityClass = highlight.severity === 'high'
      ? 'fm-highlight-high'
      : highlight.severity === 'low'
        ? 'fm-highlight-low'
        : ''
    const tooltipText = [
      highlight.bias_type?.replace(/_/g, ' ') || 'bias',
      highlight.severity ? `(${highlight.severity})` : '',
      highlight.suggestion ? `→ "${highlight.suggestion}"` : '',
    ].filter(Boolean).join(' ')

    highlightTextNode(highlight.text, tooltipText, severityClass)
  })
}

function highlightTextNode(searchText, tooltipText, extraClass) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip script, style, already-highlighted nodes
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        const tag = parent.tagName?.toLowerCase()
        if (['script', 'style', 'noscript', 'textarea'].includes(tag)) {
          return NodeFilter.FILTER_REJECT
        }
        if (parent.classList?.contains('fm-highlight')) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      },
    }
  )

  const nodesToProcess = []
  let node
  while ((node = walker.nextNode())) {
    const idx = node.textContent.toLowerCase().indexOf(searchText.toLowerCase())
    if (idx !== -1) {
      nodesToProcess.push({ node, idx })
    }
  }

  // Process in reverse to avoid index shifting
  nodesToProcess.reverse().forEach(({ node, idx }) => {
    try {
      const before = node.textContent.slice(0, idx)
      const matched = node.textContent.slice(idx, idx + searchText.length)
      const after = node.textContent.slice(idx + searchText.length)

      const span = document.createElement('span')
      span.className = ['fm-highlight', extraClass].filter(Boolean).join(' ')

      const tooltip = document.createElement('span')
      tooltip.className = 'fm-tooltip'
      tooltip.textContent = tooltipText

      span.appendChild(document.createTextNode(matched))
      span.appendChild(tooltip)

      const parent = node.parentNode
      if (before) parent.insertBefore(document.createTextNode(before), node)
      parent.insertBefore(span, node)
      if (after) parent.insertBefore(document.createTextNode(after), node)
      parent.removeChild(node)
    } catch (e) {
      // Skip nodes that can't be modified
    }
  })
}

function clearHighlights() {
  document.querySelectorAll('.fm-highlight').forEach(el => {
    // Remove tooltip child, keep text
    const text = el.childNodes[0]?.textContent || el.textContent
    el.replaceWith(document.createTextNode(text))
  })
  const style = document.getElementById(STYLE_ID)
  if (style) style.remove()
}
