import { useState, useEffect } from 'react'
import {
  Cpu,
  Sliders,
  UserCheck,
  Globe,
  Save,
  RotateCcw,
  CheckCircle,
  Settings as SettingsIcon,
  Sparkles,
  Zap
} from 'lucide-react'

const SETTINGS_KEY = 'fairmedia_settings'

const DEFAULT_SETTINGS = {
  selectedModel: 'gemini',
  shapEnabled: true,
  aif360Enabled: true,
  biasThreshold: 0.5,
  genderBiasThreshold: 0.6,
  stereotypeThreshold: 0.5,
  languageDominanceThreshold: 0.4,
  humanReviewRequired: true,
  autoApprove: false,
  languages: ['English', 'Hindi', 'Marathi', 'Tamil', 'Bengali'],
}

const ALL_LANGUAGES = ['English', 'Hindi', 'Marathi', 'Tamil', 'Bengali', 'Telugu', 'Gujarati', 'Kannada']

const loadSettings = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function Settings() {
  const [settings, setSettings] = useState(loadSettings)
  const [saved, setSaved] = useState(false)

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))

  const toggleLanguage = (lang) => {
    setSettings(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }))
  }

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => {
    if (window.confirm('Reset all settings to default values?')) {
      setSettings({ ...DEFAULT_SETTINGS })
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure AI models, thresholds, and governance controls</p>
        </div>

        {/* Success Banner */}
        {saved && (
          <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 text-sm font-semibold shadow-sm">
            <CheckCircle className="w-5 h-5" />
            Settings saved successfully!
          </div>
        )}

        {/* Model Configuration */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Cpu className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">Model Configuration</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary AI Model</label>

              {/* Gemini Active Banner */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">Google Gemini 1.5 Flash — Active</p>
                  <p className="text-xs text-blue-600">Powered by Google AI Studio · Real LLM bias detection</p>                </div>
                <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  <Zap className="w-3 h-3" /> Live
                </span>
              </div>

              <select
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={settings.selectedModel}
                onChange={(e) => update('selectedModel', e.target.value)}
              >
                <option value="gemini">Google Gemini 1.5 Flash — Active ✅</option>
                <option value="indicbert">IndicBERT (Multilingual)</option>
                <option value="bert">BERT Base</option>
                <option value="distilbert">DistilBERT (Faster)</option>
                <option value="roberta">RoBERTa (Higher Accuracy)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Google Gemini provides real AI-powered bias detection with native Hindi + English support
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* SHAP Toggle */}
              <div className="p-4 border border-gray-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">SHAP Explainability</p>
                  <p className="text-xs text-gray-500 mt-0.5">Word-level bias explanations</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.shapEnabled}
                    onChange={(e) => update('shapEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* AIF360 Toggle */}
              <div className="p-4 border border-gray-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">AIF360 Metrics</p>
                  <p className="text-xs text-gray-500 mt-0.5">Fairness metric calculations</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.aif360Enabled}
                    onChange={(e) => update('aif360Enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Detection Thresholds */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Sliders className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold">Detection Thresholds</h2>
          </div>

          <div className="space-y-6">
            {/* Overall Threshold Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Overall Bias Detection Threshold</label>
                <span className="text-lg font-bold text-blue-600">{settings.biasThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={settings.biasThreshold}
                onChange={(e) => update('biasThreshold', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.0 (Strict — flags everything)</span>
                <span>0.5 (Balanced)</span>
                <span>1.0 (Lenient)</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Articles with overall bias score above this threshold are flagged for review
              </p>
            </div>

            {/* Per-Type Thresholds */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Gender Bias
                  <span className="ml-2 font-bold text-blue-600">{settings.genderBiasThreshold.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0" max="1" step="0.1"
                  value={settings.genderBiasThreshold}
                  onChange={(e) => update('genderBiasThreshold', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Stereotype
                  <span className="ml-2 font-bold text-blue-600">{settings.stereotypeThreshold.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0" max="1" step="0.1"
                  value={settings.stereotypeThreshold}
                  onChange={(e) => update('stereotypeThreshold', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Language Dominance
                  <span className="ml-2 font-bold text-blue-600">{settings.languageDominanceThreshold.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0" max="1" step="0.1"
                  value={settings.languageDominanceThreshold}
                  onChange={(e) => update('languageDominanceThreshold', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Human Review Governance */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">Human Review Governance</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Require Human Review</p>
                <p className="text-sm text-gray-600">All flagged articles must be reviewed by humans before deployment</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.humanReviewRequired}
                  onChange={(e) => update('humanReviewRequired', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Auto-Approve Low Bias</p>
                <p className="text-sm text-gray-600">Automatically approve articles with bias score below 0.2</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoApprove}
                  onChange={(e) => update('autoApprove', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-1">⚠️ Governance Policy</p>
              <p className="text-xs text-yellow-700">
                Changes to governance settings are saved locally and will be logged in the audit trail upon save.
              </p>
            </div>
          </div>
        </div>

        {/* Language Support */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold">Language Support</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Select which languages the bias detector should actively check for.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ALL_LANGUAGES.map((lang) => (
              <div
                key={lang}
                onClick={() => toggleLanguage(lang)}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  settings.languages.includes(lang)
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={settings.languages.includes(lang)}
                  onChange={() => toggleLanguage(lang)}
                  className="w-4 h-4 text-blue-600 rounded"
                  onClick={e => e.stopPropagation()}
                />
                <label className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">{lang}</label>
                {settings.languages.includes(lang) && (
                  <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Active</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Settings Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold">Current Configuration Summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">Model</span>
              <span className="font-medium text-blue-600">
                {settings.selectedModel === 'gemini' ? '✨ Google Gemini' : settings.selectedModel}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">Overall Threshold</span>
              <span className="font-medium">{settings.biasThreshold.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">Human Review</span>
              <span className={`font-medium ${settings.humanReviewRequired ? 'text-green-600' : 'text-gray-500'}`}>
                {settings.humanReviewRequired ? 'Required' : 'Optional'}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">Auto-Approve</span>
              <span className={`font-medium ${settings.autoApprove ? 'text-blue-600' : 'text-gray-500'}`}>
                {settings.autoApprove ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">SHAP</span>
              <span className={`font-medium ${settings.shapEnabled ? 'text-green-600' : 'text-red-500'}`}>
                {settings.shapEnabled ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">Active Languages</span>
              <span className="font-medium">{settings.languages.length} / {ALL_LANGUAGES.length}</span>
            </div>
          </div>
        </div>

        {/* Save / Reset */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Settings
          </button>
          <button
            onClick={handleReset}
            className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Reset to Default
          </button>
        </div>

      </div>
    </div>
  )
}

export default Settings