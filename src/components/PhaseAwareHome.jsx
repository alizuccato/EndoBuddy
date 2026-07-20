/**
 * PhaseAwareHome
 *
 * The adaptive home screen that changes theme, greeting, and support
 * content based on the user's cycle phase. Now powered by the
 * Phase-Specific Wellness Library for dynamic content.
 *
 * Design: /home/team/shared/phase-aware-home-design.md
 * Content: /home/team/shared/phase-wellness-library.json
 */

import { useState, useMemo } from 'react'
import EmpathyMessage from './EmpathyMessage'
import { mockCycleData, PHASE_STYLES } from '../utils/mockData'
import wellnessData from '/home/team/shared/phase-wellness-library.json'

const PHASE_CONTENT = {
  menstrual: {
    theme: { bg: 'bg-gradient-to-b from-red-50 to-orange-50/30', card: 'bg-white/90', accent: '#EF4444', ring: '#FCA5A5' },
    greeting: "Take it easy today. Rest is productive.",
    meal: { icon: '🥣', title: 'Warm oatmeal with banana & cinnamon', desc: 'Iron-rich breakfast to support energy levels.' },
    move: { icon: '🧘', title: '10 min Restorative Yoga', desc: 'Gentle poses to ease cramping and lower back tension.' },
    rest: { icon: '🌡️', title: 'Heating pad 20 min before bed', desc: 'Heat therapy relaxes pelvic muscles for better sleep.' },
  },
  follicular: {
    theme: { bg: 'bg-gradient-to-b from-teal-50 to-green-50/30', card: 'bg-white/90', accent: '#14B8A6', ring: '#5EEAD4' },
    greeting: "Your energy is rising. Great time for new projects!",
    meal: { icon: '🥗', title: 'Large salad with kale & chickpeas', desc: 'Liver-supporting meal rich in iron and fiber.' },
    move: { icon: '🏋️', title: 'Moderate Strength Training', desc: 'Build muscle while energy levels are peaking.' },
    rest: { icon: '🛌', title: 'Anchor your consistent bedtime', desc: 'Build routine while your sleep is naturally better.' },
  },
  ovulatory: {
    theme: { bg: 'bg-gradient-to-b from-yellow-50 to-amber-50/30', card: 'bg-white/90', accent: '#EAB308', ring: '#FDE047' },
    greeting: "Energy peaks today. Enjoy the social surge!",
    meal: { icon: '🥙', title: 'Buddha bowl with quinoa & beets', desc: 'Fiber-rich meal supporting estrogen metabolism.' },
    move: { icon: '💃', title: 'Joyful Dance or brisk walk', desc: 'Celebrate your energy peak with endorphin-boosting movement.' },
    rest: { icon: '❄️', title: 'Keep your bedroom extra cool tonight', desc: 'Lower core temp supports deeper sleep during this phase.' },
  },
  luteal: {
    theme: { bg: 'bg-gradient-to-b from-purple-50 to-blue-50/30', card: 'bg-white/90', accent: '#A855F7', ring: '#C084FC' },
    greeting: "Your body is in 'Protect' mode. Prioritize calm.",
    meal: { icon: '🍠', title: 'Sweet potato hash with spinach', desc: 'Blood sugar stabilizing meal for mood balance.' },
    move: { icon: '🚶', title: '15 min gentle walk', desc: 'Gentle movement supports mood and reduces bloating.' },
    rest: { icon: '💜', title: 'Magnesium glycinate before bed', desc: 'Supports sleep quality and reduces muscle tension.' },
  },
}

