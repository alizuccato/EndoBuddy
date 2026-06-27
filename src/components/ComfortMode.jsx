/**
 * ComfortMode
 * 
 * Specialized UI state for users experiencing high-pain flare-ups or brain fog.
 * Reduces sensory input, increases touch targets, and provides instant relief access.
 * 
 * Features (from comfort-mode-design.md):
 * 1. "The Soft Layer" — warm, low-glare color palette
 * 2. Comfort Buttons — 56x56px min, pill-shaped, soft feel
 * 3. TL;DR Content Cards — simplified health summaries
 * 4. Large-Scale Toggles — 2-column simplified symptom grid
 * 5. Flare-Up Emergency Widget — quick tips, meds tracker, nervous system reset
 * 6. Auto-prompt on pain log 7+
 * 7. Fade transition (300ms) palette swap
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// Guided breathing animation intervals (seconds)
const BREATH_CYCLE = [4, 4, 6] // inhale, hold, exhale

export default function ComfortMode({ children, isActive, onToggle, currentPhase }) {
  const [showWidget, setShowWidget] = useState(false)
  const [breathingActive, setBreathingActive] = useState(false)
  const [breathPhase, setBreathPhase] = useState('')
  const breathTimerRef = useRef(null)

  // Auto-prompt when comfort mode becomes active
  useEffect(() => {
    if (isActive) {
      setShowWidget(true)
    }
  }, [isActive])

  // Breathing exercise timer
  const startBreathing = useCallback(() => {
    setBreathingActive(true)
    const [inhale, hold, exhale] = BREATH_CYCLE
    let step = 0
    const totalDuration = (inhale + hold + exhale) * 1000

    const runCycle = () => {
      setBreathPhase('Breathe in...')
      setTimeout(() => {
        setBreathPhase('Hold...')
        setTimeout(() => {
          setBreathPhase('Breathe out...')
          setTimeout(() => {
            step++
            if (step < 3) runCycle()
            else {
              setBreathPhase('✨')
              setTimeout(() => {
                setBreathingActive(false)
                setBreathPhase('')
              }, 1500)
            }
          }, exhale * 1000)
        }, hold * 1000)
      }, inhale * 1000)
    }
    runCycle()
  }, [])

  const stopBreathing = useCallback(() => {
    setBreathingActive(false)
    setBreathPhase('')
    if (breathTimerRef.current) clearTimeout(breathTimerRef.current)
  }, [])

  // Rotating quick tips
  const quickTips = [
    { emoji: '🌡️', text: 'Try a heating pad on your lower back or abdomen.' },
    { emoji: '💧', text: 'Sip warm water slowly — hydration helps with cramping.' },
    { emoji: '🧘', text: 'Try the 1-minute breathing anchor — it helps reset your nervous system.' },
    { emoji: '🌿', text: 'Magnesium or a warm Epsom salt bath may help relax muscles.' },
    { emoji: '🛌', text: 'Rest is healthcare. Lying down takes pressure off your pelvis.' },
    { emoji: '📝', text: 'Just logging is enough. You don\'t need to do anything else right now.' },
  ]
  const [currentTip, setCurrentTip] = useState(0)

  // Rotate tips every 8 seconds
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % quickTips.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [isActive, quickTips.length])

  const tip = quickTips[currentTip]

  return (
    <div className={`transition-all duration-300 ${isActive ? 'comfort-mode-active' : ''}`}>
      {/* Global style injection for Comfort Mode palette */}
      {isActive && (
        <style>{`
          .comfort-mode-active {
            --comfort-bg: #F9F7F2;
            --comfort-text: #4A443F;
            --comfort-text-secondary: #756F68;
            --comfort-card-bg: #FFFFFFE0;
            --comfort-accent: #2E5D5D;
            --comfort-border: #E2DDD6;
            --comfort-danger: #C25A44;
          }
          .comfort-mode-active body,
          .comfort-mode-active .min-h-screen {
            background-color: var(--comfort-bg) !important;
          }
          .comfort-mode-active .card {
            background-color: var(--comfort-card-bg) !important;
            border-color: var(--comfort-border) !important;
          }
          .comfort-mode-active p, 
          .comfort-mode-active span:not(.no-comfort),
          .comfort-mode-active h1, 
          .comfort-mode-active h2, 
          .comfort-mode-active h3, 
          .comfort-mode-active h4 {
            color: var(--comfort-text) !important;
          }
          .comfort-mode-active .text-gray-500,
          .comfort-mode-active .text-gray-400 {
            color: var(--comfort-text-secondary) !important;
          }
          .comfort-mode-active .btn-primary {
            background-color: var(--comfort-accent) !important;
          }
          .comfort-mode-active .bg-endo-purple {
            background-color: var(--comfort-accent) !important;
          }
          .comfort-mode-active .text-endo-purple {
            color: var(--comfort-accent) !important;
          }
          .comfort-mode-active .border-gray-100,
          .comfort-mode-active .border-gray-200 {
            border-color: var(--comfort-border) !important;
          }
          /* Larger text */
          .comfort-mode-active body {
            font-size: 18px !important;
            line-height: 1.7 !important;
          }
          /* Comfort buttons */
          .comfort-mode-active button:not(.no-comfort) {
            min-height: 56px !important;
            border-radius: 9999px !important;
            border-width: 2px !important;
          }
        `}</style>
      )}

      {/* Comfort Mode Toggle */}
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          onClick={onToggle}
          className={`
            no-comfort flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
            transition-all duration-200 min-h-[44px]
            ${isActive 
              ? 'bg-[#2E5D5D] text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          <span className="text-lg">{isActive ? '🧘' : '☀️'}</span>
          <span>{isActive ? 'Comfort Mode ON' : 'Comfort Mode'}</span>
        </button>
      </div>

      {/* Flare-Up Emergency Widget */}
      {isActive && showWidget && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:relative md:mx-4 md:mb-4">
          <div className="bg-[#C25A44]/10 backdrop-blur-sm border-t-2 border-[#C25A44]/30 md:border-2 md:rounded-2xl p-4 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🆘</span>
                <span className="font-bold text-[#C25A44] text-sm">Flare-Up Relief</span>
              </div>
              <button
                onClick={() => setShowWidget(false)}
                className="no-comfort text-[#C25A44] text-xs font-medium px-2 py-1 rounded-full border border-[#C25A44]/30 hover:bg-[#C25A44]/10"
              >
                Dismiss
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* Quick Tip */}
              <div className="bg-white/80 rounded-xl p-3 col-span-2 md:col-span-1">
                <p className="text-[10px] font-semibold text-[#756F68] uppercase tracking-wide mb-1">Quick Tip</p>
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">{tip.emoji}</span>
                  <p className="text-xs text-[#4A443F] leading-relaxed">{tip.text}</p>
                </div>
              </div>

              {/* Log Meds */}
              <button className="bg-white/80 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:bg-white transition-colors min-h-[70px]">
                <span className="text-xl">💊</span>
                <span className="text-[11px] font-medium text-[#4A443F]">Log Medication</span>
              </button>

              {/* Breathing Reset */}
              <button
                onClick={breathingActive ? stopBreathing : startBreathing}
                className={`
                  bg-white/80 rounded-xl p-3 flex flex-col items-center justify-center gap-1
                  transition-all min-h-[70px]
                  ${breathingActive ? 'ring-2 ring-[#2E5D5D] bg-white' : 'hover:bg-white'}
                `}
              >
                {breathingActive ? (
                  <>
                    <span className="text-lg animate-pulse">🌬️</span>
                    <span className="text-[11px] font-medium text-[#2E5D5D]">{breathPhase}</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🧘</span>
                    <span className="text-[11px] font-medium text-[#4A443F]">60s Reset</span>
                  </>
                )}
              </button>

              {/* Support */}
              <button className="bg-white/80 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:bg-white transition-colors min-h-[70px]">
                <span className="text-xl">💜</span>
                <span className="text-[11px] font-medium text-[#4A443F]">Support</span>
              </button>
            </div>

            {/* Re-show button when dismissed */}
          </div>
        </div>
      )}

      {/* Show floating re-open button when widget is dismissed */}
      {isActive && !showWidget && (
        <button
          onClick={() => setShowWidget(true)}
          className="fixed bottom-4 right-4 z-50 no-comfort bg-[#C25A44] text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all"
          aria-label="Open flare-up relief"
        >
          <span className="text-xl">🆘</span>
        </button>
      )}

      {/* Main content */}
      <div className={isActive ? 'pb-32 md:pb-0' : ''}>
        {children}
      </div>
    </div>
  )
}

/**
 * TL;DR Content Card — simplified info card for Comfort Mode
 */
export function TLDRCard({ icon, title, subtitle, action, actionLabel }) {
  return (
    <div className="comfort-card bg-[#FFFFFFE0] rounded-2xl border border-[#E2DDD6] p-4 flex items-center gap-3">
      <div className="text-3xl flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-[#4A443F] text-sm leading-tight">{title}</h4>
        {subtitle && <p className="text-xs text-[#756F68] mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <button
          onClick={action}
          className="flex-shrink-0 bg-[#2E5D5D] text-white text-xs font-medium px-4 py-2.5 rounded-full min-h-[44px]"
        >
          {actionLabel || 'Go'}
        </button>
      )}
    </div>
  )
}

/**
 * Comfort Symptom Toggle — large 2-column simplified symptom buttons
 */
export function ComfortSymptomToggle({ symptoms, selectedSymptoms, onToggle }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {symptoms.map(symptom => {
        const isSelected = selectedSymptoms?.includes(symptom.id)
        return (
          <button
            key={symptom.id}
            onClick={() => onToggle?.(symptom.id)}
            className={`
              flex items-center gap-3 p-4 rounded-2xl min-h-[56px]
              transition-all duration-150
              ${isSelected
                ? 'bg-[#2E5D5D] text-white border-2 border-[#2E5D5D]'
                : 'bg-white border-2 border-[#E2DDD6] text-[#4A443F] hover:border-[#2E5D5D]/30'
              }
            `}
          >
            <span className="text-2xl">{symptom.icon}</span>
            <span className="text-sm font-medium">{symptom.label}</span>
          </button>
        )
      })}
    </div>
  )
}