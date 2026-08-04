/**
 * PremiumExercises
 *
 * Phase-specific full exercise & movement library with intensity filtering.
 * Content lives in src/data/premium-exercises.js — each entry has an image
 * slot, equipment, step-by-step guidance, benefits, and a gentler modification
 * for flare or high-pain days.
 */

import { useState, useMemo } from 'react'
import { PHASE_STYLES } from '../utils/mockData'
import EXERCISES from '../data/premium-exercises'
import ImageWithFallback from './ImageWithFallback'

const INTENSITY_FILTERS = [
  { id: 'gentle', label: 'Gentle', icon: '🌙' },
  { id: 'moderate', label: 'Moderate', icon: '🚶' },
  { id: 'active', label: 'Active', icon: '🏃' },
]

const INTENSITY_ICON = { gentle: '🌙', moderate: '🚶', active: '🏃' }

export default function PremiumExercises({ currentPhase, isPremium = true }) {
  const [activeIntensity, setActiveIntensity] = useState(null)
  const [expandedExercise, setExpandedExercise] = useState(null)
  const [gentleDayMode, setGentleDayMode] = useState(false)

  const phase = currentPhase || 'luteal'
  const phaseStyle = PHASE_STYLES[phase] || PHASE_STYLES.luteal
  const allExercises = EXERCISES[phase] || EXERCISES.luteal

  const visibleExercises = useMemo(() => {
    let list = allExercises
    if (gentleDayMode) list = list.filter(e => e.intensity === 'gentle')
    else if (activeIntensity) list = list.filter(e => e.intensity === activeIntensity)
    return list
  }, [allExercises, activeIntensity, gentleDayMode])

  if (!isPremium) {
    return (
      <div className="card text-center py-8">
        <div className="text-5xl mb-3">⭐</div>
        <h3 className="font-semibold text-gray-700 mb-2">Premium Feature</h3>
        <p className="text-sm text-gray-500">Upgrade to Premium for the full phase-specific movement library.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Phase Context Bar */}
      <div className={`${phaseStyle.bg} -mx-6 -mt-6 px-6 py-3 mb-4 border-b ${phaseStyle.border}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-xs font-semibold ${phaseStyle.text}`}>{phaseStyle.label} Phase</span>
            <p className="text-sm text-gray-600 mt-0.5">{allExercises.length} movement guides for this phase</p>
          </div>
          <span className="bg-white/80 text-xs font-medium px-2 py-1 rounded-full text-endo-purple">⭐ Premium</span>
        </div>
      </div>

      {/* Intensity Filters */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {INTENSITY_FILTERS.map(f => (
          <button
            key={f.id}
            disabled={gentleDayMode}
            onClick={() => setActiveIntensity(prev => prev === f.id ? null : f.id)}
            className={`text-xs px-3 py-1.5 rounded-full transition-all flex items-center gap-1 ${
              gentleDayMode ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400' :
              activeIntensity === f.id
                ? 'bg-endo-purple text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{f.icon}</span>{f.label}
          </button>
        ))}
      </div>

      {/* Gentle Day Mode Toggle */}
      <div className="flex items-center justify-between mb-4 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">🩹</span>
          <div>
            <p className="text-sm font-medium text-amber-800">Gentle Day Mode</p>
            <p className="text-xs text-amber-600">Show only the gentlest, flare-friendly options</p>
          </div>
        </div>
        <button
          onClick={() => setGentleDayMode(prev => !prev)}
          className={`relative w-12 h-6 rounded-full transition-colors ${gentleDayMode ? 'bg-amber-500' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${gentleDayMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Exercise Cards */}
      <div className="space-y-3">
        {visibleExercises.map(exercise => {
          const isExpanded = expandedExercise === exercise.id
          return (
            <div key={exercise.id} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <ImageWithFallback
                  src={exercise.image}
                  alt={exercise.title}
                  icon={INTENSITY_ICON[exercise.intensity] || '🌿'}
                  className="w-14 h-14 rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{exercise.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{exercise.duration} · <span className="capitalize">{exercise.intensity}</span></p>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  <ImageWithFallback
                    src={exercise.image}
                    alt={exercise.title}
                    icon={INTENSITY_ICON[exercise.intensity] || '🌿'}
                    className="w-full h-40 rounded-lg"
                  />

                  <p className="text-xs text-gray-500 leading-relaxed">{exercise.description}</p>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>⏱️ {exercise.duration}</span>
                    <span className="capitalize">{INTENSITY_ICON[exercise.intensity]} {exercise.intensity}</span>
                  </div>

                  {exercise.equipment?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">What you'll need</p>
                      <div className="flex flex-wrap gap-1.5">
                        {exercise.equipment.map(item => (
                          <span key={item} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1.5">Steps</p>
                    <ol className="space-y-1.5">
                      {exercise.steps?.map((step, idx) => (
                        <li key={idx} className="text-xs text-gray-600 leading-relaxed flex gap-2">
                          <span className="font-semibold text-endo-purple flex-shrink-0">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {exercise.benefits?.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Benefits</p>
                      <ul className="space-y-0.5">
                        {exercise.benefits.map(b => (
                          <li key={b} className="text-xs text-gray-500 flex gap-1.5">
                            <span className="text-endo-purple">•</span><span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {exercise.gentleModification && (
                    <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-800 mb-1">🩹 Gentle day modification</p>
                      <p className="text-xs text-amber-700 leading-relaxed">{exercise.gentleModification}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {visibleExercises.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No exercises match the current filter.</p>
        )}
      </div>

      <p className="text-[11px] text-gray-400 italic leading-relaxed mt-4">
        These are general wellness suggestions, not medical advice. Stop any movement that increases pain and check with your care team before starting a new routine, especially post-surgery.
      </p>
    </div>
  )
}
