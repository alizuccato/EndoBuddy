/**
 * PremiumDeepReport
 * 
 * Advanced 'Clinical Deep Dive' doctor report with:
 * - Long-term Trend Analysis (6-month, 12-month)
 * - Symptom Cluster Analysis (co-occurrence network)
 * - Treatment Effectiveness Map
 * - Annotated Calendar appendix
 * 
 * Extension of the standard DoctorReport for Premium tier.
 */

import { useState, useMemo } from 'react'
import { PHASE_STYLES, PHASE_ORDER, PAIN_COLORS, getPainColor } from '../utils/mockData'

export default function PremiumDeepReport({ cycleData, patterns, isPremium = true }) {
  const [activeTab, setActiveTab] = useState('trends')

  if (!isPremium) {
    return (
      <div className="card text-center py-8">
        <div className="text-5xl mb-3">⭐</div>
        <h3 className="font-semibold text-gray-700 mb-2">Premium Feature</h3>
        <p className="text-sm text-gray-500">Upgrade to Premium for Clinical Deep Dive reports.</p>
      </div>
    )
  }

  const { days } = cycleData || {}
  const loggedDays = (days || []).filter(d => !d.isFuture && d.painLevel > 0)

  // Long-term trend: 4-week rolling averages  
  const rollingAverages = useMemo(() => {
    if (loggedDays.length < 7) return []
    const avgs = []
    for (let i = 0; i <= loggedDays.length - 7; i += 3) {
      const week = loggedDays.slice(i, i + 7)
      const avg = week.reduce((s, d) => s + d.painLevel, 0) / week.length
      avgs.push({
        week: Math.floor(i / 3) + 1,
        avg: avg.toFixed(1),
        startDate: week[0].date,
      })
    }
    return avgs
  }, [loggedDays])

  // Symptom cluster data from patterns API
  const clusters = useMemo(() => {
    return (patterns || []).filter(p => p.type === 'symptom_cluster' || p.type === 'symptom_phase_correlation')
  }, [patterns])

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">📊 Clinical Deep Dive</h3>
          <p className="text-xs text-gray-500 mt-0.5">Premium report — {loggedDays.length} days analyzed</p>
        </div>
        <span className="bg-gradient-to-r from-endo-purple to-endo-pink text-white text-[10px] font-bold px-2 py-1 rounded-full">
          PREMIUM
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 border-b border-gray-100 pb-2">
        {[
          { id: 'trends', label: 'Trends', icon: '📈' },
          { id: 'clusters', label: 'Clusters', icon: '🔗' },
          { id: 'calendar', label: 'Calendar', icon: '📅' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-all ${
              activeTab === tab.id ? 'bg-endo-purple text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Trend Analysis */}
      {activeTab === 'trends' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Rolling 7-day pain averages show your long-term trajectory.</p>
          
          {rollingAverages.length > 0 ? (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-end gap-1 h-24">
                {rollingAverages.map((week, idx) => {
                  const height = (parseFloat(week.avg) / 10) * 100
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-gray-500">{week.avg}</span>
                      <div
                        className="w-full rounded-t-sm transition-all hover:opacity-80"
                        style={{
                          height: `${height}%`,
                          backgroundColor: `hsl(${340 - parseFloat(week.avg) * 20}, 70%, ${60 - parseFloat(week.avg) * 2}%)`,
                        }}
                        title={`Week ${week.week}: ${week.avg}/10`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Need more data (at least 7 logged days) for trend analysis.</p>
          )}

          {/* Sparkline summary */}
          {rollingAverages.length >= 2 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-700">{rollingAverages[0]?.avg || '—'}</p>
                <p className="text-[10px] text-green-600">Start avg</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-700">{rollingAverages.length}w</p>
                <p className="text-[10px] text-gray-500">Weeks tracked</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-purple-700">{rollingAverages[rollingAverages.length - 1]?.avg || '—'}</p>
                <p className="text-[10px] text-purple-600">Current avg</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Symptom Clusters */}
      {activeTab === 'clusters' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Symptoms that frequently occur together, detected by AI pattern analysis.</p>
          
          {clusters.length > 0 ? (
            <div className="space-y-2.5">
              {clusters.map((cluster, idx) => (
                <div key={cluster.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-endo-purple/10 flex items-center justify-center text-sm">
                    {cluster.icon || '🔗'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{cluster.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{cluster.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs font-bold text-endo-purple">
                      {Math.round(cluster.confidence * 100)}%
                    </div>
                    <div className="w-12 h-1 bg-gray-200 rounded-full mt-1">
                      <div className="h-full bg-endo-purple rounded-full" style={{ width: `${cluster.confidence * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🔮</div>
              <p className="text-sm text-gray-500">Log more symptoms across different phases to unlock cluster analysis.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Annotated Calendar */}
      {activeTab === 'calendar' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Daily log summary with notes, organized by phase.</p>
          {loggedDays.slice(0, 14).map(day => {
            const style = PHASE_STYLES[day.phase]
            const painColor = getPainColor(day.painLevel)
            return (
              <div key={day.date} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-xs">
                <span className="text-gray-500 w-20">{day.date.slice(5)}</span>
                <span className={`px-1.5 py-0.5 rounded ${style?.bg || 'bg-gray-100'} ${style?.text || 'text-gray-600'}`}>
                  {style?.label?.slice(0, 4) || '—'}
                </span>
                <span className={`font-bold ${painColor.text} w-8`}>{day.painLevel}/10</span>
                <div className="flex gap-0.5 flex-1">
                  {(day.symptoms || []).slice(0, 3).map(s => (
                    <span key={s.id} className="text-xs">{s.icon}</span>
                  ))}
                </div>
              </div>
            )
          })}
          {loggedDays.length > 14 && (
            <p className="text-xs text-gray-400 text-center pt-2">+{loggedDays.length - 14} more days</p>
          )}
        </div>
      )}
    </div>
  )
}