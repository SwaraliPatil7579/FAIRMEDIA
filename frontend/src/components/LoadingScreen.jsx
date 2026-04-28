import { useEffect, useState } from 'react'
import { Sparkles, Shield, Zap, Brain, CheckCircle, LayoutDashboard } from 'lucide-react'

function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [particles, setParticles] = useState([])

  const steps = [
    { icon: Brain, label: 'Initializing AI Engine', color: 'text-blue-600' },
    { icon: Shield, label: 'Loading Bias Detection', color: 'text-purple-600' },
    { icon: Zap, label: 'Activating Fairness Metrics', color: 'text-green-600' },
    { icon: Sparkles, label: 'Preparing Interface', color: 'text-orange-600' },
    { icon: CheckCircle, label: 'System Ready', color: 'text-indigo-600' },
  ]

  useEffect(() => {
    // Generate floating particles
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
    }))
    setParticles(newParticles)

    // Progress animation
    const duration = 3500 // 3.5 seconds total
    const stepDuration = duration / steps.length
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1
        if (next >= 100) {
          clearInterval(interval)
          setTimeout(() => onComplete && onComplete(), 300)
          return 100
        }
        return next
      })
    }, duration / 100)

    // Step progression
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval)
          return prev
        }
        return prev + 1
      })
    }, stepDuration)

    return () => {
      clearInterval(interval)
      clearInterval(stepInterval)
    }
  }, [])

  const CurrentIcon = steps[currentStep]?.icon || Brain

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center overflow-hidden z-50">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'grid-move 30s linear infinite'
        }} />
      </div>

      {/* Floating Particles - Light Theme */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3))',
            animation: `float-particle ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)',
          }}
        />
      ))}

      {/* Soft Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200 rounded-full filter blur-3xl opacity-20 animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200 rounded-full filter blur-3xl opacity-20 animate-pulse-slow" style={{ animationDelay: '1s' }} />

      {/* Main Content */}
      <div className="relative z-10 text-center px-8">
        {/* Logo with Subtle Float Effect */}
        <div className="mb-8 animate-float">
          <div className="relative inline-block">
            {/* Outer Glow Ring - Light Theme */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-20 blur-xl animate-spin-slow" style={{ width: '180px', height: '180px', margin: '-40px' }} />
            
            {/* Main Icon Container - Matches Dashboard Style */}
            <div className="relative w-28 h-28 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl transform hover:scale-105 transition-transform duration-500">
              <CurrentIcon className="w-14 h-14 text-white" />
              
              {/* Orbiting Particles - Subtle */}
              <div className="absolute inset-0">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full shadow-lg"
                    style={{
                      top: '50%',
                      left: '50%',
                      animation: `orbit ${3 + i}s linear infinite`,
                      animationDelay: `${i * 0.7}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Brand Name - Matches Dashboard */}
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          FAIRMEDIA
        </h1>
        
        <p className="text-sm text-gray-500 mb-8 font-medium">
          AI-Powered Bias Audit System
        </p>

        {/* Loading Steps - Clean Design */}
        <div className="mb-8 space-y-2 max-w-md mx-auto">
          {steps.map((step, index) => {
            const StepIcon = step.icon
            const isActive = index === currentStep
            const isComplete = index < currentStep
            
            return (
              <div
                key={index}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-500 ${
                  isActive 
                    ? 'bg-white shadow-md scale-105' 
                    : isComplete 
                    ? 'bg-white/50' 
                    : 'bg-white/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isComplete 
                    ? 'bg-green-500 shadow-lg' 
                    : isActive 
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg animate-pulse' 
                    : 'bg-gray-200'
                }`}>
                  {isComplete ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <StepIcon className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className={`text-sm font-medium flex-1 text-left ${
                  isActive ? 'text-gray-900' : isComplete ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
                {isActive && (
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Progress Bar - Clean Style */}
        <div className="max-w-md mx-auto mb-4">
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
              style={{ 
                width: `${progress}%`,
                backgroundSize: '200% 100%',
                animation: 'gradient-shift 2s ease infinite'
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500 font-medium">
              Loading system...
            </p>
            <p className="text-xs text-blue-600 font-bold">
              {progress}%
            </p>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-xs text-gray-400 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          Ensuring fairness in AI-generated content
        </p>
      </div>

      {/* Bottom Decorative Element */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/50 to-transparent" />
    </div>
  )
}

export default LoadingScreen
