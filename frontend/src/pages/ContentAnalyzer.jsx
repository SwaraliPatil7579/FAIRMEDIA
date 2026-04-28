import { useState, useRef } from 'react'
import { analyzeText } from '../api/api_client'
import { saveAnalysis } from '../utils/analysisStorage'
import {
  FileText,
  Link as LinkIcon,
  Upload,
  Play,
  RotateCcw,
  Download,
  Copy,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Languages,
  FileType,
  Hash,
  Tag,
  Globe,
  X
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// MASTER BIAS DICTIONARY
// Used for BOTH alternative-text generation AND highlighting.
// Longest phrases first so multi-word matches win over single words.
// ─────────────────────────────────────────────────────────────
const BIAS_REPLACEMENTS = {
  // ── Multi-word phrases ──────────────────────────────────────
  "women belong in the kitchen":        "people can work in any field",
  "women belong in supportive positions":"people can work in any role",
  "men are the natural leaders":        "people of all genders can lead",
  "men are natural leaders":            "people of all genders can lead",
  "natural leaders":                    "capable leaders",
  "natural leader":                     "capable leader",
  "boys will be boys":                  "children should be held to equal standards",
  "boys don't cry":                     "it's okay to express emotions",
  "man of the house":                   "head of household",
  "man up":                             "be courageous",
  "be a man":                           "be strong",
  "man's job":                          "anyone's job",
  "woman's place":                      "anyone's place",
  "like a girl":                        "with effort",
  "throw like a girl":                  "throw with less force",
  "weaker sex":                         "all people",
  "lady doctor":                        "doctor",
  "lady engineer":                      "engineer",
  "lady scientist":                     "scientist",
  "lady lawyer":                        "lawyer",
  "male nurse":                         "nurse",
  "working mother":                     "working parent",
  "career woman":                       "professional",
  "old maid":                           "unmarried person",
  "men are better at":                  "individuals vary in their abilities with",
  "women are too emotional":            "all people experience emotions",
  "men are naturally":                  "individuals can be naturally",
  "women are naturally":                "individuals can be naturally",
  "girls should":                       "all people should",
  "real men":                           "people",
  "crumble under stress":               "struggle under pressure",
  "built for high-pressure":            "suited for demanding",
  "supportive positions":               "various roles",
  "breadwinners":                       "providers",
  "breadwinner":                        "provider",
  "prioritize family over deadlines":   "balance personal and professional priorities",
  "somehow managed":                    "managed",
  "surprisingly sharp":                 "highly capable",
  "allowing her to":                    "supporting her to",
  "juggling family responsibilities":   "balancing family responsibilities",
  "the mother of":                      "a parent of",
  // ── Single words ───────────────────────────────────────────
  "chairman":   "chairperson",
  "fireman":    "firefighter",
  "policeman":  "police officer",
  "businessman":"businessperson",
  "spokesman":  "spokesperson",
  "mailman":    "mail carrier",
  "cameraman":  "camera operator",
  "salesman":   "salesperson",
  "foreman":    "supervisor",
  "mankind":    "humankind",
  "manpower":   "workforce",
  "housewife":  "homemaker",
  "tomboy":     "active child",
  "emotional":  "expressive",
  "hysterical": "upset",
  "nurturing":  "caring",
  "ditzy":      "thoughtful",
  "nagging":    "persistent",
  "catfight":   "disagreement",
  "aggressive": "assertive",
  "dominant":   "leading",
  "stubborn":   "persistent",
  // ── Hindi phrases ──────────────────────────────────────────
  "औरतों का काम":       "घर का काम",
  "मर्दानगी":           "साहस",
  "पराया धन":           "बेटी",
  "पति परमेश्वर":       "जीवन साथी",
  "कमजोर लिंग":        "व्यक्ति",
  "अबला नारी":          "महिला",
  "लड़के रोते नहीं":    "भावनाएं स्वाभाविक हैं",
  "मर्द को दर्द नहीं होता": "सभी को दर्द होता है",
}

// Sorted longest-first once at module level (not re-sorted on every render)
const SORTED_PHRASES = Object.keys(BIAS_REPLACEMENTS).sort((a, b) => b.length - a.length)

// ─────────────────────────────────────────────────────────────
// Scan text with the frontend dictionary and return span objects
// in the same shape the backend would return.
// ─────────────────────────────────────────────────────────────
function detectBiasSpansLocally(text) {
  if (!text) return []

  // Track which character positions are already claimed
  const claimed = new Uint8Array(text.length)
  const spans = []

  SORTED_PHRASES.forEach(phrase => {
    const regex = new RegExp(
      phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'gi'
    )
    let match
    while ((match = regex.exec(text)) !== null) {
      const start = match.index
      const end = start + match[0].length

      // Skip if any character in this range is already claimed
      if (claimed.slice(start, end).some(v => v === 1)) continue

      // Mark as claimed
      for (let i = start; i < end; i++) claimed[i] = 1

      const replacement = BIAS_REPLACEMENTS[phrase]
      // Infer bias type from phrase / replacement content
      const lowerPhrase = phrase.toLowerCase()
      let biasType = 'gender_bias'
      if (
        lowerPhrase.includes('मर्दानगी') ||
        lowerPhrase.includes('औरतों') ||
        lowerPhrase.includes('पराया') ||
        lowerPhrase.includes('पति') ||
        lowerPhrase.includes('लिंग') ||
        lowerPhrase.includes('नारी') ||
        lowerPhrase.includes('लड़के') ||
        lowerPhrase.includes('मर्द')
      ) biasType = 'language_dominance'
      else if (
        ['stubborn', 'bossy', 'hysterical', 'nagging', 'ditzy', 'catfight',
         'tomboy', 'boys will be boys', 'surprisingly sharp', 'somehow managed',
         'juggling family'].some(s => lowerPhrase.includes(s))
      ) biasType = 'stereotype'

      const matchedText = match[0]
      const suggestion = (() => {
        if (matchedText[0] === matchedText[0].toUpperCase() && matchedText[0] !== matchedText[0].toLowerCase()) {
          return replacement[0].toUpperCase() + replacement.slice(1)
        }
        return replacement
      })()

      spans.push({
        text: matchedText,
        phrase,
        suggestion,
        bias_type: biasType,
        severity: phrase.split(' ').length > 2 ? 'high' : 'medium',
        start,
        end,
      })
    }
  })

  // Sort by position so we can render in order
  return spans.sort((a, b) => a.start - b.start)
}

// ─────────────────────────────────────────────────────────────
// Build highlighted parts array from LOCAL spans
// ─────────────────────────────────────────────────────────────
function buildHighlightParts(text, localSpans) {
  if (!text) return []
  if (!localSpans || localSpans.length === 0) return [{ text, isHighlighted: false }]

  const parts = []
  let cursor = 0

  localSpans.forEach(span => {
    if (span.start > cursor) {
      parts.push({ text: text.slice(cursor, span.start), isHighlighted: false })
    }
    parts.push({
      text: text.slice(span.start, span.end),
      isHighlighted: true,
      biasType: span.bias_type,
      severity: span.severity,
      suggestion: span.suggestion,
    })
    cursor = span.end
  })

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), isHighlighted: false })
  }

  return parts
}

