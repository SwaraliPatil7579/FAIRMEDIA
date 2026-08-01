import { useState, useEffect, useCallback, useRef } from 'react'
import { analyzeText, fetchUrl as apiFetchUrl } from '../api/api_client'
import { saveAnalysis } from '../utils/analysisStorage'
import {
  FileText, Link as LinkIcon, Upload, Play, RotateCcw, Download, Copy,
  CheckCircle, AlertTriangle, Loader2, Languages, FileType, Hash, Tag,
  Globe, X, Zap, RefreshCw, Lightbulb
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// MASTER BIAS DICTIONARY — shared by live detection + AI fallback
// ─────────────────────────────────────────────────────────────
const BIAS_REPLACEMENTS = {
  "all-male board of directors":   "diverse board of directors",
  "all-male board":                "diverse board",
  "without family distractions":   "with good work-life balance",
  "family distractions":           "personal commitments",
  "young, hungry coders":          "skilled developers",
  "young and hungry":              "motivated and driven",
  "rockstar developer":            "skilled developer",
  "rockstar engineer":             "skilled engineer",
  "ninja developer":               "skilled developer",
  "ninja engineer":                "skilled engineer",
  "10x developer":                 "highly productive developer",
  "10x engineer":                  "highly productive engineer",
  "culture fit":                   "values alignment",
  "culture add":                   "values alignment",
  "young, hungry":                 "motivated",
  "lady programmers":              "female developers",
  "lady programmer":               "female developer",
  "female coders":                 "developers",
  "female coder":                  "developer",
  "girl coders":                   "developers",
  "girl coder":                    "developer",
  "women in tech":                 "developers",
  "work long hours":               "work effectively",
  "hustle culture":                "dedicated work culture",
  "always available":              "responsive and reliable",
  "young attractive ones":         "skilled professionals",
  "asian developers are naturally good at math": "developers with strong technical skills",
  "asian developers are naturally good":         "developers with strong skills",
  "asians are naturally good at math":           "individuals with strong math skills",
  "asians are good at math":                     "individuals with strong math skills",
  "african americans excel in creative roles":   "individuals with creative skills",
  "hispanic workers are hardworking but may have language barriers": "individuals with strong work ethic and language support",
  "hispanic workers are hardworking":  "dedicated workers",
  "native english speakers":           "proficient English speakers",
  "culturally fit":                    "aligned with team values",
  "american values":                   "shared team values",
  "model minority":                    "high-achieving individual",
  "exotic":                            "unique",
  "surprisingly articulate":           "well-spoken",
  "articulate":                        "well-spoken",
  "one of the good ones":              "a valued colleague",
  "you speak english so well":         "you communicate effectively",
  "where are you really from":         "what is your background",
  "women belong in the kitchen":       "people can work in any field",
  "women belong in supportive positions": "people can work in any role",
  "men are the natural leaders":       "people of all genders can lead",
  "men are natural leaders":           "people of all genders can lead",
  "natural leaders":                   "capable leaders",
  "natural leader":                    "capable leader",
  "boys will be boys":                 "children should be held to equal standards",
  "boys don't cry":                    "it's okay to express emotions",
  "man of the house":                  "head of household",
  "man up":                            "be courageous",
  "be a man":                          "be strong",
  "man's job":                         "anyone's job",
  "woman's place":                     "anyone's place",
  "like a girl":                       "with effort",
  "throw like a girl":                 "throw with less force",
  "weaker sex":                        "all people",
  "lady doctor":                       "doctor",
  "lady engineer":                     "engineer",
  "lady scientist":                    "scientist",
  "lady lawyer":                       "lawyer",
  "male nurse":                        "nurse",
  "working mother":                    "working parent",
  "career woman":                      "professional",
  "old maid":                          "unmarried person",
  "men are better at":                 "individuals vary in their abilities with",
  "women are too emotional":           "all people experience emotions",
  "men are naturally":                 "individuals can be naturally",
  "women are naturally":               "individuals can be naturally",
  "girls should":                      "all people should",
  "real men":                          "people",
  "crumble under stress":              "struggle under pressure",
  "built for high-pressure":           "suited for demanding",
  "supportive positions":              "various roles",
  "breadwinners":                      "providers",
  "breadwinner":                       "provider",
  "prioritize family over deadlines":  "balance personal and professional priorities",
  "somehow managed":                   "managed",
  "surprisingly sharp":                "highly capable",
  "allowing her to":                   "supporting her to",
  "juggling family responsibilities":  "balancing family responsibilities",
  "the mother of":                     "a parent of",
  "millennials are lazy":              "younger workers have different work styles",
  "millennials don't work hard":       "work styles vary across generations",
  "boomers don't understand technology": "technology adoption varies",
  "too old for this":                  "experienced in this",
  "over the hill":                     "experienced",
  "past their prime":                  "highly experienced",
  "ok boomer":                         "I respectfully disagree",
  "young and inexperienced":           "early-career",
  "too young to understand":           "still learning",
  "senior moment":                     "momentary lapse",
  "retire already":                    "consider transitioning roles",
  "digital native":                    "tech-savvy person",
  "digital immigrant":                 "person learning new technology",
  "wheelchair-bound":                  "wheelchair user",
  "confined to a wheelchair":          "wheelchair user",
  "suffers from":                      "has",
  "afflicted with":                    "has",
  "victim of":                         "person with",
  "mentally ill":                      "person with a mental health condition",
  "special needs":                     "disability",
  "handicapped":                       "disabled",
  "normal people":                     "people without disabilities",
  "crazy":                             "unusual",
  "insane":                            "extreme",
  "lame":                              "ineffective",
  "all muslims are":                   "some individuals who are Muslim",
  "typical christian":                 "some Christians",
  "religious fanatic":                 "person with strong religious beliefs",
  "bible thumper":                     "devout Christian",
  "poor people are lazy":              "people in poverty face systemic barriers",
  "welfare queen":                     "person receiving social assistance",
  "born with a silver spoon":          "from a wealthy background",
  "trailer trash":                     "person living in a mobile home",
  "uneducated masses":                 "people without formal education",
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
  "औरतों का काम सिर्फ घर संभालना है": "सभी लोग घर और काम दोनों संभाल सकते हैं",
  "पुरुषों को ही बड़े फैसले लेने चाहिए": "सभी योग्य लोग बड़े फैसले ले सकते हैं",
  "लड़के रोते नहीं हैं": "भावनाएं सभी के लिए स्वाभाविक हैं",
  "ladkiyon ko leadership roles nahi dene chahiye": "leadership roles should be based on ability",
  "women are too emotional under pressure": "people respond differently under pressure",
  "show mardangi": "show courage",
  "mulgi leadership sathi emotional aste": "leadership ability is not based on gender",
  "mulga naturally strong leader asto": "leadership ability varies by individual",
  "female employees na support work dya": "assign work based on skills",
  "men na client decisions handle karu dya": "let qualified employees handle client decisions",
  "women leadership ki suitable kaadu": "leadership suitability is not based on gender",
  "married women may have family distractions": "employees may have personal commitments",
  "women ra pressure handle korte pare na": "people vary in how they handle pressure",
  "men der deya uchit": "qualified people should be selected",
  "women leadership mate emotional hoy chhe": "leadership ability is not based on gender",
  "women pressure handle nahi kar sakdiyan": "people vary in how they handle pressure",
  "auratein tough decisions nahi le sakti": "decision-making ability is not based on gender",
  "mardon ko leadership leni chahiye": "leadership should be based on ability",
  "ladkon ko kabhi rona nahi chahiye": "everyone can express emotions",
  "औरतों का काम":            "घर का काम",
  "मर्दानगी":                "साहस",
  "पराया धन":                "बेटी",
  "पति परमेश्वर":            "जीवन साथी",
  "कमजोर लिंग":             "व्यक्ति",
  "अबला नारी":               "महिला",
  "लड़के रोते नहीं":    "भावनाएं स्वाभाविक हैं",
  "मर्द को दर्द नहीं होता": "सभी को दर्द होता है",

  // ── Caste & tribal bias ───────────────────────────────────
  "tribal communities are backward":       "tribal communities have rich cultural heritage",
  "backward communities":                  "marginalized communities",
  "backward caste":                        "historically marginalized caste",
  "lower caste":                           "person from a marginalized caste background",
  "lower caste candidates":                "candidates from all backgrounds",
  "upper caste values":                    "shared societal values",
  "lower caste values":                    "diverse cultural values",
  "caste-based":                           "background-based",
  "untouchable":                           "person from a Dalit community",
  "scheduled caste":                       "person from a scheduled caste community",
  "tribal people are primitive":           "tribal communities have distinct cultural traditions",
  "primitive tribes":                      "indigenous communities",
  "uncivilized":                           "from a different cultural background",
  "need modern values":                    "have their own valuable traditions",
  "savages":                               "people from indigenous communities",
  "low-caste":                             "person from a marginalized background",
  "high-caste":                            "person from a historically privileged background",
  "fit our upper caste":                   "align with shared",
  "may not fit our":                       "may bring different perspectives to",
}

const SORTED_PHRASES = Object.keys(BIAS_REPLACEMENTS).sort((a, b) => b.length - a.length)

const BIAS_TYPE_OVERRIDES = {
  "औरतों का काम सिर्फ घर संभालना है": "gender_bias",
  "औरतों का काम": "gender_bias",
  "पुरुषों को ही बड़े फैसले लेने चाहिए": "gender_bias",
  "लड़के रोते नहीं हैं": "stereotype",
  "लड़के रोते नहीं": "stereotype",
  "मर्द को दर्द नहीं होता": "stereotype",
  "मर्दानगी": "stereotype",
  "पराया धन": "gender_bias",
  "पति परमेश्वर": "gender_bias",
  "कमजोर लिंग": "gender_bias",
  "अबला नारी": "gender_bias",
  "ladkiyon ko leadership roles nahi dene chahiye": "gender_bias",
  "women are too emotional under pressure": "gender_bias",
  "show mardangi": "stereotype",
  "mulgi leadership sathi emotional aste": "gender_bias",
  "mulga naturally strong leader asto": "stereotype",
  "female employees na support work dya": "gender_bias",
  "men na client decisions handle karu dya": "gender_bias",
  "women leadership ki suitable kaadu": "gender_bias",
  "married women may have family distractions": "socioeconomic_bias",
  "women ra pressure handle korte pare na": "gender_bias",
  "men der deya uchit": "gender_bias",
  "women leadership mate emotional hoy chhe": "gender_bias",
  "women pressure handle nahi kar sakdiyan": "gender_bias",
  "auratein tough decisions nahi le sakti": "gender_bias",
  "mardon ko leadership leni chahiye": "gender_bias",
  "ladkon ko kabhi rona nahi chahiye": "stereotype",

  // ── Caste & tribal overrides ──────────────────────────────
  "tribal communities are backward":    "caste_bias",
  "backward communities":               "caste_bias",
  "backward caste":                     "caste_bias",
  "lower caste":                        "caste_bias",
  "lower caste candidates":             "caste_bias",
  "upper caste values":                 "caste_bias",
  "lower caste values":                 "caste_bias",
  "caste-based":                        "caste_bias",
  "untouchable":                        "caste_bias",
  "scheduled caste":                    "caste_bias",
  "tribal people are primitive":        "caste_bias",
  "primitive tribes":                   "caste_bias",
  "uncivilized":                        "caste_bias",
  "need modern values":                 "caste_bias",
  "savages":                            "caste_bias",
  "low-caste":                          "caste_bias",
  "high-caste":                         "caste_bias",
  "fit our upper caste":                "caste_bias",
  "may not fit our":                    "caste_bias",
}

// ── Bias type colours ─────────────────────────────────────────
const TYPE_COLORS = {
  gender_bias:        { bg: 'bg-red-100 border-red-300',    text: 'text-red-800',    label: 'Gender' },
  stereotype:         { bg: 'bg-yellow-100 border-yellow-300', text: 'text-yellow-800', label: 'Stereotype' },
  age_bias:           { bg: 'bg-orange-100 border-orange-300', text: 'text-orange-800', label: 'Age' },
  disability_bias:    { bg: 'bg-pink-100 border-pink-300',   text: 'text-pink-800',   label: 'Disability' },
  religious_bias:     { bg: 'bg-indigo-100 border-indigo-300', text: 'text-indigo-800', label: 'Religion' },
  socioeconomic_bias: { bg: 'bg-teal-100 border-teal-300',   text: 'text-teal-800',   label: 'Socioeconomic' },
  racial_ethnic_bias: { bg: 'bg-cyan-100 border-cyan-300',   text: 'text-cyan-800',   label: 'Race/Ethnicity' },
  caste_bias:         { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800', label: 'Caste/Community' },
  body_bias:          { bg: 'bg-rose-100 border-rose-300',   text: 'text-rose-800',   label: 'Body/Appearance' },
  nationality_bias:   { bg: 'bg-sky-100 border-sky-300',     text: 'text-sky-800',     label: 'Nationality' },
  language_dominance: { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-800', label: 'Language' },
}

const BIAS_COLORS = {
  gender_bias:        { low: 'bg-red-100 border-red-300 text-red-800',          medium: 'bg-red-200 border-red-400 text-red-900',          high: 'bg-red-300 border-red-500 text-red-900' },
  stereotype:         { low: 'bg-yellow-100 border-yellow-300 text-yellow-800', medium: 'bg-yellow-200 border-yellow-400 text-yellow-900', high: 'bg-yellow-300 border-yellow-500 text-yellow-900' },
  age_bias:           { low: 'bg-orange-100 border-orange-300 text-orange-800', medium: 'bg-orange-200 border-orange-400 text-orange-900', high: 'bg-orange-300 border-orange-500 text-orange-900' },
  disability_bias:    { low: 'bg-pink-100 border-pink-300 text-pink-800',       medium: 'bg-pink-200 border-pink-400 text-pink-900',       high: 'bg-pink-300 border-pink-500 text-pink-900' },
  religious_bias:     { low: 'bg-indigo-100 border-indigo-300 text-indigo-800', medium: 'bg-indigo-200 border-indigo-400 text-indigo-900', high: 'bg-indigo-300 border-indigo-500 text-indigo-900' },
  socioeconomic_bias: { low: 'bg-teal-100 border-teal-300 text-teal-800',       medium: 'bg-teal-200 border-teal-400 text-teal-900',       high: 'bg-teal-300 border-teal-500 text-teal-900' },
  racial_ethnic_bias: { low: 'bg-cyan-100 border-cyan-300 text-cyan-800',       medium: 'bg-cyan-200 border-cyan-400 text-cyan-900',       high: 'bg-cyan-300 border-cyan-500 text-cyan-900' },
  caste_bias:         { low: 'bg-amber-100 border-amber-300 text-amber-800',     medium: 'bg-amber-200 border-amber-400 text-amber-900',     high: 'bg-amber-300 border-amber-500 text-amber-900' },
  body_bias:          { low: 'bg-rose-100 border-rose-300 text-rose-800',       medium: 'bg-rose-200 border-rose-400 text-rose-900',       high: 'bg-rose-300 border-rose-500 text-rose-900' },
  nationality_bias:   { low: 'bg-sky-100 border-sky-300 text-sky-800',          medium: 'bg-sky-200 border-sky-400 text-sky-900',          high: 'bg-sky-300 border-sky-500 text-sky-900' },
  language_dominance: { low: 'bg-purple-100 border-purple-300 text-purple-800', medium: 'bg-purple-200 border-purple-400 text-purple-900', high: 'bg-purple-300 border-purple-500 text-purple-900' },
}
const getBiasColor = (type, severity) =>
  BIAS_COLORS[type]?.[severity] || 'bg-gray-100 border-gray-300 text-gray-800'

// ── Infer bias category from phrase ──────────────────────────
function inferBiasType(phrase) {
  const p = phrase.toLowerCase()
  if (BIAS_TYPE_OVERRIDES[p]) return BIAS_TYPE_OVERRIDES[p]
  if (['मर्दानगी','लड़के रोते','मर्द को दर्द','ladkon ko kabhi rona','show mardangi'].some(s => p.includes(s))) return 'stereotype'
  if (['औरतों','पुरुषों','पराया','पति','लिंग','नारी','ladkiyon','auratein','mardon','mulgi','mulga','female employees','men na','women leadership','women pressure'].some(s => p.includes(s))) return 'gender_bias'
  if (['native english','regional accent','language barrier','english speakers only'].some(s => p.includes(s))) return 'language_dominance'
  if (['मर्दानगी','औरतों','पराया','पति','लिंग','नारी','लड़के','मर्द'].some(s => p.includes(s))) return 'language_dominance'
  if (['caste','tribal','untouchable','dalit','scheduled caste','lower caste','upper caste','low-caste','high-caste','backward caste','backward communities','primitive tribes','uncivilized','savages','need modern values','fit our upper caste','may not fit our'].some(s => p.includes(s))) return 'caste_bias'
  if (['wheelchair','suffers from','afflicted','mentally ill','special needs','handicapped','crazy','insane','lame','victim of'].some(s => p.includes(s))) return 'disability_bias'
  if (['muslim','christian','religious fanatic','bible thumper'].some(s => p.includes(s))) return 'religious_bias'
  if (['poor people','welfare','silver spoon','trailer trash','uneducated masses'].some(s => p.includes(s))) return 'socioeconomic_bias'
  if (['millennial','boomer','too old','over the hill','past their prime','ok boomer','senior moment','retire already','digital native','digital immigrant','young and inexperienced','too young'].some(s => p.includes(s))) return 'age_bias'
  if (['asian','african american','hispanic','native english','model minority','exotic','articulate','one of the good ones','where are you really from'].some(s => p.includes(s))) return 'racial_ethnic_bias'
  if (['stubborn','bossy','hysterical','nagging','ditzy','catfight','tomboy','surprisingly sharp','somehow managed','juggling family'].some(s => p.includes(s))) return 'stereotype'
  return 'gender_bias'
}

// ── Real-time dictionary scan ─────────────────────────────────
function detectIssues(text) {
  if (!text.trim()) return []
  const claimed = new Uint8Array(text.length)
  const issues = []
  SORTED_PHRASES.forEach(phrase => {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      const start = match.index
      const end = start + match[0].length
      if (claimed.slice(start, end).some(v => v === 1)) continue
      for (let i = start; i < end; i++) claimed[i] = 1
      const rep = BIAS_REPLACEMENTS[phrase]
      const matchedText = match[0]
      const suggestion = matchedText[0] === matchedText[0].toUpperCase() && matchedText[0] !== matchedText[0].toLowerCase()
        ? rep[0].toUpperCase() + rep.slice(1) : rep
      issues.push({ text: matchedText, phrase, suggestion, start, end, type: inferBiasType(phrase), severity: phrase.split(' ').length > 3 ? 'high' : 'medium' })
    }
  })
  return issues.sort((a, b) => a.start - b.start)
}

// ── Build highlight parts for rendered text ───────────────────
function buildHighlightParts(text, spans) {
  if (!text) return []
  if (!spans || spans.length === 0) return [{ text, isHighlighted: false }]
  const claimed = new Uint8Array(text.length)
  const clean = []
  for (const span of spans) {
    const s = span.start ?? 0; const e = span.end ?? 0
    if (s < 0 || e > text.length || s >= e) continue
    if (claimed.slice(s, e).some(v => v === 1)) continue
    for (let i = s; i < e; i++) claimed[i] = 1
    clean.push(span)
  }
  clean.sort((a, b) => a.start - b.start)
  const parts = []; let cursor = 0
  for (const span of clean) {
    if (span.start > cursor) parts.push({ text: text.slice(cursor, span.start), isHighlighted: false })
    parts.push({ text: text.slice(span.start, span.end), isHighlighted: true, biasType: span.bias_type || span.type, severity: span.severity, suggestion: span.suggestion })
    cursor = span.end
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), isHighlighted: false })
  return parts
}

