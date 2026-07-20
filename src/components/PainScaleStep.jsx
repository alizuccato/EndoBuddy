/**
 * PainScaleStep
 * 
 * Step 2 of the logging flow: Pain Assessment.
 * A 1-10 grid with color coding and empathetic descriptors.
 * Designed for large touch targets (min 44x44).
 * One-question-at-a-time approach for reduced cognitive load.
 */

import { useState, useCallback } from 'react'
import EmpathyMessage from './EmpathyMessage'

const PAIN_LEVELS = [
  { value: 1, label: 'Minimal', color: 'bg-green-400 hover:bg-green-500', textColor: 'text-green-800', zone: 'mild' },
  { value: 2, label: 'Mild', color: 'bg-green-300 hover:bg-green-400', textColor: 'text-green-800', zone: 'mild' },
  { value: 3, label: 'Uncomfortable', color: 'bg-lime-300 hover:bg-lime-400', textColor: 'text-lime-800', zone: 'mild' },
  { value: 4, label: 'Noticeable', color: 'bg-yellow-300 hover:bg-yellow-400', textColor: 'text-yellow-800', zone: 'moderate' },
  { value: 5, label: 'Distracting', color: 'bg-orange-300 hover:bg-orange-400', textColor: 'text-orange-800', zone: 'moderate' },
  { value: 6, label: 'Uncomfortable+', color: 'bg-orange-400 hover:bg-orange-500', textColor: 'text-orange-900', zone: 'moderate' },
  { value: 7, label: 'Intense', color: 'bg-red-400 hover:bg-red-500', textColor: 'text-red-900', zone: 'severe' },
  { value: 8, label: 'Severe', color: 'bg-red-500 hover:bg-red-600', textColor: 'text-white', zone: 'severe' },
  { value: 9, label: 'Excruciating', color: 'bg-red-600 hover:bg-red-700', textColor: 'text-white', zone: 'severe' },
  { value: 10, label: 'Worst Possible', color: 'bg-purple-700 hover:bg-purple-800', textColor: 'text-white', zone: 'severe' },
]

const ZONE_LABELS = {
  mild: { text: 'Manageable', color: 'text-green-600' },
  moderate: { text: 'Moderate', color: 'text-orange-600' },
  severe: { text: 'Severe', color: 'text-red-600' },
}

export default function PainScaleStep({ onSelect, selectedValue }) {
  const [hoveredValue, setHoveredValue] = useState(null)
  const displayValue = hoveredValue || selectedValue
  const zone = displayValue ? PAIN_LEVELS[displayValue - 1]?.zone : null

  const handleSelect = useCallback((value) => {
    onSelect('painLevel', value)
  }, [onSelect])

  return (
    <div className="space-y-6">
      {/* Question */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          How's your pain level?
        </h2>
        <p className="text-gray-500 text-sm">
          On a scale of 1 to 10, tap the level that fits right now
        </p>
      </div>

      {/* Pain Scale Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 max-w-md mx-auto">
        {PAIN_LEVELS.map((level) => {
          const isSelected = selectedValue === level.value
          const isHovered = hoveredValue === level.value
          const isInRange = displayValue && level.value <= displayValue
          
          return (
            <button
              key={level.value}
              onClick={() => handleSelect(level.value)}
              onMouseEnter={() => setHoveredValue(level.value)}
              onMouseLeave={() => setHoveredValue(null)}
              className={`
                relative flex flex-col items-center justify-center
                min-w-[3.5rem] min-h-[3.5rem] rounded-xl
                font-bold text-lg
                transition-all duration-150 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-endo-purple focus:ring-offset-2
                ${isSelected 
                  ? `${level.color} ${level.textColor} scale-110 shadow-lg ring-2 ring-white/50` 
                  : isInRange && zone
                    ? `${level.color} ${level.textColor} opacity-80`
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }
              `}
              aria-label={`Pain level ${level.value}: ${level.label}`}
              role="radio"
              aria-checked={isSelected}
            >
              <span className="text-xl">{level.value}</span>
              <span className="text-[10px] font-normal mt-0.5 leading-tight text-center">
                {level.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Zone Indicator */}
      {zone && (
        <div className="text-center">
          <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${
            zone === 'severe' ? 'bg-red-50 text-red-700' :
            zone === 'moderate' ? 'bg-orange-50 text-orange-700' :
            'bg-green-50 text-green-700'
          }`}>
            {ZONE_LABELS[zone].text} Pain
          </span>
        </div>
      )}

      {/* Empathetic Message */}
      {selectedValue && (
        <EmpathyMessage 
          painLevel={selectedValue} 
          isFlareUp={selectedValue >= 7}
        />
      )}

      {/* Next Button (visible on mobile — no keyboard needed) */}
      {selectedValue && (
        <div className="text-center pt-4">
          <button
            onClick={() => onSelect('_next', true)}
            className="btn-primary text-base px-10 py-3 w-full max-w-xs mx-auto shadow-lg"
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  )
}