// ─────────────────────────────────────────────────────────────
// Generate alternative text using the same dictionary
// ─────────────────────────────────────────────────────────────
function generateAlternativeText(originalText) {
  if (!originalText) return originalText
  let altText = originalText

  SORTED_PHRASES.forEach(phrase => {
    const replacement = BIAS_REPLACEMENTS[phrase]
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    altText = altText.replace(regex, (match) => {
      if (match === match.toUpperCase()) return replacement.toUpperCase()
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1)
      }
      return replacement
    })
  })

  return altText
}

// ─────────────────────────────────────────────────────────────
// Colour helper
// ─────────────────────────────────────────────────────────────
const getBiasColor = (type, severity) => {
  const colors = {
    gender_bias: {
      low:    'bg-red-100 border-red-300 text-red-800',
      medium: 'bg-red-200 border-red-400 text-red-900',
      high:   'bg-red-300 border-red-500 text-red-900',
    },
    stereotype: {
      low:    'bg-yellow-100 border-yellow-300 text-yellow-800',
      medium: 'bg-yellow-200 border-yellow-400 text-yellow-900',
      high:   'bg-yellow-300 border-yellow-500 text-yellow-900',
    },
    language_dominance: {
      low:    'bg-purple-100 border-purple-300 text-purple-800',
      medium: 'bg-purple-200 border-purple-400 text-purple-900',
      high:   'bg-purple-300 border-purple-500 text-purple-900',
    },
  }
  return colors[type]?.[severity] || 'bg-gray-100 border-gray-300 text-gray-800'
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
function ContentAnalyzer() {
  const [currentStep, setCurrentStep]       = useState(1)
  const [content, setContent]               = useState('')
  const [language, setLanguage]             = useState('en')
  const [contentType, setContentType]       = useState('article')
  const [isAnalyzing, setIsAnalyzing]       = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [preprocessing, setPreprocessing]   = useState(null)
  const [alternativeText, setAlternativeText] = useState('')
  const [localSpans, setLocalSpans]         = useState([])
  const [inputMode, setInputMode]           = useState('text')   // 'text' | 'url' | 'file'
  const [urlInput, setUrlInput]             = useState('')
  const [isFetchingUrl, setIsFetchingUrl]   = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const fileInputRef = useRef(null)

  const steps = [
    { num: 1, name: 'Content Input',  icon: FileText },
    { num: 2, name: 'Preprocessing', icon: Hash  },
    { num: 3, name: 'Bias Detection', icon: AlertTriangle },
    { num: 4, name: 'XAI Score',      icon: CheckCircle },
  ]

  const extractEntities = (text) => {
    const commonEntities = ['CEO','company','engineer','manager','director','president','team','organization']
    return commonEntities.filter(e => text.toLowerCase().includes(e.toLowerCase())).slice(0, 5)
  }

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return
    setIsFetchingUrl(true)
    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000'
      const res = await fetch(`${API_BASE}/api/v1/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to fetch URL')
      setContent(data.text)
      setInputMode('text')
      setUrlInput('')
    } catch (err) {
      alert(`Could not fetch URL: ${err.message}`)
    } finally {
      setIsFetchingUrl(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result || ''
      setContent(text.slice(0, 5000))
      setInputMode('text')
    }
    reader.onerror = () => alert('Failed to read file')
    reader.readAsText(file, 'utf-8')
    // Reset so same file can be re-uploaded
    e.target.value = ''
  }

  const handleAnalyze = async () => {
    if (!content.trim()) { alert('Please enter content to analyze'); return }

    setIsAnalyzing(true)
    setCurrentStep(2)

    try {
      const words = content.trim().split(/\s+/)
      setPreprocessing({
        detectedLanguage: language,
        wordCount: words.length,
        tokenCount: Math.floor(words.length * 1.3),
        entitiesFound: extractEntities(content),
      })

      await new Promise(r => setTimeout(r, 800))
      setCurrentStep(3)

      // ── Run frontend detection IMMEDIATELY (no backend dependency) ──
      const spans = detectBiasSpansLocally(content)
      setLocalSpans(spans)
      setAlternativeText(generateAlternativeText(content))

      // ── Call backend (may enrich spans further) ──
      const result = await analyzeText(content, { language })
      saveAnalysis({ ...result, content })

      if (result.bias_detection?.language_detected) {
        setPreprocessing(prev => ({ ...prev, detectedLanguage: result.bias_detection.language_detected }))
      }

      // Merge backend spans that aren't already covered by local detection
      if (result.bias_detection?.highlighted_text?.length > 0) {
        const merged = [...spans]
        result.bias_detection.highlighted_text.forEach(backendSpan => {
          const alreadyCovered = spans.some(ls =>
            ls.text.toLowerCase() === backendSpan.text?.toLowerCase()
          )
          if (!alreadyCovered && backendSpan.text) {
            merged.push({
              text: backendSpan.text,
              suggestion: backendSpan.suggestion || 'review needed',
              bias_type: backendSpan.bias_type || 'gender_bias',
              severity: backendSpan.severity || 'medium',
              start: content.toLowerCase().indexOf(backendSpan.text.toLowerCase()),
              end: content.toLowerCase().indexOf(backendSpan.text.toLowerCase()) + backendSpan.text.length,
            })
          }
        })
        setLocalSpans(merged.sort((a, b) => a.start - b.start))
      }

      setAnalysisResult(result)
      setCurrentStep(4)
    } catch (error) {
      console.error('Analysis failed:', error)
      // ── Even if backend fails, show frontend-only results ──
      if (localSpans.length > 0) {
        // Keep what we already detected and show a mock result
        const mockScore = Math.min(0.95, localSpans.length * 0.12)
        setAnalysisResult({
          analysis_id: 'local-' + Date.now(),
          bias_detection: {
            bias_scores: {
              overall: mockScore,
              gender_bias: mockScore * 0.9,
              stereotype: mockScore * 0.8,
              language_dominance: 0.1,
            },
            explanations: {
              gender_bias: `${localSpans.filter(s => s.bias_type === 'gender_bias').length} gendered term(s) detected in the text.`,
              stereotype: `${localSpans.filter(s => s.bias_type === 'stereotype').length} stereotypical pattern(s) identified.`,
              language_dominance: 'Language detected: ' + language.toUpperCase(),
            },
            highlighted_text: [],
            language_detected: language,
          }
        })
        setCurrentStep(4)
      } else {
        alert('Analysis failed. Please ensure backend is running at http://localhost:8000')
        setCurrentStep(1)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const copyAlternativeText = () => {
    navigator.clipboard.writeText(alternativeText)
    alert('Alternative text copied to clipboard!')
  }

  const resetAnalysis = () => {
    setCurrentStep(1)
    setContent('')
    setAnalysisResult(null)
    setPreprocessing(null)
    setAlternativeText('')
    setLocalSpans([])
    setInputMode('text')
    setUrlInput('')
    setUploadedFileName('')
  }

  // Unique spans for the legend (deduplicated by lowercase phrase)
  const legendSpans = localSpans.filter(
    (span, idx, arr) => arr.findIndex(s => s.phrase === span.phrase) === idx
  )

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Analyzer</h1>
        <p className="text-gray-600 mb-8">7-Step AI-Powered Bias Detection Pipeline</p>

        {/* Pipeline Steps */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100 card-gradient-border">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              return (
                <div key={step.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                      currentStep >= step.num 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-110 animate-pulse-glow' 
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      <StepIcon className={`w-6 h-6 ${currentStep >= step.num ? 'animate-bounce' : ''}`} />
                    </div>
                    <p className={`text-xs mt-2 font-semibold transition-all ${currentStep >= step.num ? 'text-blue-600 scale-110' : 'text-gray-500'}`}>
                      Step {step.num}
                    </p>
                    <p className="text-xs text-gray-600">{step.name}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 rounded transition-all duration-500 ${
                      currentStep > step.num 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-md' 
                        : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Step 1: Content Input ── */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-3d">
            <h2 className="text-xl font-semibold mb-4">Step 1: Content Input</h2>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <button
                onClick={() => setInputMode('text')}
                className={`p-4 border-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 card-bounce group ${inputMode === 'text' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
              >
                <FileText className={`w-5 h-5 group-hover:scale-110 transition-transform ${inputMode === 'text' ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-600'}`} />
                Paste Text
              </button>
              <button
                onClick={() => setInputMode('url')}
                className={`p-4 border-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 card-bounce group ${inputMode === 'url' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
              >
                <LinkIcon className={`w-5 h-5 group-hover:scale-110 transition-transform ${inputMode === 'url' ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-600'}`} />
                Paste URL
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-4 border-2 border-gray-200 hover:border-blue-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 card-bounce group"
              >
                <Upload className="w-5 h-5 text-gray-600 group-hover:text-blue-600 group-hover:scale-110 transition-all" />
                Upload File
              </button>
              {/* Hidden file input — accepts .txt and common text formats */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.html,.xml"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Uploaded file badge */}
            {uploadedFileName && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 w-fit">
                <CheckCircle className="w-4 h-4" />
                <span>Loaded: <strong>{uploadedFileName}</strong></span>
                <button onClick={() => { setUploadedFileName(''); setContent('') }} className="ml-1 text-green-600 hover:text-green-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* URL input panel */}
            {inputMode === 'url' && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  Enter article / webpage URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="https://example.com/article"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleFetchUrl()}
                  />
                  <button
                    onClick={handleFetchUrl}
                    disabled={isFetchingUrl || !urlInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isFetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                    {isFetchingUrl ? 'Fetching…' : 'Fetch'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Text will be extracted from the page and loaded into the editor below.</p>
              </div>
            )}

            <textarea
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={inputMode === 'url' ? 'Fetched text will appear here…' : 'Enter or paste content here for bias analysis…'}
              value={content}
              onChange={e => setContent(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source Language</label>
                <select className="w-full p-3 border border-gray-300 rounded-lg" value={language} onChange={e => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                  <option value="ta">Tamil</option>
                  <option value="bn">Bengali</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                <select className="w-full p-3 border border-gray-300 rounded-lg" value={contentType} onChange={e => setContentType(e.target.value)}>
                  <option value="article">News Article</option>
                  <option value="blog">Blog Post</option>
                  <option value="social">Social Media</option>
                  <option value="report">Report</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !content.trim()}
              className="mt-6 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Analysis
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Step 2: Preprocessing ── */}
        {currentStep >= 2 && preprocessing && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100 card-3d">
            <h2 className="text-xl font-semibold mb-4">Step 2: Preprocessing</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 card-shimmer group hover:scale-105 transition-transform">
                <div className="flex items-center gap-2 mb-2">
                  <Languages className="w-4 h-4 text-blue-600 group-hover:rotate-12 transition-transform" />
                  <p className="text-sm text-gray-600 font-medium">Detected Language</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{preprocessing.detectedLanguage.toUpperCase()}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 card-shimmer group hover:scale-105 transition-transform">
                <div className="flex items-center gap-2 mb-2">
                  <FileType className="w-4 h-4 text-green-600 group-hover:rotate-12 transition-transform" />
                  <p className="text-sm text-gray-600 font-medium">Word Count</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{preprocessing.wordCount}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 card-shimmer group hover:scale-105 transition-transform">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-purple-600 group-hover:rotate-12 transition-transform" />
                  <p className="text-sm text-gray-600 font-medium">Tokens</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">{preprocessing.tokenCount}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 card-shimmer group hover:scale-105 transition-transform">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-orange-600 group-hover:rotate-12 transition-transform" />
                  <p className="text-sm text-gray-600 font-medium">Entities Found</p>
                </div>
                <p className="text-2xl font-bold text-orange-600">{preprocessing.entitiesFound.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Steps 3 & 4: Results ── */}
        {currentStep >= 3 && analysisResult && (
          <>
            {/* Step 3 */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4">Step 3: Bias Detection</h2>

              {/* Original text with highlights */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Original Text (Biased terms highlighted):</h3>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700 leading-relaxed">
                    {buildHighlightParts(content, localSpans).map((part, idx) =>
                      part.isHighlighted ? (
                        <span
                          key={idx}
                          className={`px-1 py-0.5 rounded border-2 cursor-help ${getBiasColor(part.biasType, part.severity)}`}
                          title={`${part.biasType?.replace('_', ' ')} (${part.severity})${part.suggestion ? ` → ${part.suggestion}` : ''}`}
                        >
                          {part.text}
                        </span>
                      ) : (
                        <span key={idx}>{part.text}</span>
                      )
                    )}
                  </p>
                </div>
              </div>

              {/* Alternative text */}
              {alternativeText && alternativeText !== content && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">✨ Suggested Alternative (Bias-Free):</h3>
                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300 relative">
                    <p className="text-gray-800 leading-relaxed pr-20">{alternativeText}</p>
                    <button
                      onClick={copyAlternativeText}
                      className="absolute top-4 right-4 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-2 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {/* Legend — now driven by localSpans */}
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-gray-600 font-medium">Legend:</span>
                {legendSpans.length === 0 && (
                  <span className="text-xs text-gray-400 italic">No biased terms detected</span>
                )}
                {legendSpans.map((span, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-full text-xs border ${getBiasColor(span.bias_type, span.severity)}`}
                  >
                    {span.phrase} → {span.suggestion}
                  </span>
                ))}
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4">Step 4: Explainable Bias Score (XAI)</h2>

              <div className="text-center mb-6">
                <p className="text-6xl font-bold text-orange-600">
                  {(analysisResult.bias_detection?.bias_scores?.overall || 0).toFixed(2)}
                </p>
                <p className="text-gray-600 mt-2">Overall Bias Score</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(analysisResult.bias_detection?.bias_scores?.overall || 0) > 0.7 ? '🔴 High Bias' :
                   (analysisResult.bias_detection?.bias_scores?.overall || 0) > 0.4 ? '🟡 Medium Bias' :
                   '🟢 Low Bias'}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {Object.entries(analysisResult.bias_detection?.bias_scores || {}).map(([key, value]) =>
                  key !== 'overall' ? (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-semibold">{value.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${value * 100}%` }} />
                      </div>
                    </div>
                  ) : null
                )}
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">📖 AI Explanation:</h3>
                {Object.entries(analysisResult.bias_detection?.explanations || {}).map(([key, explanation]) => (
                  <p key={key} className="text-sm text-blue-800 mb-2">
                    <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong> {explanation}
                  </p>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={resetAnalysis}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Analyze New Text
                </button>
                <button
                  onClick={() => {
                    const data = JSON.stringify(analysisResult, null, 2)
                    const blob = new Blob([data], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `analysis-${analysisResult.analysis_id}.json`
                    a.click()
                  }}
                  className="px-6 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Export JSON
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ContentAnalyzer