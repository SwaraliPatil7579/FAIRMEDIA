import { useState, useRef } from 'react'
import {
  Upload, Play, Download, AlertTriangle,
  Loader2, Trash2, Plus, BarChart3, X, ChevronDown, ChevronUp
} from 'lucide-react'
import { startBatchAnalysis, getBatchStatus } from '../api/api_client'

// ── Bias type colours ─────────────────────────────────────────
const BIAS_TYPE_COLORS = {
  gender_bias:        'bg-red-100 border-red-300 text-red-800',
  stereotype:         'bg-yellow-100 border-yellow-300 text-yellow-800',
  age_bias:           'bg-orange-100 border-orange-300 text-orange-800',
  disability_bias:    'bg-pink-100 border-pink-300 text-pink-800',
  religious_bias:     'bg-indigo-100 border-indigo-300 text-indigo-800',
  socioeconomic_bias: 'bg-teal-100 border-teal-300 text-teal-800',
  language_dominance: 'bg-purple-100 border-purple-300 text-purple-800',
}

// ── Normalise spans from backend {span:[s,e]} → {start,end} ──
function normaliseSpans(spans, text) {
  if (!spans || !text) return []
  const lower = text.toLowerCase()
  const claimed = new Uint8Array(text.length)
  return spans.map(s => {
    let start = s.span?.[0] ?? -1
    let end   = s.span?.[1] ?? -1
    const spanText = (s.text || '').trim()
    if (!(start >= 0 && end > start && end <= text.length && text.slice(start, end).toLowerCase() === spanText.toLowerCase())) {
      const lowerSpan = spanText.toLowerCase()
      let from = 0; start = -1
      while (from < lower.length) {
        const idx = lower.indexOf(lowerSpan, from)
        if (idx === -1) break
        if (!claimed.slice(idx, idx + spanText.length).some(v => v === 1)) { start = idx; end = idx + spanText.length; break }
        from = idx + 1
      }
      if (start === -1) return null
    }
    for (let i = start; i < end; i++) claimed[i] = 1
    return { ...s, start, end }
  }).filter(Boolean)
}

// ── Build highlighted parts for rendering ────────────────────
function buildParts(text, spans) {
  if (!text) return []
  if (!spans || spans.length === 0) return [{ text, hi: false }]
  const sorted = [...spans].sort((a, b) => a.start - b.start)
  const parts = []; let cursor = 0
  for (const s of sorted) {
    if (s.start > cursor) parts.push({ text: text.slice(cursor, s.start), hi: false })
    parts.push({ text: text.slice(s.start, s.end), hi: true, bias_type: s.bias_type, severity: s.severity, suggestion: s.suggestion })
    cursor = s.end
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hi: false })
  return parts
}

const SCORE_COLS = [
  { key: 'gender_bias',        label: 'Gender' },
  { key: 'stereotype',         label: 'Stereotype' },
  { key: 'age_bias',           label: 'Age' },
  { key: 'disability_bias',    label: 'Disability' },
  { key: 'religious_bias',     label: 'Religion' },
  { key: 'socioeconomic_bias', label: 'Socioeconomic' },
  { key: 'language_dominance', label: 'Language' },
]

