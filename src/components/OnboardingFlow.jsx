/**
 * OnboardingFlow
 * 
 * First-time user onboarding sequence based on onboarding-flow.md.
 * 7 screens: Welcome → Brand Promise → Last Period → Cycle Rhythm → 
 * Symptom Baseline → Privacy → Ready to Start
 * 
 * Validating, empathetic, low-friction. Saves progress locally.
 */

import { useState, useCallback, useMemo } from 'react'
import { PHASE_STYLES } from '../utils/mockData'

const SYMPTOM_OPTIONS = [
  { id: 'pelvic_pain', label: 'Pelvic Pain / Cramping', icon: '⚡', category: 'pain' },
  { id: 'endo_belly', label: 'Endo Belly / Bloating', icon: '🫃', category: 'digestive' },
  { id: 'fatigue', label: 'Chronic Fatigue', icon: '😴', category: 'energy' },
  { id: 'brain_fog', label: 'Brain Fog', icon: '🌫️', category: 'neuro' },
  { id: 'back_pain', label: 'Lower Back Pain', icon: '🔙', category: 'pain' },
  { id: 'gi_issues', label: 'Nausea / GI Issues', icon: '🤢', category: 'digestive' },
  { id: 'mood_shifts', label: 'Mood Shifts / Anxiety', icon: '🎢', category: 'mood' },
  { id: 'headaches', label: 'Headaches / Migraines', icon: '🤕', category: 'pain' },
  { id: 'insomnia', label: 'Insomnia / Poor Sleep', icon: '🌙', category: 'energy' },
  { id: 'joint_pain', label: 'Joint / Muscle Pain', icon: '🦴', category: 'pain' },
]