// ── Normalise backend spans ───────────────────────────────────
function normaliseBackendSpans(backendSpans, originalText) {
  if (!backendSpans || !originalText) return []
  const result = []; const lowerText = originalText.toLowerCase()
  const claimed = new Uint8Array(originalText.length)
  for (const s of backendSpans) {
    const spanText = (s.text || '').trim()
    if (!spanText) continue
    let start = s.span?.[0] ?? -1; let end = s.span?.[1] ?? -1
    if (start >= 0 && end > start && end <= originalText.length && originalText.slice(start, end).toLowerCase() === spanText.toLowerCase()) {
      // valid indices
    } else {
      const lowerSpan = spanText.toLowerCase(); let searchFrom = 0; start = -1
      while (searchFrom < lowerText.length) {
        const idx = lowerText.indexOf(lowerSpan, searchFrom)
        if (idx === -1) break
        if (!claimed.slice(idx, idx + spanText.length).some(v => v === 1)) { start = idx; end = idx + spanText.length; break }
        searchFrom = idx + 1
      }
      if (start === -1) continue
    }
    for (let i = start; i < end; i++) claimed[i] = 1
    const actualText = originalText.slice(start, end)
    result.push({
      text: actualText,
      bias_type: s.bias_type || 'gender_bias',
      severity: s.severity || 'medium',
      suggestion: sanitizeSuggestion(actualText, s.suggestion, s.bias_type || 'gender_bias'),
      start,
      end,
    })
  }
  return result
}

