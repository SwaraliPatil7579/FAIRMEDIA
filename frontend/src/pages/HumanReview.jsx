import { useState } from 'react'
import { getAnalyses, updateAnalysis } from '../utils/analysisStorage'
import {
  CheckCircle, Edit3, XCircle, AlertTriangle,
  FileText, Brain, BarChart3, Scale, Search,
  Save, RotateCcw, X, ChevronDown, ChevronUp
} from 'lucide-react'

// ── Bias replacement dictionary — MASTER copy, synced with ContentAnalyzer ──
// Longest phrases first so multi-word matches win over single words.
const BIAS_REPLACEMENTS = {
  // ── Workplace / hiring bias ────────────────────────────────────────────
  "all-male board of directors":                    "diverse board of directors",
  "all-male board":                                 "diverse board",
  "without family distractions":                    "with good work-life balance",
  "family distractions":                            "personal commitments",
  "young, hungry coders":                           "skilled developers",
  "young and hungry":                               "motivated and driven",
  "rockstar developer":                             "skilled developer",
  "rockstar engineer":                              "skilled engineer",
  "ninja developer":                                "skilled developer",
  "ninja engineer":                                 "skilled engineer",
  "10x developer":                                  "highly productive developer",
  "10x engineer":                                   "highly productive engineer",
  "culture fit":                                    "values alignment",
  "culture add":                                    "values alignment",
  "young, hungry":                                  "motivated",
  "lady programmers":                               "female developers",
  "lady programmer":                                "female developer",
  "female coders":                                  "developers",
  "female coder":                                   "developer",
  "girl coders":                                    "developers",
  "girl coder":                                     "developer",
  "women in tech":                                  "developers",
  "work long hours":                                "work effectively",
  "hustle culture":                                 "dedicated work culture",
  "always available":                               "responsive and reliable",
  // ── Racial / ethnic stereotypes ────────────────────────────────────────
  "young attractive ones":                          "skilled professionals",
  "asian developers are naturally good at math":    "developers with strong technical skills",
  "asian developers are naturally good":            "developers with strong skills",
  "asians are naturally good at math":              "individuals with strong math skills",
  "asians are good at math":                        "individuals with strong math skills",
  "african americans excel in creative roles":      "individuals with creative skills",
  "hispanic workers are hardworking but may have language barriers": "individuals with strong work ethic and language support",
  "hispanic workers are hardworking":               "dedicated workers",
  "native english speakers":                        "proficient English speakers",
  "culturally fit":                                 "aligned with team values",
  "american values":                                "shared team values",
  "model minority":                                 "high-achieving individual",
  "exotic":                                         "unique",
  "surprisingly articulate":                        "well-spoken",
  "articulate":                                     "well-spoken",
  "one of the good ones":                           "a valued colleague",
  "you speak english so well":                      "you communicate effectively",
  "where are you really from":                      "what is your background",
  // ── Multi-word gender phrases ───────────────────────────────────────────
  "women belong in the kitchen":                    "people can work in any field",
  "women belong in supportive positions":           "people can work in any role",
  "men are the natural leaders":                    "people of all genders can lead",
  "men are natural leaders":                        "people of all genders can lead",
  "natural leaders":                                "capable leaders",
  "natural leader":                                 "capable leader",
  "boys will be boys":                              "children should be held to equal standards",
  "boys don't cry":                                 "it's okay to express emotions",
  "man of the house":                               "head of household",
  "man up":                                         "be courageous",
  "be a man":                                       "be strong",
  "man's job":                                      "anyone's job",
  "woman's place":                                  "anyone's place",
  "like a girl":                                    "with effort",
  "throw like a girl":                              "throw with less force",
  "weaker sex":                                     "all people",
  "lady doctor":                                    "doctor",
  "lady engineer":                                  "engineer",
  "lady scientist":                                 "scientist",
  "lady lawyer":                                    "lawyer",
  "male nurse":                                     "nurse",
  "working mother":                                 "working parent",
  "career woman":                                   "professional",
  "old maid":                                       "unmarried person",
  "men are better at":                              "individuals vary in their abilities with",
  "women are too emotional":                        "all people experience emotions",
  "men are naturally":                              "individuals can be naturally",
  "women are naturally":                            "individuals can be naturally",
  "girls should":                                   "all people should",
  "real men":                                       "people",
  "crumble under stress":                           "struggle under pressure",
  "built for high-pressure":                        "suited for demanding",
  "supportive positions":                           "various roles",
  "breadwinners":                                   "providers",
  "breadwinner":                                    "provider",
  "prioritize family over deadlines":               "balance personal and professional priorities",
  "somehow managed":                                "managed",
  "surprisingly sharp":                             "highly capable",
  "allowing her to":                                "supporting her to",
  "juggling family responsibilities":               "balancing family responsibilities",
  "the mother of":                                  "a parent of",
  // ── Age bias ──────────────────────────────────────────────────────────
  "millennials are lazy":                           "younger workers have different work styles",
  "millennials don't work hard":                    "work styles vary across generations",
  "boomers don't understand technology":            "technology adoption varies",
  "too old for this":                               "experienced in this",
  "over the hill":                                  "experienced",
  "past their prime":                               "highly experienced",
  "ok boomer":                                      "I respectfully disagree",
  "young and inexperienced":                        "early-career",
  "too young to understand":                        "still learning",
  "senior moment":                                  "momentary lapse",
  "retire already":                                 "consider transitioning roles",
  "digital native":                                 "tech-savvy person",
  "digital immigrant":                              "person learning new technology",
  // ── Disability bias ───────────────────────────────────────────────────
  "wheelchair-bound":                               "wheelchair user",
  "confined to a wheelchair":                       "wheelchair user",
  "suffers from":                                   "has",
  "afflicted with":                                 "has",
  "victim of":                                      "person with",
  "mentally ill":                                   "person with a mental health condition",
  "special needs":                                  "disability",
  "handicapped":                                    "disabled",
  "normal people":                                  "people without disabilities",
  "crazy":                                          "unusual",
  "insane":                                         "extreme",
  "lame":                                           "ineffective",
  // ── Religious bias ────────────────────────────────────────────────────
  "all muslims are":                                "some individuals who are Muslim",
  "typical christian":                              "some Christians",
  "religious fanatic":                              "person with strong religious beliefs",
  "bible thumper":                                  "devout Christian",
  // ── Socioeconomic bias ────────────────────────────────────────────────
  "poor people are lazy":                           "people in poverty face systemic barriers",
  "welfare queen":                                  "person receiving social assistance",
  "born with a silver spoon":                       "from a wealthy background",
  "trailer trash":                                  "person living in a mobile home",
  "uneducated masses":                              "people without formal education",
  // ── Single words ───────────────────────────────────────────────────────
  "chairman":       "chairperson",
  "fireman":        "firefighter",
  "policeman":      "police officer",
  "businessman":    "businessperson",
  "spokesman":      "spokesperson",
  "spokeswoman":    "spokesperson",
  "mailman":        "mail carrier",
  "cameraman":      "camera operator",
  "salesman":       "salesperson",
  "foreman":        "supervisor",
  "mankind":        "humankind",
  "manpower":       "workforce",
  "housewife":      "homemaker",
  "tomboy":         "active child",
  "bossy":          "decisive",
  "emotional":      "expressive",
  "hysterical":     "upset",
  "nurturing":      "caring",
  "ditzy":          "thoughtful",
  "nagging":        "persistent",
  "catfight":       "disagreement",
  "aggressive":     "assertive",
  "dominant":       "leading",
  "stubborn":       "persistent",
  "male-dominated": "historically male-dominated",
  // ── Hindi phrases ──────────────────────────────────────────────────────
  "औरतों का काम":            "घर का काम",
  "मर्दानगी":                "साहस",
  "पराया धन":                "बेटी",
  "पति परमेश्वर":            "जीवन साथी",
  "कमजोर लिंग":             "व्यक्ति",
  "अबला नारी":               "महिला",
  "लड़के रोते नहीं":    "भावनाएं स्वाभाविक हैं",
  "मर्द को दर्द नहीं होता": "सभी को दर्द होता है",
}

