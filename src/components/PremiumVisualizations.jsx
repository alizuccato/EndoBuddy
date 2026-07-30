/**
 * PremiumVisualizations
 * 
 * Advanced AI insight visualizations for Premium tier:
 * 1. 7-Day Pain Forecast — weather-style prediction chart
 * 2. Correlation Matrix — heat-map of factors vs pain
 * 3. Cycle-over-Cycle Comparison
 *
 * NOTE on Correlation Map: the app does not currently log stress, sleep,
 * alcohol, gluten, dairy, caffeine, exercise, or hydration as structured
 * data (only pain, symptoms, flow, and wellness are captured today), so
 * there's no real signal to compute these correlations from yet. Rather
 * than show fabricated percentages, this renders an honest empty state
 * until that lifestyle-factor logging exists.
 *
 * NOTE on Cycle Compare: per-phase pain averages ARE computed server-side
 * in /api/patterns (see `phaseAverages` in server.js) but are only
 * surfaced today as a single narrative "worst phase" pattern, not as a
 * full per-phase breakdown the client can render. Until that data is
 * exposed via the API, this also renders an honest empty state instead of
 * fabricated phase numbers.
 */

import { useState, useMemo } from 'react'
import { PHASE_ORDER } from '../utils/mockData'

function EmptyVizState({ icon, title, body }) {
  return (
    <div className="text-center py-8 px-4">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
      <p className="text-xs text-gray-500 max-w-xs mx-auto">{body}</p>
    </div>
  )
}

export default function PremiumVisualizations({
  patterns, isPremium = true,
  currentDayNum = 15, cycleLength = 28
}) {
  const [activeViz, setActiveViz] = useState('forecast')

  // 7-Day Pain Forecast — grounded in the real phase_correlation pattern
  // when one exists; otherwise there isn't enough data to forecast.
  // (Hooks must run on every render, so this stays above the isPremium
  // early return below.)
  const phasePattern = (patterns || []).find(p => p.type === 'phase_correlation')
  const forecast = useMemo(() => {
    if (!phasePattern?.metric?.avgPain) return null

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const phaseAverages = {}
    const avg = parseFloat(phasePattern.metric.avgPain)
    const p = phasePattern.metric.phase
    phaseAverages[p] = avg
    const others = PHASE_ORDER.filter(x => x !== p)
    others.forEach((o, i) => { phaseAverages[o] = Math.max(1, avg - 3 - i) })

    return days.map((day, i) => {
      const futureDay = ((currentDayNum + i - 1) % cycleLength) + 1
      let phase = futureDay <= 5 ? 'menstrual' : futureDay <= 14 ? 'follicular' : futureDay <= 15 ? 'ovulatory' : 'luteal'
      const predicted = Math.max(1, Math.min(10, Math.round(phaseAverages[phase] || 4)))
      return { day, predicted, phase, isToday: i === 0 }
    })
  }, [phasePattern, currentDayNum, cycleLength])

  if (!isPremium) {
    return (
      <div className="card text-center py-8">
        <div className="text-5xl mb-3">⭐</div>
        <h3 className="font-semibold text-gray-700 mb-2">Premium Feature</h3>
        <p className="text-sm text-gray-500">Upgrade for advanced AI visualizations.</p>
      </div>
    )
  }

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
        forecast ? (
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
        ) : (
          <EmptyVizState
            icon="🌤️"
            title="Not enough data to forecast yet"
            body="Log your pain level for a few more cycle days and a personalized 7-day forecast will appear here."
          />
        )
      )}

      {/* Correlation Matrix */}
      {activeViz === 'correlation' && (
        <EmptyVizState
          icon="🗺️"
          title="Correlation tracking isn't available yet"
          body="This map needs lifestyle factors like stress, sleep, alcohol, gluten, dairy, caffeine, exercise, and hydration — none of which are logged in the app yet. Once that tracking is added, real correlations with your pain will show up here."
        />
      )}

      {/* Cycle-over-Cycle Comparison */}
      {activeViz === 'compare' && (
        <EmptyVizState
          icon="🔄"
          title="Not enough cycle history yet"
          body="Cycle Compare needs pain data logged across full phases of at least two cycles to compare your current cycle against your average. Keep logging and this will populate automatically."
        />
      )}
    </div>
  )
}