// ── Build alternative text from spans ────────────────────────
function neutralReplacement(original, biasType = '') {
  const text = (original || '').trim()
  const lower = text.toLowerCase()

  let match = lower.match(/^all\s+[\w\s-]+\s+are\s+(.+)/)
  if (match) {
    const predicate = match[1].replace(/[.!?]+$/, '').trim()
    if (['dangerous', 'violent', 'bad', 'lazy'].includes(predicate)) return 'some individuals may cause harm'
    return `some individuals may be ${predicate}`
  }

  match = lower.match(/^typical\s+\S+\s+(.+)/)
  if (match) {
    const behavior = match[1].replace(/[.!?]+$/, '').trim()
    if (/^(force|push|impose)\s+/.test(behavior)) return `some individuals may ${behavior}`
    return `some individuals ${behavior}`
  }

  const phraseMap = {
    'native english speakers only': 'people with the required language proficiency',
    'native english speakers': 'people with the required language proficiency',
    'where are you really from': 'what is your background',
    'you speak english so well': 'you communicate effectively',
    'one of the good ones': 'a valued colleague',
    'foreign workers': 'international workers',
    'immigrants take jobs': 'labor market changes have many causes',
    'tribal communities are backward': 'tribal communities have diverse cultures and strengths',
    'fat people are lazy': 'people have different body types and circumstances',
    'poor people are lazy': 'people in poverty face systemic barriers',
  }
  if (phraseMap[lower]) return phraseMap[lower]

  const defaults = {
    gender_bias: 'people',
    religious_bias: 'some individuals',
    racial_ethnic_bias: 'individuals',
    caste_bias: 'communities',
    body_bias: 'people',
    nationality_bias: 'people',
    language_dominance: 'people with the required language proficiency',
    socioeconomic_bias: 'people',
    age_bias: 'people',
    disability_bias: 'people',
    stereotype: 'individuals',
  }
  return defaults[biasType] || 'people'
}

