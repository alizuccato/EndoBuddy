/**
 * LoggingFlow
 * 
 * Multi-step daily logging wizard for EndoBuddy.
 * Guides users through one question at a time for low cognitive load.
 * Designed for completion in under 30 seconds.
 * 
 * Steps:
 *   1. Entry / Pain Scale (1-10 grid)
 *   2. Symptom Selection (category grid, multi-select)
 *   3. Cycle Info (flow level, optional, shown contextually)
 *   4. Lifestyle Factors (optional toggles, skippable, powers the
 *      Correlation Map) — not shown in the numbered step indicator
 *      above, since it's a fully optional add-on rather than a core step
 *   5. Notes & Finish (voice-to-text + done)
 *   6. Confirmation (summary + next actions)
 */

import { useState, useCallback, useMemo } from 'react'
import PainScaleStep from './PainScaleStep'
import SymptomGrid from './SymptomGrid'
import CycleInfoStep from './CycleInfoStep'
import LifestyleFactorsStep from './LifestyleFactorsStep'
import NotesStep from './NotesStep'
import ConfirmationStep from './ConfirmationStep'

const STEPS_WITH_CYCLE = [
  'pain',
  'symptoms',
  'cycle',
  'lifestyle',
  'notes',
  'confirmation',
]

const STEPS_NO_CYCLE = [
  'pain',
  'symptoms',
  'lifestyle',
  'notes',
  'confirmation',
]

const STEP_INDICATORS_WITH_CYCLE = {
  pain: { num: 1, label: 'Pain' },
  symptoms: { num: 2, label: 'Symptoms' },
  cycle: { num: 3, label: 'Cycle' },
  notes: { num: 4, label: 'Notes' },
}

const STEP_INDICATORS_NO_CYCLE = {
  pain: { num: 1, label: 'Pain' },
  symptoms: { num: 2, label: 'Symptoms' },
  notes: { num: 3, label: 'Notes' },
}

