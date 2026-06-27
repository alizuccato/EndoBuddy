/**
 * CycleInfoStep
 * 
 * Step 4 of the logging flow: Cycle/Flow information.
 * Contextual — shown during menstrual phase.
 * Asks about flow level with large touch-friendly options.
 */

import { useCallback, useState } from 'react'

const FLOW_OPTIONS = [
  { value: 'spotting', label: 'Spotting', icon: '💧', description: 'Very light, barely noticeable' },
  { value: 'light', label: 'Light', icon: '🩸', description: 'Pantyliner or light pad' },
  { value: 'medium', label: 'Medium', icon: '🩸🩸', description: 'Regular pad or tampon' },
  { value: 'heavy', label: 'Heavy', icon: '🩸🩸🩸', description: 'Soaking through quickly; large clots' },
]

export default function CycleInfoStep({ onSelect, selectedFlow, onNext, onSkip, isPeriodDay }) {
  const handleSelect = useCallback((value) => {
    onSelect('flowLevel', value)
  }, [onSelect])

  return (
    <div className="space-y-6">
      {/* Question */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isPeriodDay ? "How's your flow today?" : "Any cycle updates?"}
        </h2>
        <p className="text-gray-500 text-sm">
          {isPeriodDay 
            ? "Knowing your flow helps track patterns in bleeding and pain"
            : "Skip if nothing to report — this is optional"}
        </p>
      </div>

      {/* Flow Options */}
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
        {FLOW_OPTIONS.map((option) => {
          const isSelected = selectedFlow === option.value
          
          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`
                flex flex-col items-center justify-center
                p-4 rounded-xl min-h-[5rem]
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-endo-purple focus:ring-offset-2
                ${isSelected
                  ? 'bg-endo-pink/10 border-2 border-endo-pink shadow-md'
                  : 'bg-gray-50 border-2 border-gray-100 hover:border-endo-pink/30 hover:bg-endo-pink/5'
                }
              `}
              role="radio"
              aria-checked={isSelected}
            >
              <span className="text-2xl mb-1">{option.icon}</span>
              <span className={`font-semibold text-sm ${isSelected ? 'text-endo-pink' : 'text-gray-800'}`}>
                {option.label}
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5 text-center leading-tight">
                {option.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* Heavy flow note */}
      {selectedFlow === 'heavy' && (
        <div className="bg-red-50 rounded-xl p-3 text-center max-w-sm mx-auto">
          <p className="text-sm text-red-700">
            Soaking through pads/tampons every 1-2 hours or passing large clots? 
            That's worth mentioning to your doctor.
          </p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-center gap-3">
        <button onClick={onSkip} className="px-6 py-2.5 text-sm text-gray-500 hover:text-gray-700 font-medium">
          Skip this
        </button>
        <button
          onClick={onNext}
          className="btn-primary text-base px-10 py-2.5"
        >
          {selectedFlow ? 'Continue' : 'No cycle updates'}
        </button>
      </div>
    </div>
  )
}