function sanitizeSuggestion(original, suggestion, biasType) {
  const value = (suggestion || '').trim()
  if (!value) return neutralReplacement(original, biasType)
  const lower = value.toLowerCase()
  const startsInstruction = [
    'avoid ', 'use ', 'describe ', 'replace ', 'rephrase ', 'rewrite ',
    'do not ', "don't ", 'focus on ', 'say ', 'state ',
    'it is inaccurate ', 'it is inaccurate to ', 'it is misleading ',
    'it is misleading to ', 'this is ',
  ].some(prefix => lower.startsWith(prefix))
  const tooLong = value.length > Math.max(48, (original || '').length * 2)
  const multiSentence = (value.match(/[.!?]/g) || []).length > 1
  const repeatsReligiousGroup = biasType === 'religious_bias' && (
    ['muslim', 'christian', 'jewish', 'hindu', 'buddhist', 'sikh'].some(group => lower.includes(group))
  )
  if (startsInstruction || tooLong || multiSentence || repeatsReligiousGroup) return neutralReplacement(original, biasType)
  return value
}

function buildAlternativeText(originalText, spans) {
  if (!originalText || !spans || spans.length === 0) return originalText
  const sorted = [...spans].filter(s => s.suggestion && s.start >= 0 && s.end > s.start).sort((a, b) => b.start - a.start)
  let result = originalText
  for (const span of sorted) {
    const orig = result.slice(span.start, span.end)
    let rep = sanitizeSuggestion(orig, span.suggestion, span.bias_type || span.type)
    if (orig && orig[0] === orig[0].toUpperCase() && orig[0] !== orig[0].toLowerCase()) rep = rep[0].toUpperCase() + rep.slice(1)
    result = result.slice(0, span.start) + rep + result.slice(span.end)
  }
  return result
    .replace(/\b(and|or|but)\s+([A-Z])/g, (_, conj, letter) => `${conj} ${letter.toLowerCase()}`)
    .replace(/\ban\s+([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])/g, 'a $1')
}

// ── Detect locally for fallback mock result ───────────────────
function detectBiasSpansLocally(text) {
  if (!text) return []
  const claimed = new Uint8Array(text.length); const spans = []
  SORTED_PHRASES.forEach(phrase => {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      const start = match.index; const end = start + match[0].length
      if (claimed.slice(start, end).some(v => v === 1)) continue
      for (let i = start; i < end; i++) claimed[i] = 1
      const rep = BIAS_REPLACEMENTS[phrase]; const mt = match[0]
      const suggestion = mt[0] === mt[0].toUpperCase() && mt[0] !== mt[0].toLowerCase() ? rep[0].toUpperCase() + rep.slice(1) : rep
      spans.push({ text: mt, phrase, suggestion, bias_type: inferBiasType(phrase), severity: phrase.split(' ').length > 2 ? 'high' : 'medium', start, end })
    }
  })
  return spans.sort((a, b) => a.start - b.start)
}