function BatchAnalyzer() {
  const [items, setItems]           = useState([{ id: 1, content: '', language: 'en' }])
  const [batchName, setBatchName]   = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [batchId, setBatchId]       = useState(null)
  const [results, setResults]       = useState(null)
  const [progress, setProgress]     = useState({ processed: 0, completed: 0, failed: 0, total: 0 })
  const [error, setError]           = useState(null)
  const [expandedRow, setExpandedRow] = useState(null)
  const fileInputRef                = useRef(null)

  const addItem = () =>
    setItems(prev => [...prev, { id: Date.now(), content: '', language: 'en' }])

  const removeItem = (id) => {
    if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id))
  }

  const updateItem = (id, field, value) =>
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i
      const updated = { ...i, [field]: value }
      // Auto-detect Hindi when content changes
      if (field === 'content' && i.language === 'en') {
        if (/[\u0900-\u097F]/.test(value)) updated.language = 'hi'
      }
      return updated
    }))

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result || ''
      const lines = text
        .split('\n')
        .map(l => l
          // Strip common bullet/list prefixes: *, -, •, 1., 2., etc.
          .replace(/^[\s]*[*\-•\d]+[.)]\s*/, '')
          .replace(/^[\s]*[*\-•]\s*/, '')
          .trim()
        )
        .filter(l => l.length > 0)

      setItems(lines.map((line, idx) => ({
        id: Date.now() + idx,
        content: line,
        // Auto-detect Hindi/Devanagari script
        language: /[\u0900-\u097F]/.test(line) ? 'hi' : 'en',
      })))
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  const startBatchAnalysisHandler = async () => {
    const valid = items.filter(i => i.content.trim())
    if (valid.length === 0) { alert('Please add at least one item with content'); return }

    setIsProcessing(true)
    setResults(null)
    setError(null)
    setProgress({ processed: 0, completed: 0, failed: 0, total: valid.length })

    try {
      const data = await startBatchAnalysis(
        valid.map((item, idx) => ({
          content: item.content,
          language: item.language,
          item_id: `item_${idx + 1}`,
        })),
        batchName || `Batch ${new Date().toLocaleString()}`
      )
      setBatchId(data.batch_id)
      pollBatchStatus(data.batch_id)
    } catch (err) {
      setError(err.message)
      setIsProcessing(false)
    }
  }

  const pollBatchStatus = (id) => {
    let attempts = 0
    const MAX_ATTEMPTS = 120 // 6 minutes max (120 × 3s)

    const poll = async () => {
      attempts++
      if (attempts > MAX_ATTEMPTS) {
        setError('Batch timed out after 6 minutes. The server may be overloaded.')
        setIsProcessing(false)
        return
      }
      try {
        const data = await getBatchStatus(id)
        const processed = data.processed_items ?? data.completed_items ?? 0
        setProgress({
          processed,
          completed: data.completed_items ?? 0,
          failed: data.failed_items ?? 0,
          total: data.total_items,
        })
        if (data.status === 'completed' || data.status === 'failed') {
          setResults(data)
          setIsProcessing(false)
        } else {
          setTimeout(poll, 3000)
        }
      } catch (err) {
        console.error('Poll failed:', err)
        // Retry up to 3 times on network error before giving up
        if (attempts < 3) {
          setTimeout(poll, 3000)
        } else {
          setError(`Could not reach server: ${err.message}`)
          setIsProcessing(false)
        }
      }
    }
    poll()
  }

  const downloadCSV = () => {
    if (!results) return
    const escapeField = (val) => {
      const str = String(val ?? '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }
    const headers = ['Item ID', 'Status', 'Overall Bias', ...SCORE_COLS.map(c => c.label), 'Risk Level', 'Language', 'Issues']
    const rows = results.results.map(r => [
      r.item_id,
      r.status,
      (r.overall_bias || 0).toFixed(2),
      ...SCORE_COLS.map(c => ((r.bias_scores?.[c.key]) || 0).toFixed(2)),
      r.risk_level,
      r.language_detected,
      r.highlighted_count || 0,
    ])
    const csv = [headers, ...rows].map(row => row.map(escapeField).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch_${batchId?.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setItems([{ id: 1, content: '', language: 'en' }])
    setBatchName('')
    setResults(null)
    setBatchId(null)
    setProgress({ processed: 0, completed: 0, failed: 0, total: 0 })
    setError(null)
  }

  const getRiskColor = (level) => ({
    low:      'text-green-700 bg-green-50 border-green-200',
    medium:   'text-yellow-700 bg-yellow-50 border-yellow-200',
    high:     'text-red-700 bg-red-50 border-red-200',
    critical: 'text-pink-700 bg-pink-50 border-pink-200',
    failed:   'text-gray-500 bg-gray-50 border-gray-200',
  }[level] || 'text-gray-600 bg-gray-50 border-gray-200')

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Batch Analyzer</h1>
        <p className="text-gray-500 mb-8 text-sm">Analyze up to 50 texts at once across all 7 bias categories</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {!results ? (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            {/* Batch name + file upload */}
            <div className="flex items-end gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Batch Name (optional)</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., News Articles Q1 2025"
                  value={batchName}
                  onChange={e => setBatchName(e.target.value)}
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm"
              >
                <Upload className="w-4 h-4" /> Load from File
              </button>
              <input ref={fileInputRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFileUpload} />
            </div>

            {/* Items */}
            <div className="space-y-3 mb-6">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm mt-2">
                    {index + 1}
                  </div>
                  <textarea
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                    rows="3"
                    placeholder="Enter text to analyze…"
                    value={item.content}
                    onChange={e => updateItem(item.id, 'content', e.target.value)}
                  />
                  <select
                    className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    value={item.language}
                    onChange={e => updateItem(item.id, 'language', e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="mr">Marathi</option>
                    <option value="ta">Tamil</option>
                    <option value="bn">Bengali</option>
                  </select>
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={addItem}
                disabled={items.length >= 50}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Add Item ({items.length}/50)
              </button>
              <button
                onClick={startBatchAnalysisHandler}
                disabled={isProcessing || items.every(i => !i.content.trim())}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing {progress.processed}/{progress.total}…</>
                ) : (
                  <><Play className="w-5 h-5" /> Start Batch Analysis</>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              Each item takes ~5–10s with AI analysis. {items.filter(i => i.content.trim()).length} item(s) will be processed sequentially.
            </p>

            {/* Progress bar */}
            {isProcessing && progress.total > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between text-sm font-medium text-blue-800 mb-2">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing item {progress.processed + 1} of {progress.total}…
                  </span>
                  <span>{Math.round((progress.processed / progress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-blue-600 mt-2">
                  <span>
                    {progress.completed > 0 && `✅ ${progress.completed} done`}
                    {progress.failed > 0 && ` · ❌ ${progress.failed} failed`}
                  </span>
                  <span className="text-blue-500">
                    ~{Math.max(0, (progress.total - progress.processed) * 5)}s remaining
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Batch Results</h2>
                  <p className="text-xs text-gray-400 mt-0.5">ID: {batchId}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={downloadCSV}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" /> Download CSV
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm"
                  >
                    New Batch
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Items',  value: results.total_items,                                                                          color: 'blue' },
                  { label: 'Succeeded',    value: results.completed_items ?? results.results.filter(r => r.status === 'completed').length,       color: 'green' },
                  { label: 'Failed',       value: results.failed_items   ?? results.results.filter(r => r.status === 'failed').length,           color: 'red' },
                  { label: 'High Risk',    value: results.results.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').length,    color: 'yellow' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`bg-${color}-50 p-4 rounded-lg border border-${color}-100`}>
                    <p className={`text-sm text-${color}-600 font-medium`}>{label}</p>
                    <p className={`text-2xl font-bold text-${color}-900`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Results table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Item
                        <span className="ml-1 text-gray-300 font-normal normal-case">(click to expand)</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Overall</th>
                      {SCORE_COLS.map(c => (
                        <th key={c.key} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{c.label}</th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Risk</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lang</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.results.map((r, idx) => {
                      const isExpanded = expandedRow === idx
                      const spans = normaliseSpans(r.highlighted_spans || [], r.content || '')
                      return (
                        <>
                          {/* Main row */}
                          <tr
                            key={`row-${idx}`}
                            className={`hover:bg-gray-50 cursor-pointer ${r.status === 'failed' ? 'opacity-60' : ''} ${isExpanded ? 'bg-blue-50' : ''}`}
                            onClick={() => setExpandedRow(isExpanded ? null : idx)}
                          >
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                {r.item_id}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">{(r.overall_bias || 0).toFixed(2)}</td>
                            {SCORE_COLS.map(c => (
                              <td key={c.key} className="px-3 py-3 text-gray-600">
                                {((r.bias_scores?.[c.key]) || 0).toFixed(2)}
                              </td>
                            ))}
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getRiskColor(r.risk_level)}`}>
                                {(r.risk_level || 'unknown').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 uppercase text-xs">{r.language_detected || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{r.highlighted_count ?? '—'}</td>
                          </tr>

                          {/* Expandable detail row */}
                          {isExpanded && (
                            <tr key={`detail-${idx}`}>
                              <td colSpan={2 + SCORE_COLS.length + 3} className="px-4 py-4 bg-blue-50 border-t border-blue-100">
                                <div className="grid grid-cols-2 gap-4">

                                  {/* Original text with highlights */}
                                  <div>
                                    <p className="text-xs font-semibold text-red-700 mb-2">🔴 Original Text (biased terms highlighted)</p>
                                    <div className="p-3 bg-white border border-red-200 rounded-lg text-sm leading-relaxed text-gray-700 max-h-40 overflow-y-auto">
                                      {r.content ? (
                                        spans.length > 0 ? (
                                          buildParts(r.content, spans).map((part, i) =>
                                            part.hi ? (
                                              <span
                                                key={i}
                                                className={`px-0.5 rounded border font-medium cursor-help ${BIAS_TYPE_COLORS[part.bias_type] || 'bg-yellow-100 border-yellow-300 text-yellow-800'}`}
                                                title={`${(part.bias_type || '').replace(/_/g, ' ')} · ${part.severity}${part.suggestion ? ` → ${part.suggestion}` : ''}`}
                                              >
                                                {part.text}
                                              </span>
                                            ) : <span key={i}>{part.text}</span>
                                          )
                                        ) : (
                                          <span className="text-gray-600">{r.content}</span>
                                        )
                                      ) : (
                                        <span className="text-gray-400 italic">No content available</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Bias-free alternative */}
                                  <div>
                                    <p className="text-xs font-semibold text-green-700 mb-2">🟢 Bias-Free Alternative</p>
                                    <div className="p-3 bg-white border-2 border-green-300 rounded-lg text-sm leading-relaxed text-gray-800 max-h-40 overflow-y-auto">
                                      {r.alternative_text && r.alternative_text !== r.content ? (
                                        r.alternative_text
                                      ) : (
                                        <span className="text-gray-400 italic">
                                          {r.status === 'failed' ? 'Analysis failed' : 'No changes needed — text is already bias-free'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Word-level replacements */}
                                {spans.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-xs font-semibold text-gray-600 mb-2">Word-level replacements:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {spans
                                        .filter((s, i, arr) => arr.findIndex(x => (x.text || '').toLowerCase() === (s.text || '').toLowerCase()) === i)
                                        .map((s, i) => (
                                          <span key={i} className={`px-2 py-1 rounded-full text-xs border font-medium ${BIAS_TYPE_COLORS[s.bias_type] || 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                                            <span className="line-through opacity-70">{s.text}</span>
                                            {s.suggestion && <><span className="mx-1">→</span><span>{s.suggestion}</span></>}
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bias distribution chart (simple bars) */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Average Bias by Category
              </h3>
              <div className="space-y-3">
                {SCORE_COLS.map(({ key, label }) => {
                  const avg = results.results.reduce((s, r) => s + ((r.bias_scores?.[key]) || 0), 0) / results.results.length
                  const pct = Math.round(avg * 100)
                  const color = avg > 0.6 ? 'bg-red-500' : avg > 0.3 ? 'bg-yellow-500' : 'bg-green-500'
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{label}</span>
                        <span className="font-semibold text-gray-900">{avg.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BatchAnalyzer
