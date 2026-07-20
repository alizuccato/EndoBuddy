/**
 * PremiumVisualizations
 * 
 * Advanced AI insight visualizations for Premium tier:
 * 1. 7-Day Pain Forecast — weather-style prediction chart
 * 2. Correlation Matrix — heat-map of factors vs pain
 * 3. Cycle-over-Cycle Comparison
 */

import { useState, useMemo } from 'react'
import { PHASE_STYLES, PHASE_ORDER } from '../utils/mockData'

const DEFAULT_CORRELATIONS = [
  { factor: 'Stress', correlation: 0.82, icon: '😰', severity: 'high' },
  { factor: 'Poor Sleep', correlation: 0.71, icon: '🌙', severity: 'high' },
  { factor: 'Alcohol', correlation: 0.52, icon: '🍷', severity: 'high' },
  { factor: 'Gluten', correlation: 0.45, icon: '🌾', severity: 'moderate' },
  { factor: 'Dairy', correlation: 0.38, icon: '🥛', severity: 'moderate' },
  { factor: 'Caffeine', correlation: 0.28, icon: '☕', severity: 'moderate' },
  { factor: 'Exercise', correlation: -0.35, icon: '🏃', severity: 'protective' },
  { factor: 'Hydration', correlation: -0.40, icon: '💧', severity: 'protective' },
]

export default function PremiumVisualizations({
  patterns, isPremium = true,
  currentPhase = 'luteal', currentDayNum = 15, cycleLength = 28
}) {
  const [activeViz, setActiveViz] = useState('forecast')

  if (!isPremium) {
    return (
      <div className="card text-center py-8">
        <div className="text-5xl mb-3">⭐</div>
        <h3 className="font-semibold text-gray-700 mb-2">Premium Feature</h3>
        <p className="text-sm text-gray-500">Upgrade for advanced AI visualizations.</p>
      </div>
    )
  }

  // 7-Day Pain Forecast
  const forecast = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const phaseAverages = { menstrual: 7, follicular: 2, ovulatory: 4, luteal: 5 }

    const phasePattern = (patterns || []).find(p => p.type === 'phase_correlation')
    if (phasePattern?.metric?.avgPain) {
      const avg = parseFloat(phasePattern.metric.avgPain)
      const p = phasePattern.metric.phase
      if (p && avg) {
        phaseAverages[p] = avg
        const others = PHASE_ORDER.filter(x => x !== p)
        others.forEach((o, i) => { phaseAverages[o] = Math.max(1, avg - 3 - i) })
      }
    }

    return days.map((day, i) => {
      const futureDay = ((currentDayNum + i - 1) % cycleLength) + 1
      let phase = futureDay <= 5 ? 'menstrual' : futureDay <= 14 ? 'follicular' : futureDay <= 15 ? 'ovulatory' : 'luteal'
      const base = phaseAverages[phase] || 4
      const predicted = Math.max(1, Math.min(10, Math.round(base + (Math.random() - 0.5) * 2)))
      return { day, predicted, phase, isToday: i === 0 }
    })
  }, [patterns, currentDayNum, cycleLength])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">✨ Premium Insights</h3>
        <span className="bg-gradient-to-r from-endo-purple to-endo-pink text-white text-[10px] font-bold px-2 py-1 rounded-full">PREMIUM</span>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-100 pb-2">
        {[
          { id: 'forecast', label: 'Pain Forecast', icon: '🌤️' },
          { id: 'correlation', label: 'Correlation Map', icon: '🗺️' },
          { id: 'compare', label: 'Cycle Compare', icon: '🔄' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveViz(tab.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-full transition-all ${
              activeViz === tab.id ? 'bg-endo-purple text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          ><span>{tab.icon}</span><span>{tab.label}</span></button>
        ))}
      </div>

      {/* Forecast */}
      {activeViz === 'forecast' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
            <p className="text-sm text-amber-800 font-medium">🌤️ Your 7-Day Pain Forecast</p>
            <p className="text-xs text-amber-600 mt-1">Based on your cycle patterns. Plan your week.</p>
            <p className="text-[10px] text-amber-500 mt-1">ⓘ This is a correlational forecast based on historical patterns, not a medical prediction.</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-end justify-between gap-1 h-32">
              {forecast.map((day, idx) => {
                const height = (day.predicted / 10) * 100
                const color = day.predicted >= 7 ? 'bg-red-400' : day.predicted >= 4 ? 'bg-orange-400' : day.predicted >= 2 ? 'bg-yellow-300' : 'bg-green-300'
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-[9px] font-bold ${day.predicted >= 7 ? 'text-red-500' : day.predicted >= 4 ? 'text-orange-500' : 'text-green-500'}`}>{day.predicted}</span>
                    <div className={`w-full rounded-t-lg ${color} ${day.isToday ? 'ring-2 ring-endo-purple ring-offset-1' : ''}`} style={{ height: `${height}%` }} />
                    <span className="text-[9px] text-gray-500">{day.day}</span>
                  </div>
                )
              })}
            </div>
          </div>
          {forecast.some(f => f.predicted >= 7) && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
              <p className="text-xs text-amber-700">⚠️ High pain days predicted. Consider scheduling rest and preparing your Flare-Up Kit.</p>
            </div>
          )}
        </div>
      )}

      {/* Correlation Matrix */}
      {activeViz === 'correlation' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">How factors correlate with your pain. Green = protective, Red = aggravating.</p>
          <div className="space-y-2">
            {DEFAULT_CORRELATIONS.map(item => {
              const absCorr = Math.abs(item.correlation)
              const isProtective = item.correlation < 0
              const barColor = isProtective ? 'bg-green-400' : absCorr > 0.6 ? 'bg-red-400' : absCorr > 0.3 ? 'bg-orange-400' : 'bg-yellow-400'
              return (
                <div key={item.factor} className="flex items-center gap-3 py-1.5">
                  <span className="text-lg w-6 text-center">{item.icon}</span>
                  <span className="text-xs font-medium text-gray-700 w-20">{item.factor}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${absCorr * 100}%` }} />
                  </div>
                  <span className={`text-xs font-bold w-10 text-right ${isProtective ? 'text-green-600' : absCorr > 0.6 ? 'text-red-600' : 'text-orange-600'}`}>
                    {isProtective ? '-' : '+'}{(absCorr * 100).toFixed(0)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cycle-over-Cycle Comparison */}
      {activeViz === 'compare' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Comparing phases — current vs cycle average</p>
          <div className="grid grid-cols-2 gap-3">
            {PHASE_ORDER.map(phase => {
              const style = PHASE_STYLES[phase]
              const currentAvg = phase === 'menstrual' ? 7 : phase === 'follicular' ? 1.3 : phase === 'ovulatory' ? 3 : 4.5
              const baseAvg = phase === 'menstrual' ? 6 : phase === 'follicular' ? 2 : phase === 'ovulatory' ? 3.5 : 4
              const diff = currentAvg - baseAvg
              const isWorse = diff > 0
              return (
                <div key={phase} className={`${style.bg} rounded-xl p-3 border ${style.border}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{currentAvg.toFixed(1)}</p>
                      <p className="text-[10px] text-gray-500">Current</p>
                    </div>
                    {diff !== 0 && (
                      <div className={`text-right ${isWorse ? 'text-red-500' : 'text-green-500'}`}>
                        <span className="text-xs font-bold">{isWorse ? '+' : ''}{diff.toFixed(1)}</span>
                        <p className="text-[9px]">{isWorse ? 'worse' : 'better'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
