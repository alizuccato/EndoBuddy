/**
 * PremiumVisualizations
 * 
 * Advanced AI insight visualizations for Premium tier:
 * 1. 7-Day Pain Forecast — weather-style prediction chart
 * 2. Correlation Matrix — heat-map of factors vs pain
 * 3. Cycle-over-Cycle Comparison
 *
 * NOTE on Correlation Map: lifestyle factors (sleep, stress, alcohol,
 * caffeine, hydration, exercise, gluten, dairy) are now logged via the
 * optional Lifestyle step in the logging flow (see LifestyleFactorsStep
 * and src/utils/lifestyleFactors.js), and GET /api/patterns computes a
 * `lifestyle_correlation` pattern per factor once there's enough data
 * (>=3 logged days on each side of "yes"/"no" for that factor). This
 * renders those, same as the phase-correlation forecast above it.
 *
 * NOTE on Cycle Compare: per-phase pain averages ARE computed server-side
 * in /api/patterns (see `phaseAverages` in server.js), and — now that
 * cycle_phase is actually persisted on every log (previously it was
 * always null; see the dateHelpers.js/server.js fix) — there's real data
 * to compare a cycle against. Rather than add a second server round-trip,
 * this computes the same kind of per-phase averages client-side from the
 * `days` prop (already fetched for the rest of the app), the same way
 * PremiumDeepReport does its rolling averages.
 */

import { useState, useMemo } from 'react'
import { PHASE_ORDER } from '../utils/mockData'