// hasCycle: false skips the Cycle Info step entirely — for acyclic users
// (e.g. post-hysterectomy) with no menstrual or hormone-therapy cycle to
// log flow against.
export default function LoggingFlow({ onComplete, onClose, hasCycle = true }) {
  const STEPS = hasCycle ? STEPS_WITH_CYCLE : STEPS_NO_CYCLE
  const STEP_INDICATORS = hasCycle ? STEP_INDICATORS_WITH_CYCLE : STEP_INDICATORS_NO_CYCLE

  const [currentStep, setCurrentStep] = useState('pain')
  const [logData, setLogData] = useState({
    painLevel: null,
    symptoms: [],
    flowLevel: null,
    isPeriodDay: false,
    notes: '',
  })

  const currentStepIndex = STEPS.indexOf(currentStep)
  const totalSteps = STEPS.length - 1 // exclude confirmation

  // Derived data
  const isInMenstrualPhase = logData.flowLevel !== null

  const handleSelect = useCallback((field, value) => {
    if (field === '_next') {
      // Trigger next step from child components — goToStep is stable
      if (currentStep === 'pain') { setCurrentStep('symptoms'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
      else if (currentStep === 'symptoms') { setCurrentStep(hasCycle ? 'cycle' : 'lifestyle'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
      else if (currentStep === 'cycle') { setCurrentStep('lifestyle'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
      return
    }
    setLogData(prev => ({ ...prev, [field]: value }))
  }, [currentStep, hasCycle])

  const goToStep = useCallback((step) => {
    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handlePainNext = useCallback(() => {
    goToStep('symptoms')
  }, [goToStep])

  const handleSymptomsNext = useCallback(() => {
    goToStep(hasCycle ? 'cycle' : 'lifestyle')
  }, [goToStep, hasCycle])

  const handleCycleNext = useCallback(() => {
    goToStep('lifestyle')
  }, [goToStep])

  const handleCycleSkip = useCallback(() => {
    goToStep('lifestyle')
  }, [goToStep])

  // "Next" here means the person actually engaged with the lifestyle
  // toggles (even if they left every one of them off), so it's recorded
  // as a real set of answers, defaulting to {} if nothing was touched.
  // "Skip" means they opted out of lifestyle logging for this entry
  // altogether, so logData.lifestyleFactors is left as-is (undefined —
  // see the initial useState below), which omits the key from the
  // request body entirely and stores NULL for every factor server-side,
  // not a false "no." See src/utils/lifestyleFactors.js for why that
  // distinction matters for the Correlation Map's math.
  const handleLifestyleNext = useCallback(() => {
    setLogData(prev => ({ ...prev, lifestyleFactors: prev.lifestyleFactors || {} }))
    goToStep('notes')
  }, [goToStep])

  const handleLifestyleSkip = useCallback(() => {
    goToStep('notes')
  }, [goToStep])

  const handleComplete = useCallback(() => {
    goToStep('confirmation')
    if (onComplete) {
      onComplete(logData)
    }
  }, [logData, onComplete, goToStep])

  const handleStartNew = useCallback(() => {
    setLogData({
      painLevel: null,
      symptoms: [],
      flowLevel: null,
      isPeriodDay: false,
      notes: '',
    })
    setCurrentStep('pain')
  }, [])

  const handleGoHome = useCallback(() => {
    if (onClose) onClose()
  }, [onClose])

  // Step indicator for steps 1-4 (excludes confirmation)
  const showStepIndicator = currentStep !== 'confirmation'

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Step Indicator */}
      {showStepIndicator && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {Object.entries(STEP_INDICATORS).map(([stepKey, indicator]) => {
              const stepIdx = STEPS.indexOf(stepKey)
              const isActive = stepKey === currentStep
              const isCompleted = stepIdx < currentStepIndex
              
              return (
                <div key={stepKey} className="flex items-center flex-1">
                  {/* Step dot */}
                  <div className={`
                    flex items-center justify-center
                    w-11 h-11 rounded-full text-xs font-bold
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-endo-purple text-white shadow-md scale-110' 
                      : isCompleted
                        ? 'bg-green-100 text-green-600 border border-green-200'
                        : 'bg-gray-100 text-gray-400'
                    }
                  `}>
                    {isCompleted ? '✓' : indicator.num}
                  </div>
                  
                  {/* Connector line */}
                  {stepKey !== 'notes' && (
                    <div className={`
                      flex-1 h-0.5 mx-1 rounded
                      ${stepIdx < currentStepIndex ? 'bg-green-300' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              )
            })}
          </div>
          {/* Step labels */}
          <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
            {Object.values(STEP_INDICATORS).map((indicator) => (
              <span key={indicator.label}>{indicator.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="float-right text-gray-400 hover:text-gray-600 transition-colors p-1"
        aria-label="Close logging"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Step Content */}
      <div className="clear-both pt-2">
        {currentStep === 'pain' && (
          <PainScaleStep
            selectedValue={logData.painLevel}
            onSelect={handleSelect}
            onNext={handlePainNext}
          />
        )}

        {currentStep === 'symptoms' && (
          <SymptomGrid
            selectedSymptoms={logData.symptoms}
            onSelect={handleSelect}
            onNext={handleSymptomsNext}
          />
        )}

        {currentStep === 'cycle' && (
          <CycleInfoStep
            selectedFlow={logData.flowLevel}
            onSelect={handleSelect}
            onNext={handleCycleNext}
            onSkip={handleCycleSkip}
            isPeriodDay={logData.isPeriodDay}
          />
        )}

        {currentStep === 'lifestyle' && (
          <LifestyleFactorsStep
            factors={logData.lifestyleFactors}
            onSelect={handleSelect}
            onNext={handleLifestyleNext}
            onSkip={handleLifestyleSkip}
          />
        )}

        {currentStep === 'notes' && (
          <NotesStep
            notes={logData.notes}
            onSelect={handleSelect}
            onComplete={handleComplete}
            symptoms={logData.symptoms}
          />
        )}

        {currentStep === 'confirmation' && (
          <ConfirmationStep
            logData={logData}
            onStartNew={handleStartNew}
            onGoHome={handleGoHome}
          />
        )}

        {/* Step navigation hint */}
        {currentStep !== 'confirmation' && (
          <p className="text-center text-xs text-gray-400 mt-6">
            Tap Continue above or select your answer · All data stays on your device
          </p>
        )}
      </div>
    </div>
  )
}