import { useState, useEffect, useCallback } from 'react'
import { getAnalyses, exportToCSV, exportToJSON, deleteAnalysis } from '../utils/analysisStorage'
import { 
  Download, 
  FileJson, 
  Trash2, 
  ArrowUpDown,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react'

function BiasScores() {
  const [analyses, setAnalyses] = useState([])
  const [filteredAnalyses, setFilteredAnalyses] = useState([])
  const [filterLanguage, setFilterLanguage] = useState('all')
  const [filterBiasType, setFilterBiasType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState('desc')

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = () => {
    const data = getAnalyses()
    setAnalyses(data)
  }

  const applyFilters = useCallback(() => {
    let filtered = [...analyses]

    // Apply filters
    if (filterLanguage !== 'all') {
      filtered = filtered.filter(a => a.language === filterLanguage)
    }
    if (filterBiasType !== 'all') {
      filtered = filtered.filter(a => a.bias_type === filterBiasType)
    }
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        filtered = filtered.filter(a => !a.reviewed && a.bias_score > 0.4)
      } else if (filterStatus === 'mitigated') {
        filtered = filtered.filter(a => a.mitigated)
      } else if (filterStatus === 'approved') {
        filtered = filtered.filter(a => a.reviewed)
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal
      
      switch (sortBy) {
        case 'timestamp':
          aVal = new Date(a.timestamp)
          bVal = new Date(b.timestamp)
          break
        case 'bias_score':
          aVal = a.bias_score
          bVal = b.bias_score
          break
        case 'language':
          aVal = a.language
          bVal = b.language
          break
        default:
          aVal = a.timestamp
          bVal = b.timestamp
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    setFilteredAnalyses(filtered)
  }, [analyses, filterLanguage, filterBiasType, filterStatus, sortBy, sortOrder])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this analysis?')) {
      deleteAnalysis(id)
      loadAnalyses()
    }
  }

  const getBiasColor = (score) => {
    if (score > 0.7) return 'text-red-600 bg-red-50'
    if (score > 0.4) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const getRiskBadge = (level) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    }
    return colors[level] || colors.low
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Bias Scores</h1>
          <p className="text-gray-600 mt-1">View and manage all analyzed content</p>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Languages</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
                <option value="ta">Tamil</option>
                <option value="bn">Bengali</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bias Type</label>
              <select
                value={filterBiasType}
                onChange={(e) => setFilterBiasType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Types</option>
                <option value="gender_bias">Gender Bias</option>
                <option value="stereotype">Stereotype</option>
                <option value="age_bias">Age Bias</option>
                <option value="disability_bias">Disability Bias</option>
                <option value="religious_bias">Religious Bias</option>
                <option value="socioeconomic_bias">Socioeconomic Bias</option>
                <option value="language_dominance">Language Dominance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Review</option>
                <option value="mitigated">Mitigated</option>
                <option value="approved">Approved</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg"
                >
                  <option value="timestamp">Date</option>
                  <option value="bias_score">Bias Score</option>
                  <option value="language">Language</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
                >
                  <ArrowUpDown className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => exportToCSV(filteredAnalyses)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
              disabled={filteredAnalyses.length === 0}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => exportToJSON(filteredAnalyses)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
              disabled={filteredAnalyses.length === 0}
            >
              <FileJson className="w-4 h-4" />
              Export JSON
            </button>
            <div className="flex-1"></div>
            <span className="text-sm text-gray-600 self-center font-medium">
              Showing {filteredAnalyses.length} of {analyses.length} analyses
            </span>
          </div>
        </div>

        {/* Table */}
        {filteredAnalyses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <p className="text-gray-500 text-lg">No analyses found</p>
            <p className="text-gray-400 text-sm mt-2">Start analyzing content to see results here</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bias Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAnalyses.map((analysis) => (
                    <tr key={analysis.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(analysis.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {analysis.language.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {(analysis.bias_type || 'unknown').replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full font-semibold ${getBiasColor(analysis.bias_score ?? 0)}`}>
                          {(analysis.bias_score ?? 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskBadge(analysis.risk_level)}`}>
                          {analysis.risk_level.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {analysis.reviewed ? (
                          <span className="text-green-600 flex items-center gap-1 font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Reviewed
                          </span>
                        ) : analysis.mitigated ? (
                          <span className="text-blue-600 flex items-center gap-1 font-medium">
                            <Zap className="w-4 h-4" />
                            Mitigated
                          </span>
                        ) : (
                          <span className="text-yellow-600 flex items-center gap-1 font-medium">
                            <Clock className="w-4 h-4" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleDelete(analysis.id)}
                          className="text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BiasScores