export default function PhaseAwareHome({ onStartLogging, todayLogged, recentLogs, cycleData, isPremium, onUpgrade }) {
  const data = cycleData || mockCycleData
  const phase = data.currentPhase || 'luteal'
  const dayNum = data.currentDayNum || 1
  const cycleLen = data.cycleLength || 28
  const content = PHASE_CONTENT[phase] || PHASE_CONTENT.luteal
  const style = PHASE_STYLES[phase] || PHASE_STYLES.luteal
  
  const [endoFactDismissed, setEndoFactDismissed] = useState(false)
  const [currentFactIndex, setCurrentFactIndex] = useState(0)

  // Get wellness data from the library
  const phaseWellness = useMemo(() => {
    try {
      const phases = wellnessData?.phases || {}
      return phases[phase] || null
    } catch { return null }
  }, [phase])

  const meals = phaseWellness?.meals || []
  const tips = phaseWellness?.lifestyle_tips || []
  const endoFacts = phaseWellness?.endo_facts || []
  const phaseFocus = phaseWellness?.core_focus || ''
  const currentFact = endoFacts[currentFactIndex % Math.max(endoFacts.length, 1)]

  const loggedDays = recentLogs?.length || 0
  const progress = Math.min(100, Math.round((loggedDays / cycleLen) * 100))
  const ringCircumference = 2 * Math.PI * 54
  const ringOffset = ringCircumference - (progress / 100) * ringCircumference

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  return (
    <div className={`min-h-screen ${content.theme.bg} transition-all duration-500`}>
      <div className="max-w-lg mx-auto px-5 py-6 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
            <span className={`text-xs font-semibold ${style.text}`}>
              {style.label} Phase · Day {dayNum}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">{today}</span>
          </div>
        </div>

        {/* Greeting + Premium Badge */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{content.greeting}</h1>
            {phaseFocus && <p className="text-xs text-gray-500 mt-1">{phaseFocus}</p>}
          </div>
          {!isPremium && (
            <button onClick={onUpgrade} className="flex-shrink-0 bg-gradient-to-r from-endo-purple to-endo-pink text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full shadow-sm ml-2 hover:opacity-90">
              ⭐ Premium
            </button>
          )}
        </div>

        {/* Central Log Button with Progress Ring */}
        <div className="flex justify-center mb-6 mt-4">
          <div className="relative">
            <svg width="130" height="130" className="transform -rotate-90">
              <circle cx="65" cy="65" r="50" fill="none" stroke="#E5E7EB" strokeWidth="5" />
              <circle cx="65" cy="65" r="50" fill="none"
                stroke={content.theme.accent} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={ringCircumference} strokeDashoffset={ringOffset}
                className="transition-all duration-700 ease-out" />
            </svg>
            <button onClick={onStartLogging}
              className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-white shadow-lg hover:shadow-xl flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 border-gray-100">
              <span className="text-xl mb-0.5">{todayLogged ? '✅' : '+'}</span>
              <span className="text-[9px] font-semibold text-gray-600">{todayLogged ? 'Logged' : 'Log Now'}</span>
            </button>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-medium text-gray-400 whitespace-nowrap">
              {loggedDays}/{cycleLen} days
            </span>
          </div>
        </div>

        {/* Logging encouragement */}
        <p className="text-xs text-center text-gray-400 mb-5 -mt-2">{todayLogged ? "✅ Today logged." : loggedDays > 0 ? `Log today to complete day ${loggedDays + 1}.` : "Log your first day to start building your cycle map."}</p>

        {/* Endo-Fact Card */}
        {!endoFactDismissed && currentFact && (
          <div className={`${style.bg} rounded-xl p-3 mb-4 border ${style.border} relative`}>
            <button onClick={() => setEndoFactDismissed(true)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
            <p className={`text-[11px] leading-relaxed ${style.text} pr-4`}>
              💡 {currentFact.fact}
            </p>
            {currentFact.empowering_message && (
              <p className={`text-[10px] mt-1.5 ${style.text} opacity-80 italic`}>
                "_{currentFact.empowering_message}_"
              </p>
            )}
          </div>
        )}

        {/* Support Grid — Powered by Wellness Library */}
        <div className={content.theme.card + ' rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3'}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Support for Today</h3>
            {!isPremium && (
              <span className="text-[9px] text-endo-pink font-medium">⭐ Premium</span>
            )}
          </div>

          {/* Meal 1 */}
          {meals.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center text-lg ${style.text}`}>🍽️</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{meals[0].title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{meals[0].why_it_helps}</p>
              </div>
            </div>
          )}

          {/* Meal 2 (if available) */}
          {meals.length > 1 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center text-lg ${style.text}`}>🥗</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{meals[1].title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{meals[1].why_it_helps}</p>
              </div>
            </div>
          )}

          {/* Lifestyle Tip */}
          {tips.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center text-lg ${style.text}`}>🧘</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{tips[0].title} ({tips[0].duration})</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{tips[0].why_it_helps}</p>
              </div>
            </div>
          )}
        </div>

        {/* Cycle Data Quality */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-600">Cycle Data Quality</span>
            <span className="text-xs font-bold text-endo-purple">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, backgroundColor: content.theme.accent }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            {progress >= 80 ? "Excellent! High-confidence Doctor Report ready."
              : progress >= 50 ? "Good progress. Keep logging daily."
              : "Every log counts toward your cycle map."}
          </p>
        </div>

        {/* Empathy Message */}
        {!todayLogged && recentLogs.length === 0 && (
          <div className="mt-4"><EmpathyMessage isFirstLog={true} painLevel={0} /></div>
        )}
      </div>
    </div>
  )
}
