import { useState, useEffect } from 'react'
import { getAnalyses } from '../utils/analysisStorage'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Scale,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'

function FairRanking() {
  const [analyses, setAnalyses] = useState([])

  useEffect(() => {
    setAnalyses(getAnalyses())
  }, [])

  // ── Build ranked lists ────────────────────────────────────────────────────
  // "Before" = sorted purely by relevance (1 - bias_score), bias ignored
  const withScores = analyses.map((a, index) => {
    const raw = (a.content || '').trim()
    const truncated = raw.length > 70
    return {
      id: a.id,
      title: raw.slice(0, 70) || 'Untitled',
      titleSuffix: truncated ? '…' : '',
      biasScore: parseFloat((a.bias_score ?? 0).toFixed(2)),
      relevanceScore: parseFloat((1 - (a.bias_score ?? 0)).toFixed(2)),
      originalIndex: index,
    }
  })

  const beforeRanking = [...withScores]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .map((item, idx) => ({ ...item, beforeRank: idx + 1 }))

  // "After" = relevance penalised by bias (high-bias articles drop)
  // Fair Score = relevance × (1 − bias × 0.8)
  const afterRanking = beforeRanking
    .map(item => ({
      ...item,
      fairScore: parseFloat((item.relevanceScore * (1 - item.biasScore * 0.8)).toFixed(2)),
    }))
    .sort((a, b) => b.fairScore - a.fairScore)
    .map((item, idx) => ({
      ...item,
      afterRank: idx + 1,
      rankChange: item.beforeRank - (idx + 1), // positive = moved UP, negative = moved DOWN
    }))

  // ── Summary stats ─────────────────────────────────────────────────────────
  const movedDown  = afterRanking.filter(i => i.rankChange < 0).length
  const movedUp    = afterRanking.filter(i => i.rankChange > 0).length

  const avgBiasBefore = beforeRanking.length
    ? beforeRanking.reduce((s, i) => s + i.biasScore, 0) / beforeRanking.length
    : 0

  const topHalf = afterRanking.slice(0, Math.ceil(afterRanking.length / 2))
  const avgBiasAfterTop = topHalf.length
    ? topHalf.reduce((s, i) => s + i.biasScore, 0) / topHalf.length
    : 0

  const biasReductionPct = avgBiasBefore > 0
    ? Math.round(((avgBiasBefore - avgBiasAfterTop) / avgBiasBefore) * 100)
    : 0

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getBiasLabel = (score) => {
    if (score > 0.6) return { label: 'High Bias', color: 'bg-red-100 text-red-700 border-red-200' }
    if (score > 0.3) return { label: 'Medium Bias', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
    return { label: 'Low Bias', color: 'bg-green-100 text-green-700 border-green-200' }
  }

  const getRankChangeDisplay = (change) => {
    if (change > 0) return (
      <span className="flex items-center gap-1 text-green-600 font-semibold text-sm bg-green-50 px-2 py-1 rounded-full">
        <TrendingUp className="w-3 h-3" /> +{change} up
      </span>
    )
    if (change < 0) return (
      <span className="flex items-center gap-1 text-red-500 font-semibold text-sm bg-red-50 px-2 py-1 rounded-full">
        <TrendingDown className="w-3 h-3" /> {change} down
      </span>
    )
    return (
      <span className="flex items-center gap-1 text-gray-400 text-sm bg-gray-50 px-2 py-1 rounded-full">
        <Minus className="w-3 h-3" /> same
      </span>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Fair Ranking</h1>
          <p className="text-gray-600 mt-1">
            See how articles are re-ordered when bias is taken into account.
            High-bias articles are pushed down; low-bias articles rise.
          </p>
        </div>

        {/* What this page does — explainer banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 flex gap-4">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 space-y-1">
            <p className="font-semibold">How Fair Ranking works</p>
            <p>
              <strong>Before:</strong> articles are ranked by relevance only (higher relevance = higher rank). Bias is ignored.
            </p>
            <p>
              <strong>After:</strong> a fairness penalty is applied — <code className="bg-blue-100 px-1 rounded">Fair Score = Relevance × (1 − Bias × 0.8)</code>.
              An article with 0.9 bias loses ~72% of its ranking weight. No content is deleted — only re-prioritised.
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Total Articles</p>
            </div>
            <p className="text-3xl font-bold text-blue-600">{afterRanking.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Pushed Down</p>
            </div>
            <p className="text-3xl font-bold text-red-500">{movedDown}</p>
            <p className="text-xs text-gray-400 mt-1">high-bias articles demoted</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Promoted Up</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{movedUp}</p>
            <p className="text-xs text-gray-400 mt-1">low-bias articles boosted</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Bias Reduction</p>
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {biasReductionPct > 0
                ? `${biasReductionPct}%`
                : biasReductionPct < 0
                ? `${biasReductionPct}%`
                : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {biasReductionPct > 0
                ? 'in top-half avg bias'
                : biasReductionPct < 0
                ? 'top-half bias increased'
                : 'no change'}
            </p>
          </div>
        </div>

        {/* Empty state */}
        {afterRanking.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <p className="text-gray-500 text-lg">No analyses yet</p>
            <p className="text-gray-400 text-sm mt-2">Analyze some content first, then come back here to see the ranking comparison.</p>
          </div>
        )}

        {/* Side-by-side comparison */}
        {afterRanking.length > 0 && (
          <div className="grid grid-cols-2 gap-6">

            {/* BEFORE column */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-red-50 px-5 py-4 border-b border-gray-200 flex items-center gap-3">
                <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Before Fair Ranking</h2>
                  <p className="text-xs text-gray-500">Sorted by relevance only — bias ignored</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {beforeRanking.map((item) => {
                  const bias = getBiasLabel(item.biasScore)
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {item.beforeRank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{item.title}{item.titleSuffix}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Relevance score: {item.relevanceScore.toFixed(2)}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border shrink-0 ${bias.color}`}>
                        {bias.label} ({item.biasScore.toFixed(2)})
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* AFTER column */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-green-50 px-5 py-4 border-b border-gray-200 flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">After Fair Ranking</h2>
                  <p className="text-xs text-gray-500">Bias penalised — fairer articles rise</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {afterRanking.map((item) => {
                  const bias = getBiasLabel(item.biasScore)
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {item.afterRank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{item.title}{item.titleSuffix}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Fair score: {item.fairScore.toFixed(2)}
                          <span className="mx-1 text-gray-300">|</span>
                          Was rank #{item.beforeRank}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${bias.color}`}>
                          {bias.label}
                        </span>
                        {getRankChangeDisplay(item.rankChange)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}

        {/* Legend */}
        {afterRanking.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-100 border border-green-300 inline-block"></span> Low Bias (0–0.3) — boosted</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300 inline-block"></span> Medium Bias (0.3–0.6) — slight penalty</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-300 inline-block"></span> High Bias (0.6+) — pushed down</span>
          </div>
        )}

        {/* How it works */}
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Step-by-step: what happens to each article</h3>
          </div>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-gray-800 mb-2">① Bias is scored (0–1)</p>
              <p className="text-gray-600">The AI gives each article a bias score. 0 = no bias, 1 = maximum bias. Scores above 0.6 are flagged as high.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-gray-800 mb-2">② Fair Score is calculated</p>
              <p className="text-gray-600">
                <code className="bg-white border border-gray-200 px-1 rounded text-xs">Fair Score = Relevance × (1 − Bias × 0.8)</code>
                <br />A bias of 0.9 reduces the score by 72%. A bias of 0.1 reduces it by only 8%.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-gray-800 mb-2">③ Articles are re-ordered</p>
              <p className="text-gray-600">Articles are sorted by Fair Score. Biased content drops in rank; fair content rises. Nothing is deleted.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default FairRanking