const PHASE_LABELS = { menstrual: 'Menstrual', follicular: 'Follicular', ovulatory: 'Ovulatory', luteal: 'Luteal' }

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
  patterns, days, isPremium = true,
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

  // Cycle Compare — current cycle's per-phase pain averages vs. your
  // all-time per-phase averages. "Current cycle" is everything logged
  // from (today - (currentDayNum - 1) days) onward, i.e. since this
  // cycle's day 1, computed the same way App.jsx derives currentDayNum
  // in the first place.
  const cycleCompare = useMemo(() => {
    const loggedDays = (days || []).filter(d => !d.isFuture && d.painLevel > 0 && d.phase)
    if (loggedDays.length < 5 || !currentDayNum) return null

    const today = new Date()
    const cycleStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (currentDayNum - 1))
    const cycleStartStr = `${cycleStart.getFullYear()}-${String(cycleStart.getMonth() + 1).padStart(2, '0')}-${String(cycleStart.getDate()).padStart(2, '0')}`

    const allTimeByPhase = {}
    const currentByPhase = {}
    for (const d of loggedDays) {
      if (!allTimeByPhase[d.phase]) allTimeByPhase[d.phase] = []
      allTimeByPhase[d.phase].push(d.painLevel)
      if (d.date >= cycleStartStr) {
        if (!currentByPhase[d.phase]) currentByPhase[d.phase] = []
        currentByPhase[d.phase].push(d.painLevel)
      }
    }

    const currentPhases = Object.keys(currentByPhase)
    if (currentPhases.length === 0) return null

    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length
    const rows = PHASE_ORDER
      .filter(phase => currentByPhase[phase])
      .map(phase => ({
        phase,
        currentAvg: avg(currentByPhase[phase]),
        allTimeAvg: avg(allTimeByPhase[phase]),
        currentCount: currentByPhase[phase].length,
        allTimeCount: allTimeByPhase[phase].length,
      }))

    return rows
  }, [days, currentDayNum])

  // Correlation Map — lifestyle_correlation patterns computed server-side
  // in GET /api/patterns (see server.js), one per factor that has enough
  // logged data on both sides to be meaningful. Sorted so the strongest
  // correlations (by absolute % difference) surface first.
  const lifestyleCorrelations = useMemo(() => {
    return (patterns || [])
      .filter(p => p.type === 'lifestyle_correlation')
      .slice()
      .sort((a, b) => Math.abs(b.metric?.diffPct || 0) - Math.abs(a.metric?.diffPct || 0))
  }, [patterns])

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
                  // Capped at 80% (not 100%) so there's always headroom
                  // above the tallest bar for the number label sitting
                  // on top of it, even at a predicted pain level of 10.
                  const height = Math.min(80, (day.predicted / 10) * 100)
                  const color = day.predicted >= 7 ? 'bg-red-400' : day.predicted >= 4 ? 'bg-orange-400' : day.predicted >= 2 ? 'bg-yellow-300' : 'bg-green-300'
                  return (
                    // h-full + justify-end (rather than the previous
                    // content-sized column, sized only by items-end on
                    // the parent) gives this column a definite height to
                    // measure against. Without that, the bar's
                    // `height: X%` below had no definite containing
                    // block to resolve percentages against — CSS spec
                    // treats that as 0, so every bar silently rendered
                    // at zero height. Only the number label above it was
                    // ever visible, which is exactly what showed up as
                    // "just numbers, no graph."
                    <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
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
        lifestyleCorrelations.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 px-1">Average pain on days you logged each factor vs. days you didn't.</p>
            {lifestyleCorrelations.map(p => {
              const m = p.metric
              const isHigher = m.diffPct > 0
              return (
                <div key={p.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">{m.icon} {m.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isHigher ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {isHigher ? '▲' : '▼'} {Math.abs(m.diffPct)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>Days with: <strong className="text-gray-900">{m.avgWith}/10</strong> ({m.withCount})</span>
                    <span className="text-gray-300">|</span>
                    <span>Days without: <strong className="text-gray-900">{m.avgWithout}/10</strong> ({m.withoutCount})</span>
                  </div>
                </div>
              )
            })}
            <p className="text-[10px] text-gray-400 px-1">ⓘ Correlational, not causal — these reflect patterns in your own logged data, not a medical diagnosis. Keep logging for more reliable results.</p>
          </div>
        ) : (
          <EmptyVizState
            icon="🗺️"
            title="Not enough lifestyle data logged yet"
            body="Use the optional Lifestyle step when logging (sleep, stress, alcohol, caffeine, hydration, exercise, gluten, dairy) — once a factor has at least 3 logged days each with and without it, its correlation with your pain will show up here."
          />
        )
      )}

      {/* Cycle-over-Cycle Comparison */}
      {activeViz === 'compare' && (
        cycleCompare ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 px-1">This cycle's pain by phase, compared to your all-time average for that phase.</p>
            {cycleCompare.map(row => {
              const delta = row.currentAvg - row.allTimeAvg
              const deltaAbs = Math.abs(delta).toFixed(1)
              const isHigher = delta > 0.3
              const isLower = delta < -0.3
              return (
                <div key={row.phase} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">{PHASE_LABELS[row.phase] || row.phase}</span>
                    {(isHigher || isLower) && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isHigher ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {isHigher ? '▲' : '▼'} {deltaAbs} vs. average
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>This cycle: <strong className="text-gray-900">{row.currentAvg.toFixed(1)}/10</strong> ({row.currentCount} day{row.currentCount === 1 ? '' : 's'})</span>
                    <span className="text-gray-300">|</span>
                    <span>All-time: <strong className="text-gray-900">{row.allTimeAvg.toFixed(1)}/10</strong> ({row.allTimeCount} day{row.allTimeCount === 1 ? '' : 's'})</span>
                  </div>
                </div>
              )
            })}
            <p className="text-[10px] text-gray-400 px-1">Based on logged pain levels, grouped by cycle phase. More logged days (especially across multiple full cycles) will make this comparison more reliable.</p>
          </div>
        ) : (
          <EmptyVizState
            icon="🔄"
            title="Not enough cycle history yet"
            body="Cycle Compare needs pain logged (with a computed cycle phase) in your current cycle, plus at least 5 logged days overall, to compare against your average. Keep logging and this will populate automatically."
          />
        )
      )}
    </div>
  )
}
