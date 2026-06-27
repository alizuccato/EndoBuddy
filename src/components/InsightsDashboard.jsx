/**
 * InsightsDashboard
 * 
 * Main dashboard view combining Cycle Map, AI Insight Cards, and Symptom Heatmap.
 * Layout hierarchy (from insights-ui-design.md):
 *   1. Header - Phase Indicator, Period Prediction
 *   2. Primary Visual - The Cycle Map
 *   3. Secondary - AI Insight Cards
 *   4. Tertiary - Symptom Heatmap
 * 
 * Includes phase-specific wellness prompts and context.
 */

import { useState, useMemo } from 'react'
import CycleMap from './CycleMap'
import SymptomHeatmap from './SymptomHeatmap'
import { InsightCardList } from './InsightCard'
import { mockCycleData, mockInsights, PHASE_STYLES } from '../utils/mockData'

export default function InsightsDashboard({ cycleData, insights, onInsightAction }) {
  const data = cycleData || mockCycleData
  const insightList = insights || mockInsights
  
  const currentPhaseStyle = PHASE_STYLES[data.currentPhase] || PHASE_STYLES.menstrual
  
  // Calculate next period prediction
  const prediction = useMemo(() => {
    const startDate = new Date(data.cycleStartDate || Date.now())
    const cycleLen = data.cycleLength || 28
    const nextPeriod = new Date(startDate.getTime() + cycleLen * 86400000)
    const daysUntil = Math.ceil((nextPeriod.getTime() - Date.now()) / 86400000)
    
    return {
      nextPeriodDate: nextPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      daysUntil: daysUntil > 0 ? daysUntil : 0,
      isImminent: daysUntil <= 3 && daysUntil >= 0,
    }
  }, [data.cycleStartDate, data.cycleLength])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-6">
      {/* Header: Phase Indicator + Prediction */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📊 Insights</h2>
          <p className="text-sm text-gray-500 mt-1">
            Patterns and predictions based on your logged data
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Phase badge */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${currentPhaseStyle.bg} ${currentPhaseStyle.border} border`}>
            <div className={`w-2.5 h-2.5 rounded-full ${currentPhaseStyle.dot}`} />
            <span className={`text-sm font-semibold ${currentPhaseStyle.text}`}>
              {currentPhaseStyle.label}
            </span>
          </div>
          
          {/* Period prediction */}
          <div className={`px-3 py-2 rounded-xl border ${prediction.isImminent ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <span className="text-sm">📅</span>
              <div>
                <p className={`text-xs font-semibold ${prediction.isImminent ? 'text-rose-600' : 'text-gray-700'}`}>
                  {prediction.isImminent ? 'Expected soon' : `In ${prediction.daysUntil} days`}
                </p>
                <p className="text-[10px] text-gray-500">Next period: {prediction.nextPeriodDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phase context message */}
      <div className={`${currentPhaseStyle.bg} rounded-xl px-4 py-3 border ${currentPhaseStyle.border}`}>
        <p className={`text-sm ${currentPhaseStyle.text}`}>
          <span className="font-semibold">{currentPhaseStyle.label} Phase: </span>
          {currentPhaseStyle.description}
          {data.currentDayNum && (
            <span className="block text-xs mt-0.5 opacity-75">
              You are on Day {data.currentDayNum} of your cycle
            </span>
          )}
        </p>
      </div>

      {/* Primary Visual: Cycle Map */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-gray-900 text-sm">Cycle Map</h3>
          <span className="text-[10px] text-gray-400">Tap phases & days for details</span>
        </div>
        <div className="flex justify-center">
          <CycleMap cycleData={data} />
        </div>
      </section>

      {/* Secondary: AI Insight Cards */}
      <section>
        <InsightCardList
          insights={insightList}
          onAction={onInsightAction}
          maxCards={3}
        />
      </section>

      {/* Tertiary: Symptom Heatmap */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm">Symptom Heatmap</h3>
            <span className="text-[10px] text-gray-400">Tap a day for details</span>
          </div>
        </div>
        <SymptomHeatmap cycleData={data} />
      </section>

      {/* Data summary footer */}
      <div className="text-center pt-2 pb-4">
        <p className="text-[11px] text-gray-400">
          Based on {data.days?.filter(d => !d.isFuture).length || 0} days of tracked data ·
          Last cycle: {data.cycleLength} days ·
          <button className="text-endo-purple hover:underline ml-1">View Doctor Report</button>
        </p>
      </div>
    </div>
  )
}