const SORTED_PHRASES = Object.keys(BIAS_REPLACEMENTS).sort((a, b) => b.length - a.length)

function generateAlternative(text) {
  if (!text) return text
  let result = text
  SORTED_PHRASES.forEach(phrase => {
    const rep = BIAS_REPLACEMENTS[phrase]
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    result = result.replace(regex, (match) => {
      if (match === match.toUpperCase()) return rep.toUpperCase()
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep[0].toUpperCase() + rep.slice(1)
      }
      return rep
    })
  })
  // Fix article grammar
  result = result.replace(/\ban\s+([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])/g, 'a $1')
  return result
}

// ── Helpers ───────────────────────────────────────────────────────────────
const getBiasColor = (score) => {
  if (score > 0.7) return 'text-red-600'
  if (score > 0.4) return 'text-orange-500'
  return 'text-green-600'
}

const getRiskBadge = (level) => {
  const map = {
    high:     'bg-red-100 text-red-800 border-red-200',
    medium:   'bg-yellow-100 text-yellow-800 border-yellow-200',
    low:      'bg-green-100 text-green-800 border-green-200',
    critical: 'bg-red-200 text-red-900 border-red-300',
  }
  return map[(level || '').toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200'
}

const BIAS_TYPE_COLORS = {
  gender_bias:        'bg-red-50 border-red-200 text-red-700',
  stereotype:         'bg-yellow-50 border-yellow-200 text-yellow-700',
  age_bias:           'bg-orange-50 border-orange-200 text-orange-700',
  disability_bias:    'bg-pink-50 border-pink-200 text-pink-700',
  religious_bias:     'bg-indigo-50 border-indigo-200 text-indigo-700',
  socioeconomic_bias: 'bg-teal-50 border-teal-200 text-teal-700',
  language_dominance: 'bg-purple-50 border-purple-200 text-purple-700',
}

function HumanReview() {
  const [analyses, setAnalyses] = useState(() => getAnalyses())
  const [editModal, setEditModal] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const reload = () => setAnalyses(getAnalyses())

  const pendingArticles = analyses.filter(
    a => !a.reviewed && (a.bias_score ?? 0) > 0.4
  )
  const resolvedArticles = analyses.filter(
    a => (a.reviewed || a.mitigated) && (a.bias_score ?? 0) > 0.4
  )

  const handleApprove = (id) => {
    updateAnalysis(id, { reviewed: true })
    reload()
  }

  const handleOverride = (id) => {
    updateAnalysis(id, { reviewed: true, mitigated: false })
    reload()
  }

  const handleOpenEdit = (article) => {
    const original = article.content || ''
    // Use AI alternative text if available, otherwise generate from dictionary
    const aiAlt = article.bias_detection?.alternative_text
    const suggested = (aiAlt && aiAlt !== original)
      ? aiAlt
      : generateAlternative(original)
    setEditModal({ articleId: article.id, originalText: original, editedText: suggested })
  }

  const handleSaveEdit = () => {
    if (!editModal) return
    updateAnalysis(editModal.articleId, {
      mitigated: true,
      reviewed: true,
      mitigated_content: editModal.editedText,
    })
    setEditModal(null)
    reload()
  }

  const getAISummary = (article) => {
    const explanations = article.bias_detection?.explanations
    if (!explanations) {
      const score = article.bias_score ?? 0
      const type = (article.bias_type || 'bias').replace(/_/g, ' ')
      return `Overall bias score: ${score.toFixed(2)}. Primary type: ${type}. Risk: ${article.risk_level || 'unknown'}.`
    }
    return Object.entries(explanations)
      .filter(([, v]) => v && !v.toLowerCase().includes('no ') && !v.toLowerCase().includes('not detected'))
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join(' | ') || 'No significant bias explanations available.'
  }

  const getXAIReasoning = (article) => {
    const spans = article.highlighted_text || article.bias_detection?.highlighted_text || []
    if (!spans || spans.length === 0) return 'No specific biased terms were flagged.'
    const termList = spans
      .slice(0, 8)
      .map(s => `"${s.text}"${s.suggestion ? ` → "${s.suggestion}"` : ''}`)
      .join(', ')
    return `${spans.length} biased term(s) detected: ${termList}${spans.length > 8 ? ` and ${spans.length - 8} more` : ''}.`
  }

  const getSuggestedRanking = (article) => {
    const score = article.bias_score ?? 0
    if (score > 0.7) return `Score ${score.toFixed(2)} — high bias. Recommended: hold for editorial review before publishing.`
    if (score > 0.4) return `Score ${score.toFixed(2)} — moderate bias. Apply suggested rewrites and re-rank below lower-bias content.`
    return `Score ${score.toFixed(2)} — within acceptable range. Minor edits recommended.`
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Human Review</h1>
          <p className="text-gray-600 mt-1">Human-in-the-Loop oversight and approval</p>
        </div>

        {/* Alert banner */}
        <div className={`border-l-4 p-4 mb-6 rounded-lg shadow-sm ${
          pendingArticles.length > 0
            ? 'bg-red-50 border-red-500'
            : 'bg-green-50 border-green-500'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              pendingArticles.length > 0 ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {pendingArticles.length > 0
                ? <AlertTriangle className="w-6 h-6 text-red-600" />
                : <CheckCircle className="w-6 h-6 text-green-600" />
              }
            </div>
            <div>
              {pendingArticles.length > 0 ? (
                <>
                  <p className="text-red-800 font-semibold">
                    {pendingArticles.length} article{pendingArticles.length !== 1 ? 's' : ''} need your attention
                  </p>
                  <p className="text-red-700 text-sm mt-0.5">
                    Flagged by AI — require human review before deployment
                  </p>
                </>
              ) : (
                <>
                  <p className="text-green-800 font-semibold">All caught up!</p>
                  <p className="text-green-700 text-sm mt-0.5">
                    No articles pending review. Analyze content to populate this queue.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pending articles */}
        <div className="space-y-6">
          {pendingArticles.map((article) => {
            const biasScore = article.bias_score ?? 0
            const spans = article.highlighted_text || article.bias_detection?.highlighted_text || []
            const biasScores = article.bias_detection?.bias_scores || null
            const isExpanded = expandedId === article.id

            return (
              <div key={article.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
                        {(article.content || 'No content').slice(0, 150)}
                        {(article.content || '').length > 150 ? '…' : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400">{new Date(article.timestamp).toLocaleString()}</span>
                        <span className="text-gray-300">•</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getRiskBadge(article.risk_level)}`}>
                          {(article.risk_level || 'unknown').toUpperCase()} RISK
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500 uppercase">{article.language}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-3xl font-bold ${getBiasColor(biasScore)}`}>
                        {biasScore.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">Bias Score</p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">

                  {/* AI Summary + XAI */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <h4 className="text-sm font-semibold text-gray-700">AI Summary</h4>
                      </div>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
                        {getAISummary(article)}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-blue-500" />
                        <h4 className="text-sm font-semibold text-gray-700">XAI Reasoning</h4>
                      </div>
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200 leading-relaxed">
                        {getXAIReasoning(article)}
                      </p>
                    </div>
                  </div>

                  {/* Expandable details */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-3 font-medium"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {isExpanded ? 'Hide details' : 'Show full details'}
                  </button>

                  {isExpanded && (
                    <>
                      {/* Bias breakdown */}
                      {biasScores && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="w-4 h-4 text-gray-500" />
                            <h4 className="text-sm font-semibold text-gray-700">Bias Breakdown</h4>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(biasScores)
                              .filter(([k]) => k !== 'overall')
                              .map(([key, val]) => (
                                <div key={key} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                                  <p className="text-xs text-gray-500 capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                                  <p className={`text-lg font-bold ${getBiasColor(val)}`}>{(val ?? 0).toFixed(2)}</p>
                                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                    <div
                                      className={`h-1 rounded-full ${val > 0.7 ? 'bg-red-500' : val > 0.4 ? 'bg-orange-400' : 'bg-green-500'}`}
                                      style={{ width: `${Math.min((val ?? 0) * 100, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Detected spans */}
                      {spans.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Search className="w-4 h-4 text-gray-500" />
                            <h4 className="text-sm font-semibold text-gray-700">
                              Detected Biased Terms ({spans.length})
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {spans.map((span, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-1 text-xs rounded-full border ${
                                  BIAS_TYPE_COLORS[span.bias_type] || 'bg-gray-50 border-gray-200 text-gray-700'
                                }`}
                              >
                                <span className="font-medium">"{span.text}"</span>
                                {span.suggestion && (
                                  <span className="text-green-700"> → {span.suggestion}</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested ranking */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Scale className="w-4 h-4 text-yellow-700" />
                          <h4 className="text-sm font-semibold text-gray-700">Suggested Re-ranking</h4>
                        </div>
                        <p className="text-sm text-gray-700">{getSuggestedRanking(article)}</p>
                      </div>
                    </>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => handleApprove(article.id)}
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Deploy
                    </button>
                    <button
                      onClick={() => handleOpenEdit(article)}
                      className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit & Mitigate
                    </button>
                    <button
                      onClick={() => handleOverride(article.id)}
                      className="flex-1 bg-gray-600 text-white py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      Override AI
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Resolved articles */}
        {resolvedArticles.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Resolved ({resolvedArticles.length})
            </h2>
            <div className="space-y-2">
              {resolvedArticles.map(article => (
                <div key={article.id} className="bg-white border border-gray-200 rounded-lg px-5 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      {(article.content || '').slice(0, 100)}…
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(article.timestamp).toLocaleString()} · Bias: {(article.bias_score ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <span className={`ml-4 shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                    article.mitigated ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {article.mitigated ? '✅ Mitigated' : '✓ Approved'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  Edit Bias-Free Alternative
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  AI has auto-applied replacements. Edit further before saving.
                </p>
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Original */}
                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                    🔴 Original (Biased)
                  </h3>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg h-52 overflow-y-auto">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {editModal.originalText || '(no content)'}
                    </p>
                  </div>
                </div>

                {/* Editable */}
                <div>
                  <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
                    🟢 Bias-Free Alternative (Editable)
                  </h3>
                  <textarea
                    className="w-full p-4 bg-green-50 border-2 border-green-300 rounded-lg h-52 text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:border-green-500"
                    value={editModal.editedText}
                    onChange={e => setEditModal(prev => ({ ...prev, editedText: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save & Mark as Mitigated
                </button>
                <button
                  onClick={() => setEditModal(prev => ({
                    ...prev,
                    editedText: generateAlternative(prev.originalText),
                  }))}
                  className="px-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset to AI
                </button>
                <button
                  onClick={() => setEditModal(null)}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HumanReview