export default function OnboardingFlow({ onComplete, onSkip, onStartLogging, onGoToDashboard }) {
  const [step, setStep] = useState(0)
  const [onboardingData, setOnboardingData] = useState({
    lastPeriodStart: null,
    cycleLength: 28,
    frequentSymptoms: [],
    occasionalSymptoms: [],
    name: '',
    agreedToPrivacy: false,
    agreedToTos: false,
    ageVerified: false,
  })
  const [showCalendar, setShowCalendar] = useState(false)

  const handleSelect = useCallback((field, value) => {
    setOnboardingData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSymptomToggle = useCallback((symptomId, isFrequent) => {
    setOnboardingData(prev => {
      const key = isFrequent ? 'frequentSymptoms' : 'occasionalSymptoms'
      const exists = prev[key].includes(symptomId)
      // Remove from the other list if present
      const otherKey = isFrequent ? 'occasionalSymptoms' : 'frequentSymptoms'
      const otherCleaned = prev[otherKey].filter(id => id !== symptomId)
      
      return {
        ...prev,
        [key]: exists ? prev[key].filter(id => id !== symptomId) : [...prev[key], symptomId],
        [otherKey]: otherCleaned,
      }
    })
  }, [])

  const handleNext = useCallback(() => {
    setStep(prev => Math.min(prev + 1, 6))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleBack = useCallback(() => {
    setStep(prev => Math.max(prev - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleComplete = useCallback(() => {
    if (onComplete) onComplete(onboardingData)
  }, [onboardingData, onComplete])

  // Calculate current phase based on entered data
  const estimatedPhase = useMemo(() => {
    if (!onboardingData.lastPeriodStart) return 'follicular'
    const startDate = new Date(onboardingData.lastPeriodStart)
    const today = new Date()
    const dayDiff = Math.floor((today - startDate) / 86400000)
    const cycleDay = ((dayDiff % (onboardingData.cycleLength || 28)) + 1)
    
    if (cycleDay <= 5) return 'menstrual'
    if (cycleDay <= 14) return 'follicular'
    if (cycleDay === 15) return 'ovulatory'
    return 'luteal'
  }, [onboardingData.lastPeriodStart, onboardingData.cycleLength])

  const phaseStyle = PHASE_STYLES[estimatedPhase] || PHASE_STYLES.follicular

  // Generate month/day options for calendar
  const now = new Date()
  const dayOptions = []
  for (let i = 0; i < 60; i++) {
    const d = new Date(now.getTime() - i * 86400000)
    dayOptions.push({
      value: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    })
  }

  const totalSteps = 7
  const progress = ((step + 1) / totalSteps) * 100

  const steps = [
    // Step 0: Welcome (with medical disclaimer)
    {
      render: () => (
        <div className="text-center space-y-6">
          <div className="text-7xl mb-4">🌸</div>
          <h2 className="text-3xl font-bold text-gray-900 font-display">
            We believe you.
          </h2>
          <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
            Your pain is real, and your experience is valid.
          </p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            EndoBuddy is designed to help you identify the hidden patterns in your cycle 
            and give you the data you need for better clinical care.
          </p>
          {/* Medical Disclaimer */}
          <div className="bg-amber-50 rounded-xl p-3 max-w-sm mx-auto border border-amber-100">
            <p className="text-[11px] text-amber-700 leading-relaxed">
              ⚕️ <strong>Important:</strong> EndoBuddy is a data-tracking and pattern-identification tool. 
              It is <strong>not</strong> a medical device, diagnostic service, or substitute for 
              professional medical advice. Always consult your healthcare provider.
            </p>
          </div>
          <button onClick={handleNext} className="btn-primary text-lg px-12 py-3 mt-4">
            I Understand, Let's Begin
          </button>
        </div>
      ),
    },
    // Step 1: Brand Promise
    {
      render: () => (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">💜</div>
          <h2 className="text-3xl font-bold text-gray-900 font-display">
            No more "just bad periods."
          </h2>
          <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
            Whether you have a diagnosis or are just starting to look for answers, 
            we're here to bridge the gap between daily suffering and medical clarity.
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <button onClick={handleBack} className="px-6 py-2.5 text-sm text-gray-500 font-medium">
              Back
            </button>
            <button onClick={handleNext} className="btn-primary px-10 py-2.5">
              I'm Ready
            </button>
          </div>
        </div>
      ),
    },
    // Step 2: Last Period
    {
      render: () => (
        <div className="space-y-6 max-w-sm mx-auto">
          <div className="text-center">
            <div className="text-4xl mb-3">📅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              When did your last period start?
            </h2>
            <p className="text-sm text-gray-500">
              If you don't remember exactly, an estimate is a great starting point.
            </p>
          </div>

          {/* Selected date display */}
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full input-field text-center text-lg py-4"
          >
            {onboardingData.lastPeriodStart
              ? new Date(onboardingData.lastPeriodStart + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                })
              : 'Tap to select a date'}
          </button>

          {/* Simplified date selector */}
          {showCalendar && (
            <div className="card max-h-48 overflow-y-auto">
              {dayOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    handleSelect('lastPeriodStart', option.value)
                    setShowCalendar(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors
                    ${onboardingData.lastPeriodStart === option.value 
                      ? 'bg-endo-purple/10 text-endo-purple font-medium' 
                      : 'hover:bg-gray-50 text-gray-700'}
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button onClick={handleBack} className="px-6 py-2.5 text-sm text-gray-500 font-medium">
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!onboardingData.lastPeriodStart}
              className={`btn-primary px-8 py-2.5 ${!onboardingData.lastPeriodStart ? 'opacity-50' : ''}`}
            >
              Next
            </button>
          </div>
          <div className="text-center">
            <button
              onClick={() => {
                const defaultDate = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]
                handleSelect('lastPeriodStart', defaultDate)
                handleNext()
              }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              I'm not sure / I don't have regular periods
            </button>
          </div>
        </div>
      ),
    },
    // Step 3: Cycle Rhythm
    {
      render: () => (
        <div className="space-y-6 max-w-sm mx-auto">
          <div className="text-center">
            <div className="text-4xl mb-3">🔄</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              How many days does your cycle usually last?
            </h2>
            <p className="text-sm text-gray-500">
              Most cycles are between 25 and 35 days. If yours varies, we'll learn your rhythm over time.
            </p>
          </div>

          {/* Cycle length selector */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handleSelect('cycleLength', Math.max(21, (onboardingData.cycleLength || 28) - 1))}
                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600"
              >
                −
              </button>
              <div className="text-center min-w-[100px]">
                <span className="text-5xl font-bold text-endo-purple">{onboardingData.cycleLength || 28}</span>
                <p className="text-sm text-gray-500 mt-1">days</p>
              </div>
              <button
                onClick={() => handleSelect('cycleLength', Math.min(45, (onboardingData.cycleLength || 28) + 1))}
                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600"
              >
                +
              </button>
            </div>
            {/* Slider track */}
            <div className="mt-4 px-4">
              <input
                type="range"
                min="21"
                max="45"
                value={onboardingData.cycleLength || 28}
                onChange={(e) => handleSelect('cycleLength', parseInt(e.target.value))}
                className="w-full accent-endo-purple"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>21 days</span>
                <span>45+ days</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3 mt-4">
            <button onClick={handleBack} className="px-6 py-2.5 text-sm text-gray-500 font-medium">
              Back
            </button>
            <button onClick={handleNext} className="btn-primary px-8 py-2.5">
              Next
            </button>
          </div>
        </div>
      ),
    },
    // Step 4: Symptom Baseline
    {
      render: () => (
        <div className="space-y-5 max-w-lg mx-auto">
          <div className="text-center">
            <div className="text-4xl mb-3">🗺️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your Personal Symptom Map
            </h2>
            <p className="text-sm text-gray-500">
              Tell us what you experience most often. Tap once for occasional, twice for frequent.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {SYMPTOM_OPTIONS.map((symptom) => {
              const isFrequent = onboardingData.frequentSymptoms.includes(symptom.id)
              const isOccasional = onboardingData.occasionalSymptoms.includes(symptom.id)
              
              return (
                <button
                  key={symptom.id}
                  onClick={() => {
                    if (isFrequent) {
                      handleSymptomToggle(symptom.id, true)  // removes from frequent
                    } else if (isOccasional) {
                      handleSymptomToggle(symptom.id, true)  // upgrades to frequent
                    } else {
                      handleSymptomToggle(symptom.id, false) // adds to occasional
                    }
                  }}
                  className={`
                    flex items-center gap-2.5 p-3 rounded-xl text-sm font-medium
                    transition-all duration-150 min-h-[3.5rem]
                    focus:outline-none focus:ring-2 focus:ring-endo-purple
                    ${isFrequent
                      ? 'bg-endo-purple text-white shadow-md ring-2 ring-endo-purple/30'
                      : isOccasional
                        ? 'bg-endo-lavender/10 text-endo-purple border border-endo-lavender/30'
                        : 'bg-gray-50 text-gray-700 border border-gray-100 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="text-xl">{symptom.icon}</span>
                  <span className="text-left leading-tight">{symptom.label}</span>
                  {isFrequent && <span className="ml-auto text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full">Frequent</span>}
                  {isOccasional && !isFrequent && <span className="ml-auto text-[9px] text-endo-purple/60">Occasional</span>}
                </button>
              )
            })}
          </div>

          <div className="flex justify-center gap-3">
            <button onClick={handleBack} className="px-6 py-2.5 text-sm text-gray-500 font-medium">
              Back
            </button>
            <button onClick={handleNext} className="btn-primary px-8 py-2.5">
              Next
            </button>
          </div>
        </div>
      ),
    },
    // Step 5: Privacy & Trust (with Age Verification + TOS)
    {
      render: () => (
        <div className="space-y-6 max-w-md mx-auto">
          <div className="text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your Data is Private
            </h2>
            <p className="text-sm text-gray-500">
              Your health data is sensitive and stays yours.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
              <span className="text-lg">🔐</span>
              <div>
                <p className="text-sm font-medium text-green-800">Bank-grade AES-256 encryption</p>
                <p className="text-xs text-green-600">Your data is encrypted with the same standards as financial institutions</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
              <span className="text-lg">🚫</span>
              <div>
                <p className="text-sm font-medium text-blue-800">No third-party sharing</p>
                <p className="text-xs text-blue-600">We never sell your data to third parties</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
              <span className="text-lg">📤</span>
              <div>
                <p className="text-sm font-medium text-purple-800">You're in control</p>
                <p className="text-xs text-purple-600">Export or delete your data at any time</p>
              </div>
            </div>
          </div>

          {/* Age Verification */}
          <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={onboardingData.ageVerified}
              onChange={(e) => handleSelect('ageVerified', e.target.checked)}
              className="w-5 h-5 accent-endo-purple rounded"
            />
            <span className="text-sm text-gray-700">
              I confirm that I am at least <strong>13 years of age</strong>
            </span>
          </label>

          {/* TOS / Privacy Policy Consent */}
          <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={onboardingData.agreedToTos}
              onChange={(e) => handleSelect('agreedToTos', e.target.checked)}
              className="w-5 h-5 accent-endo-purple rounded"
            />
            <span className="text-sm text-gray-700">
              I agree to the <strong className="text-endo-purple underline cursor-pointer">Terms of Service</strong> 
              and <strong className="text-endo-purple underline cursor-pointer">Privacy Policy</strong>
            </span>
          </label>

          {/* Privacy Understanding */}
          <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={onboardingData.agreedToPrivacy}
              onChange={(e) => handleSelect('agreedToPrivacy', e.target.checked)}
              className="w-5 h-5 accent-endo-purple rounded"
            />
            <span className="text-sm text-gray-700">
              I understand how my data is handled
            </span>
          </label>

          <div className="flex justify-center gap-3">
            <button onClick={handleBack} className="px-6 py-2.5 text-sm text-gray-500 font-medium">
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!onboardingData.ageVerified || !onboardingData.agreedToTos || !onboardingData.agreedToPrivacy}
              className={`btn-primary px-8 py-2.5 ${!onboardingData.ageVerified || !onboardingData.agreedToTos || !onboardingData.agreedToPrivacy ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              I Agree
            </button>
          </div>
        </div>
      ),
    },
    // Step 6: Ready to Start
    {
      render: () => {
        const totalSymptoms = onboardingData.frequentSymptoms.length + onboardingData.occasionalSymptoms.length
        
        return (
          <div className="text-center space-y-6 max-w-md mx-auto">
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900 font-display">
              You're all set!
            </h2>

            {/* Phase context */}
            <div className={`rounded-2xl p-4 ${phaseStyle.bg} border ${phaseStyle.border}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${phaseStyle.dot}`} />
                <span className={`font-semibold ${phaseStyle.text}`}>{phaseStyle.label} Phase</span>
              </div>
              <p className={`text-sm ${phaseStyle.text} opacity-80`}>
                {phaseStyle.description}
              </p>
              {totalSymptoms > 0 && (
                <p className="text-xs mt-2 opacity-60">
                  Tracking {totalSymptoms} symptom{totalSymptoms > 1 ? 's' : ''} · {onboardingData.cycleLength}-day cycles
                </p>
              )}
            </div>

            {/* Pseudonym info */}
            <div className="bg-endo-lavender/10 rounded-xl p-3 border border-endo-lavender/20">
              <p className="text-xs text-gray-600">
                💡 Use your real name or a <strong>pseudonym</strong> in reports — your choice. 
                Only share what you're comfortable with.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={() => { handleComplete(); if (onStartLogging) onStartLogging() }} className="btn-primary text-lg py-4">
                Log How I Feel Right Now
              </button>
              <button onClick={() => { handleComplete(); if (onGoToDashboard) onGoToDashboard() }} className="px-6 py-3 text-sm text-gray-600 hover:text-gray-800 font-medium">
                Take me to my Dashboard
              </button>
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-gray-100 h-1 fixed top-0 left-0 z-50">
        <div
          className="h-full bg-endo-purple transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button
          onClick={() => onSkip?.()}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Skip onboarding
        </button>
      </div>

      {/* Current Step */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        {steps[step]?.render()}
      </div>
    </div>
  )
}