// ─────────────────────────────────────────────────────────────
// COMBINED COMPONENT
// ─────────────────────────────────────────────────────────────
function ContentAnalyzer() {
  // ── Pipeline state ────────────────────────────────────────
  const [currentStep, setCurrentStep]         = useState(1)
  const [language, setLanguage]               = useState('en')
  const [contentType, setContentType]         = useState('article')
  const [isAnalyzing, setIsAnalyzing]         = useState(false)
  const [analysisResult, setAnalysisResult]   = useState(null)
  const [preprocessing, setPreprocessing]     = useState(null)
  const [alternativeText, setAlternativeText] = useState('')
  const [aiSpans, setAiSpans]                 = useState([])
  const [copyConfirmed, setCopyConfirmed]     = useState(false)

  // ── Input state ───────────────────────────────────────────
  const [content, setContent]                 = useState('')
  const [inputMode, setInputMode]             = useState('text')
  const [urlInput, setUrlInput]               = useState('')
  const [isFetchingUrl, setIsFetchingUrl]     = useState(false)
  const [urlFetchError, setUrlFetchError]     = useState('')
  const [uploadedFileName, setUploadedFileName] = useState('')

  // ── Live editor state ─────────────────────────────────────
  const [liveIssues, setLiveIssues]           = useState([])
  const [selectedIssue, setSelectedIssue]     = useState(null)
  const [liveStats, setLiveStats]             = useState({ words: 0, chars: 0, biasScore: 0 })
  const editorRef                             = useRef(null)
  const debounceRef                           = useRef(null)
  const fileInputRef                          = useRef(null)

  const steps = [
    { num: 1, name: 'Content Input',    icon: FileText },
    { num: 2, name: 'Preprocessing',    icon: Hash },
    { num: 3, name: 'Bias Detection',   icon: AlertTriangle },
    { num: 4, name: 'XAI Score',        icon: CheckCircle },
    { num: 5, name: 'Fairness Metrics', icon: Globe },
    { num: 6, name: 'Mitigation',       icon: Zap },
    { num: 7, name: 'Review Queue',     icon: Tag },
  ]

  // ── Live detection — debounced 250ms ─────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const found = detectIssues(content)
      setLiveIssues(found)
      setLiveStats({
        words: content.trim() ? content.trim().split(/\s+/).length : 0,
        chars: content.length,
        biasScore: parseFloat(Math.min(1, found.length * 0.12).toFixed(2)),
      })
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [content])

  // ── Apply a single fix (re-detection happens via useEffect) ─
  const applyFix = useCallback((issue) => {
    setContent(prev => prev.slice(0, issue.start) + issue.suggestion + prev.slice(issue.end))
    setSelectedIssue(null)
  }, [])

  // ── Apply all fixes descending so indices stay valid ──────
  const applyFixAll = useCallback(() => {
    const sorted = [...liveIssues].sort((a, b) => b.start - a.start)
    setContent(prev => {
      let result = prev
      sorted.forEach(issue => { result = result.slice(0, issue.start) + issue.suggestion + result.slice(issue.end) })
      return result
    })
    setSelectedIssue(null)
  }, [liveIssues])

  // ── Highlight issue in textarea ───────────────────────────
  const highlightIssue = (issue) => {
    setSelectedIssue(issue)
    if (editorRef.current) {
      const el = editorRef.current
      el.focus()
      const lineHeight = 20
      const lines = el.value.slice(0, issue.start).split('\n').length
      el.scrollTop = Math.max(0, (lines - 3) * lineHeight)
      el.setSelectionRange(issue.start, issue.end)
    }
  }

  // ── URL fetch ─────────────────────────────────────────────
  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return
    setIsFetchingUrl(true)
    setUrlFetchError('')
    try {
      const data = await apiFetchUrl(urlInput.trim())
      setContent(data.text)
      setInputMode('text')
      setUrlInput('')
      setUrlFetchError('')
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('403') || msg.includes('401')) {
        setUrlFetchError('This site blocks external access (403). Try a news article, blog post, or paste the text directly.')
      } else if (msg.includes('404')) {
        setUrlFetchError('Page not found (404). Check the URL and try again.')
      } else if (msg.includes('timeout') || msg.includes('504')) {
        setUrlFetchError('Request timed out. The site took too long to respond.')
      } else if (msg.includes('JavaScript') || msg.includes('422')) {
        setUrlFetchError('This page requires JavaScript to load. Please copy and paste the text directly.')
      } else {
        setUrlFetchError(`Could not fetch URL: ${msg}`)
      }
    } finally {
      setIsFetchingUrl(false)
    }
  }

  // ── File upload ───────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => { setContent((ev.target.result || '').slice(0, 5000)); setInputMode('text') }
    reader.onerror = () => alert('Failed to read file')
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  // ── AI analysis ───────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!content.trim()) { alert('Please enter content to analyze'); return }
    setIsAnalyzing(true)
    setCurrentStep(2)
    try {
      // Step 2 — Preprocessing
      const words = content.trim().split(/\s+/)
      const commonEntities = ['CEO','company','engineer','manager','director','president','team','organization']
      setPreprocessing({
        detectedLanguage: language,
        wordCount: words.length,
        tokenCount: Math.floor(words.length * 1.3),
        entitiesFound: commonEntities.filter(e => content.toLowerCase().includes(e.toLowerCase())).slice(0, 5),
      })
      await new Promise(r => setTimeout(r, 500))
      setCurrentStep(3)

      let result = null
      let spans = []
      let altText = content

      // Step 3 — Bias Detection (AI or local fallback)
      try {
        result = await analyzeText(content, { language, content_type: contentType })
        if (result.bias_detection?.language_detected) {
          setPreprocessing(prev => ({ ...prev, detectedLanguage: result.bias_detection.language_detected }))
        }
        const rawSpans = result.bias_detection?.highlighted_text || []
        spans = normaliseBackendSpans(rawSpans, content)
        const backendAlt = result.bias_detection?.alternative_text
        altText = (backendAlt && backendAlt !== content) ? backendAlt : (spans.length > 0 ? buildAlternativeText(content, spans) : content)
        saveAnalysis({ ...result, content })
      } catch (backendErr) {
        console.warn('⚠️ Backend unavailable — using local detection:', backendErr)
        spans = detectBiasSpansLocally(content)
        altText = buildAlternativeText(content, spans)
        const mockScore = Math.min(0.95, spans.length * 0.12 + 0.1)
        result = {
          analysis_id: 'local-' + Date.now(),
          bias_detection: {
            bias_scores: { overall: mockScore, gender_bias: parseFloat((mockScore * 0.9).toFixed(2)), stereotype: parseFloat((mockScore * 0.7).toFixed(2)), age_bias: 0, disability_bias: 0, religious_bias: 0, socioeconomic_bias: 0, language_dominance: parseFloat((mockScore * 0.3).toFixed(2)) },
            explanations: {
              gender_bias: spans.filter(s => s.bias_type === 'gender_bias').length > 0 ? `${spans.filter(s => s.bias_type === 'gender_bias').length} gendered term(s) detected.` : 'No explicit gender bias detected.',
              stereotype: spans.filter(s => s.bias_type === 'stereotype').length > 0 ? `${spans.filter(s => s.bias_type === 'stereotype').length} stereotypical pattern(s) found.` : 'No stereotypes detected.',
              language_dominance: `Language: ${language.toUpperCase()}`,
            },
            highlighted_text: spans, language_detected: language, alternative_text: altText,
          },
          fairness_metrics: { risk_level: mockScore > 0.6 ? 'high' : mockScore > 0.3 ? 'medium' : 'low', fairness_score: parseFloat((1 - mockScore).toFixed(2)), recommendations: [] },
          storage_location: 'local', status: 'completed (offline)',
        }
        saveAnalysis({ ...result, content })
      }

      setAiSpans(spans)
      setAlternativeText(altText)
      setAnalysisResult(result)

      // Step 4 — XAI Score
      await new Promise(r => setTimeout(r, 300))
      setCurrentStep(4)

      // Step 5 — Fairness Metrics
      await new Promise(r => setTimeout(r, 300))
      setCurrentStep(5)

      // Step 6 — Mitigation
      await new Promise(r => setTimeout(r, 300))
      setCurrentStep(6)

      // Step 7 — Review Queue
      await new Promise(r => setTimeout(r, 300))
      setCurrentStep(7)

    } catch (error) {
      console.error('Analysis failed:', error)
      setCurrentStep(1)
      alert('Something went wrong. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const copyAlternativeText = () => {
    navigator.clipboard.writeText(alternativeText).then(() => {
      setCopyConfirmed(true)
      setTimeout(() => setCopyConfirmed(false), 2000)
    })
  }

  const resetAnalysis = () => {
    setCurrentStep(1)
    setContent('')
    setAnalysisResult(null)
    setPreprocessing(null)
    setAlternativeText('')
    setAiSpans([])
    setInputMode('text')
    setUrlInput('')
    setUploadedFileName('')
    setSelectedIssue(null)
  }

  // Which spans to show in the highlighted view — AI spans after analysis, else live issues
  const displaySpans = analysisResult ? aiSpans : liveIssues
  const scoreColor = liveStats.biasScore > 0.6 ? 'text-red-600' : liveStats.biasScore > 0.3 ? 'text-yellow-600' : 'text-green-600'

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Content Analyzer</h1>
            <p className="text-gray-500 text-sm">AI-powered bias detection with real-time live editing</p>
          </div>
          {currentStep > 1 && (
            <button onClick={resetAnalysis} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center gap-2 text-sm">
              <RotateCcw className="w-4 h-4" /> New Analysis
            </button>
          )}
        </div>

        {/* Pipeline Steps */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              return (
                <div key={step.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 ${currentStep >= step.num ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-500'}`}>
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <p className={`text-xs mt-1.5 font-semibold ${currentStep >= step.num ? 'text-blue-600' : 'text-gray-400'}`}>Step {step.num}</p>
                    <p className="text-xs text-gray-500">{step.name}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-3 rounded transition-all duration-500 ${currentStep > step.num ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Step 1: Combined Input + Live Editor ── */}
        {currentStep === 1 && (
          <>
            {/* Live stats bar */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Words',        value: liveStats.words,                    color: 'text-gray-900' },
                { label: 'Characters',   value: liveStats.chars,                    color: 'text-gray-900' },
                { label: 'Live Issues',  value: liveIssues.length,                  color: 'text-red-600' },
                { label: 'Bias Score',   value: liveStats.biasScore.toFixed(2),     color: scoreColor },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Main two-column layout: editor + issues panel */}
            <div className="grid grid-cols-3 gap-6">

              {/* Left: Input controls + editor (2/3 width) */}
              <div className="col-span-2 space-y-4">

                {/* Input mode selector */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <button onClick={() => setInputMode('text')} className={`p-3 border-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${inputMode === 'text' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-600'}`}>
                      <FileText className="w-4 h-4" /> Paste Text
                    </button>
                    <button onClick={() => setInputMode('url')} className={`p-3 border-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${inputMode === 'url' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-600'}`}>
                      <LinkIcon className="w-4 h-4" /> Paste URL
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-3 border-2 border-gray-200 hover:border-blue-300 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-700 transition-all flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" /> Upload File
                    </button>
                    <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,.html,.xml" className="hidden" onChange={handleFileUpload} />
                  </div>

                  {/* Uploaded file badge */}
                  {uploadedFileName && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 w-fit">
                      <CheckCircle className="w-4 h-4" />
                      <span>Loaded: <strong>{uploadedFileName}</strong></span>
                      <button onClick={() => { setUploadedFileName(''); setContent('') }} className="ml-1 text-green-600 hover:text-green-800"><X className="w-4 h-4" /></button>
                    </div>
                  )}

                  {/* URL input */}
                  {inputMode === 'url' && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-600" /> Enter article / webpage URL
                      </label>
                      <div className="flex gap-2">
                        <input type="url" className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="https://example.com/article" value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFetchUrl()} />
                        <button onClick={handleFetchUrl} disabled={isFetchingUrl || !urlInput.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                          {isFetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                          {isFetchingUrl ? 'Fetching…' : 'Fetch'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Text will be extracted and loaded into the editor below.</p>
                      {urlFetchError && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-red-700">{urlFetchError}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Textarea editor */}
                  <textarea
                    ref={editorRef}
                    className="w-full h-72 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
                    placeholder="Type, paste, or load content here. Bias is detected in real-time as you type…"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                  />
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                    Issues are detected live. Click any issue in the panel to jump to it, then apply the fix.
                  </div>
                </div>

                {/* Language + content type + analyze button */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                  <div className="grid grid-cols-2 gap-4 mb-4">
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
                  <button onClick={handleAnalyze} disabled={isAnalyzing || !content.trim()} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2">
                    {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing…</> : <><Play className="w-5 h-5" /> Run Full AI Analysis</>}
                  </button>
                </div>
              </div>

              {/* Right: Live issues panel (1/3 width) */}
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex flex-col" style={{ maxHeight: '680px' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Live Issues ({liveIssues.length})
                  </h2>
                  {liveIssues.length > 0 && (
                    <button onClick={applyFixAll} className="px-3 py-1.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-1.5 text-xs">
                      <RefreshCw className="w-3.5 h-3.5" /> Fix All
                    </button>
                  )}
                </div>

                {liveIssues.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
                    <p className="text-gray-600 font-medium text-sm">No bias detected</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {content.trim() ? 'Your text looks great!' : 'Start typing to see live detection'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                    {liveIssues.map((issue, idx) => {
                      const colors = TYPE_COLORS[issue.type] || TYPE_COLORS.gender_bias
                      const isSelected = selectedIssue === issue
                      return (
                        <div key={idx} className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${colors.bg} ${isSelected ? 'ring-2 ring-blue-500' : ''}`} onClick={() => highlightIssue(issue)}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-semibold uppercase ${colors.text}`}>{colors.label}</span>
                            <span className="text-xs">{issue.severity === 'high' ? '🔴' : '🟡'}</span>
                          </div>
                          <p className={`text-sm font-medium line-through ${colors.text}`}>{issue.text}</p>
                          <p className="text-sm font-semibold text-gray-700 mt-0.5">→ {issue.suggestion}</p>
                          <button onClick={e => { e.stopPropagation(); applyFix(issue) }} className="mt-2 w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium hover:bg-gray-50 transition-colors text-gray-700">
                            Apply Fix
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Category legend */}
                {liveIssues.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Categories:</p>
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(liveIssues.map(i => i.type))].map(type => {
                        const c = TYPE_COLORS[type] || TYPE_COLORS.gender_bias
                        return <span key={type} className={`px-2 py-0.5 rounded-full text-xs border ${c.bg} ${c.text}`}>{c.label}</span>
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Preprocessing ── */}
        {currentStep >= 2 && preprocessing && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4">Step 2: Preprocessing</h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: Languages, label: 'Detected Language', value: preprocessing.detectedLanguage.toUpperCase(), color: 'blue' },
                { icon: FileType,  label: 'Word Count',        value: preprocessing.wordCount,                      color: 'green' },
                { icon: Hash,      label: 'Tokens',            value: preprocessing.tokenCount,                     color: 'purple' },
                { icon: Tag,       label: 'Entities Found',    value: preprocessing.entitiesFound.length,           color: 'orange' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className={`p-4 bg-${color}-50 rounded-lg border border-${color}-200`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 text-${color}-600`} />
                    <p className="text-sm text-gray-600 font-medium">{label}</p>
                  </div>
                  <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Steps 3–7: AI Results ── */}
        {currentStep >= 3 && analysisResult && (
          <>
            {/* Step 3: Bias Detection */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4">Step 3: Bias Detection</h2>

              {/* Two-column: original highlighted + full alternative */}
              <div className="grid grid-cols-2 gap-6 mb-4">
                {/* Original with highlights */}
                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                    🔴 Original Text (biased terms highlighted)
                  </h3>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200 leading-relaxed text-sm text-gray-700 min-h-[120px]">
                    {buildHighlightParts(content, displaySpans).map((part, idx) =>
                      part.isHighlighted ? (
                        <span key={idx} className={`px-1 py-0.5 rounded border-2 cursor-help font-medium ${getBiasColor(part.biasType, part.severity)}`}
                          title={`${(part.biasType || '').replace(/_/g, ' ')} (${part.severity})${part.suggestion ? ` → ${part.suggestion}` : ''}`}>
                          {part.text}
                        </span>
                      ) : <span key={idx}>{part.text}</span>
                    )}
                  </div>
                </div>

                {/* Full bias-free rewrite */}
                <div>
                  <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
                    🟢 Bias-Free Rewrite (full text)
                  </h3>
                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300 leading-relaxed text-sm text-gray-800 min-h-[120px] relative">
                    {alternativeText && alternativeText !== content ? (
                      <>
                        <p className="pr-16">{alternativeText}</p>
                        <button onClick={copyAlternativeText}
                          className={`absolute top-3 right-3 px-2.5 py-1 text-xs rounded flex items-center gap-1.5 transition-colors font-medium ${copyConfirmed ? 'bg-green-700 text-white' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                          <Copy className="w-3.5 h-3.5" />
                          {copyConfirmed ? 'Copied!' : 'Copy'}
                        </button>
                      </>
                    ) : (
                      <p className="text-gray-400 italic text-xs">No biased terms found — original text is already bias-free.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Word-level replacements legend */}
              {displaySpans.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-600 mb-2">Word-level replacements:</h3>
                  <div className="flex flex-wrap gap-2">
                    {displaySpans
                      .filter((span, idx, arr) => arr.findIndex(s => (s.text || '').toLowerCase() === (span.text || '').toLowerCase()) === idx)
                      .map((span, idx) => (
                        <span key={idx} className={`px-3 py-1 rounded-full text-xs border font-medium ${getBiasColor(span.bias_type || span.type, span.severity)}`}>
                          <span className="line-through opacity-70">{span.text}</span>
                          <span className="mx-1">→</span>
                          <span>{span.suggestion || '(review needed)'}</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {displaySpans.length === 0 && (
                <p className="text-sm text-green-600 font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> No biased terms detected in this text.
                </p>
              )}
            </div>

            {/* Step 4: XAI Score */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4">Step 4: Explainable Bias Score (XAI)</h2>

              <div className="text-center mb-6">
                <p className={`text-6xl font-bold ${
                  (analysisResult.bias_detection?.bias_scores?.overall || 0) > 0.7 ? 'text-red-600' :
                  (analysisResult.bias_detection?.bias_scores?.overall || 0) > 0.4 ? 'text-orange-500' : 'text-green-600'
                }`}>
                  {(analysisResult.bias_detection?.bias_scores?.overall || 0).toFixed(2)}
                </p>
                <p className="text-gray-600 mt-2 font-medium">Overall Bias Score</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(analysisResult.bias_detection?.bias_scores?.overall || 0) > 0.7 ? '🔴 High Bias' :
                   (analysisResult.bias_detection?.bias_scores?.overall || 0) > 0.4 ? '🟡 Medium Bias' : '🟢 Low Bias'}
                </p>
              </div>

              {/* Per-category bars */}
              <div className="space-y-3 mb-6">
                {Object.entries(analysisResult.bias_detection?.bias_scores || {}).map(([key, value]) =>
                  key !== 'overall' ? (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-gray-700">{key.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-gray-900">{(value ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${(value ?? 0) > 0.6 ? 'bg-red-500' : (value ?? 0) > 0.3 ? 'bg-orange-400' : 'bg-green-500'}`}
                          style={{ width: `${(value ?? 0) * 100}%` }} />
                      </div>
                    </div>
                  ) : null
                )}
              </div>

              {/* AI Explanation */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">📖 AI Explanation:</h3>
                {Object.entries(analysisResult.bias_detection?.explanations || {}).map(([key, explanation]) => (
                  <p key={key} className="text-sm text-blue-800 mb-1.5">
                    <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong> {explanation}
                  </p>
                ))}
              </div>
            </div>

            {/* ── Step 5: Fairness Metrics ── */}
            {currentStep >= 5 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
                <h2 className="text-xl font-semibold mb-4">Step 5: Fairness Metrics</h2>
                <div className="grid grid-cols-3 gap-4">
                  {/* Fairness Score */}
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 text-center">
                    <p className="text-sm text-gray-600 mb-1 font-medium">Fairness Score</p>
                    <p className={`text-4xl font-bold ${
                      (analysisResult.fairness_metrics?.fairness_score ?? 0) >= 0.7 ? 'text-green-600' :
                      (analysisResult.fairness_metrics?.fairness_score ?? 0) >= 0.4 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round((analysisResult.fairness_metrics?.fairness_score ?? 0) * 100)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Higher = fairer</p>
                  </div>
                  {/* Risk Level */}
                  <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 text-center">
                    <p className="text-sm text-gray-600 mb-1 font-medium">Risk Level</p>
                    <p className={`text-3xl font-bold capitalize ${
                      analysisResult.fairness_metrics?.risk_level === 'high' ? 'text-red-600' :
                      analysisResult.fairness_metrics?.risk_level === 'medium' ? 'text-orange-500' : 'text-green-600'
                    }`}>
                      {analysisResult.fairness_metrics?.risk_level || 'low'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {analysisResult.fairness_metrics?.risk_level === 'high' ? '🔴 Requires review' :
                       analysisResult.fairness_metrics?.risk_level === 'medium' ? '🟡 Moderate concern' : '🟢 Acceptable'}
                    </p>
                  </div>
                  {/* Bias Span Count */}
                  <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 text-center">
                    <p className="text-sm text-gray-600 mb-1 font-medium">Biased Terms</p>
                    <p className="text-4xl font-bold text-purple-600">{displaySpans.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Flagged spans</p>
                  </div>
                </div>
                {/* Recommendations */}
                {(analysisResult.fairness_metrics?.recommendations || []).length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">💡 Recommendations:</p>
                    <ul className="space-y-1">
                      {analysisResult.fairness_metrics.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-yellow-700 flex items-start gap-2">
                          <span className="mt-0.5">•</span>{rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 6: Mitigation ── */}
            {currentStep >= 6 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
                <h2 className="text-xl font-semibold mb-4">Step 6: Bias Mitigation</h2>
                <div className="grid grid-cols-2 gap-6">
                  {/* Before */}
                  <div>
                    <h3 className="text-sm font-semibold text-red-700 mb-2">Before Mitigation</h3>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-gray-700 leading-relaxed">
                      {buildHighlightParts(content, displaySpans).map((part, idx) =>
                        part.isHighlighted ? (
                          <span key={idx} className="bg-red-200 border-b-2 border-red-500 font-medium px-0.5 rounded">{part.text}</span>
                        ) : <span key={idx}>{part.text}</span>
                      )}
                    </div>
                    <p className="text-xs text-red-600 mt-2 font-medium">
                      {displaySpans.length} biased term{displaySpans.length !== 1 ? 's' : ''} · Bias score: {(analysisResult.bias_detection?.bias_scores?.overall || 0).toFixed(2)}
                    </p>
                  </div>
                  {/* After */}
                  <div>
                    <h3 className="text-sm font-semibold text-green-700 mb-2">After Mitigation</h3>
                    <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg text-sm text-gray-800 leading-relaxed">
                      {alternativeText && alternativeText !== content ? alternativeText : (
                        <span className="text-gray-400 italic">No changes needed — text is already bias-free.</span>
                      )}
                    </div>
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      {displaySpans.length > 0 ? `${displaySpans.length} term${displaySpans.length !== 1 ? 's' : ''} replaced · Estimated bias score: ~0.05` : 'No bias detected'}
                    </p>
                  </div>
                </div>
                {/* Mitigation summary table */}
                {displaySpans.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Original Term</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Replacement</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Bias Type</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Severity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {displaySpans
                          .filter((s, i, arr) => arr.findIndex(x => (x.text||'').toLowerCase() === (s.text||'').toLowerCase()) === i)
                          .map((span, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-red-700 font-medium line-through">{span.text}</td>
                              <td className="px-4 py-2 text-green-700 font-medium">{span.suggestion || '—'}</td>
                              <td className="px-4 py-2 text-gray-600 capitalize">{(span.bias_type || span.type || '').replace(/_/g, ' ')}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${span.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {span.severity}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 7: Review Queue ── */}
            {currentStep >= 7 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
                <h2 className="text-xl font-semibold mb-4">Step 7: Human Review Queue</h2>
                {(analysisResult.bias_detection?.bias_scores?.overall || 0) > 0.4 ? (
                  <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-800">Flagged for Human Review</p>
                      <p className="text-sm text-red-700 mt-0.5">
                        Bias score {(analysisResult.bias_detection?.bias_scores?.overall || 0).toFixed(2)} exceeds the 0.4 threshold.
                        This article has been added to the Human Review queue.
                      </p>
                    </div>
                    <span className="ml-auto shrink-0 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                      {analysisResult.fairness_metrics?.risk_level?.toUpperCase() || 'HIGH'} RISK
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">Cleared — No Review Required</p>
                      <p className="text-sm text-green-700 mt-0.5">
                        Bias score {(analysisResult.bias_detection?.bias_scores?.overall || 0).toFixed(2)} is within acceptable range. Content is ready for publication.
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500">Analysis ID</p>
                    <p className="text-sm font-mono text-gray-700 truncate">{analysisResult.analysis_id}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500">Storage</p>
                    <p className="text-sm font-medium text-gray-700">{analysisResult.storage_location || 'local'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="text-sm font-medium text-green-600">{analysisResult.status || 'completed'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={resetAnalysis} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md flex items-center justify-center gap-2">
                    <RotateCcw className="w-5 h-5" /> Analyze New Text
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(analysisResult, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url; a.download = `analysis-${analysisResult.analysis_id}.json`
                      a.click(); URL.revokeObjectURL(url)
                    }}
                    className="px-6 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" /> Export JSON
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

export default ContentAnalyzer
