/**
 * LifestyleFactorsStep
 *
 * Optional step in the logging flow: quick yes/no toggles for lifestyle
 * factors (sleep, stress, alcohol, caffeine, hydration, exercise,
 * gluten, dairy), used to power the Correlation Map in Premium >
 * Visualizations. Free to log for everyone — only *seeing* the
 * resulting correlations is Premium.
 *
 * Entirely skippable: tapping "Skip" moves on without recording
 * anything for this log (stored as NULL server-side, meaning "not
 * logged" — see toLifestyleColumns in src/utils/lifestyleFactors.js).
 * Tapping "Next" after engaging with the toggles (even with none
 * turned on) records a real "no" for every factor left off. That
 * distinction is what keeps the Correlation Map's math honest — see
 * the same file for why.
 */

import { LIFESTYLE_FACTORS } from '../utils/lifestyleFactors'

export default function LifestyleFactorsStep({ factors = {}, onSelect, onNext, onSkip }) {
  const toggleFactor = (bodyKey) => {
    onSelect('lifestyleFactors', { ...factors, [bodyKey]: !factors[bodyKey] })
  }

  const selectedCount = Object.values(factors).filter(Boolean).length

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Anything else going on today?
        </h2>
        <p className="text-gray-500 text-sm">
          Tap what applies — totally optional, helps spot patterns over time
        </p>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="grid grid-cols-3 gap-2">
          {LIFESTYLE_FACTORS.map((factor) => {
            const isSelected = !!factors[factor.bodyKey]
            return (
              <button
                key={factor.key}
                onClick={() => toggleFactor(factor.bodyKey)}
                className={`
                  flex flex-col items-center justify-center
                  min-h-[4rem] p-2 rounded-xl
                  text-sm font-medium
                  transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-endo-purple focus:ring-offset-1
                  ${isSelected
                    ? 'bg-endo-purple text-white shadow-md scale-[1.02]'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm border border-gray-100'
                  }
                `}
                role="checkbox"
                aria-checked={isSelected}
              >
                <span className="text-2xl mb-1">{factor.icon}</span>
                <span className="text-[11px] leading-tight text-center">{factor.label}</span>
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 text-center">
          {selectedCount > 0 ? `${selectedCount} selected` : 'Nothing selected yet — that\'s fine too'}
        </p>
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={onSkip} className="px-6 py-2.5 text-sm text-gray-500 font-medium">
          Skip
        </button>
        <button onClick={onNext} className="btn-primary px-8 py-2.5">
          Next
        </button>
      </div>
    </div>
  )
}
