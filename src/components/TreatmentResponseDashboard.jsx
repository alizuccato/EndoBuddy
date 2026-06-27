/**
 * TreatmentResponseDashboard
 * 
 * Tracks treatment effectiveness over time — medications, physical therapy, supplements, etc.
 * Uses clinical logic from clinical-logic-advanced-reports.md (Section 2).
 * Color-coded cards (green/yellow/red) per treatment with before/during/after timeline.
 */

import { useState, useMemo } from 'react'

const MOCK_TREATMENTS = [
  {
    id: 1, name: 'Norethindrone 5mg', type: 'medication', startDate: '12 weeks ago',
    painBefore: 6.8, painDuring: 4.5, peakBefore: 9, peakDuring: 5,
    flareBefore: 4, flareDuring: 1, qolBefore: 4, qolDuring: 7,
    adherence: 94, sideEffectBurden: 15,
    sideEffects: 'Occasional breakthrough bleeding',
    verdict: 'effective',
  },
  {
    id: 2, name: 'Pelvic Floor PT (weekly)', type: 'physical_therapy', startDate: '8 weeks ago',
    painBefore: 6.5, painDuring: 5.5, peakBefore: 8, peakDuring: 6,
    flareBefore: 3, flareDuring: 2, qolBefore: 4, qolDuring: 6,
    adherence: 88, sideEffectBurden: 0,
    sideEffects: 'None',
    verdict: 'moderate',
  },
  {
    id: 3, name: 'Ibuprofen 600mg PRN', type: 'medication', startDate: 'PRN',
    painBefore: null, painDuring: null, peakBefore: null, peakDuring: null,
    flareBefore: null, flareDuring: null, qolBefore: null, qolDuring: null,
    adherence: null, sideEffectBurden: 0,
    sideEffects: 'None',
    verdict: 'rescue',
    rescueUseBefore: '3x/week', rescueUseDuring: '1x/week',
    rescueEffectiveness: '-2 points within 1 hour',
  },
  {
    id: 4, name: 'Lo Loestrin FE', type: 'medication', startDate: '4 months (stopped)',
    painBefore: 7.2, painDuring: 6.8, peakBefore: 9, peakDuring: 8,
    flareBefore: 5, flareDuring: 4, qolBefore: 3, qolDuring: 3.5,
    adherence: 92, sideEffectBurden: 40,
    sideEffects: 'Nausea, mood swings',
    verdict: 'stopped',
    stoppedReason: 'Ineffective, side effects',
  },
]

function VerdictBadge({ verdict }) {
  const styles = {
    effective: 'bg-green-100 text-green-700 border-green-200',
    moderate: 'bg-amber-100 text-amber-700 border-amber-200',
    stopped: 'bg-red-100 text-red-700 border-red-200',
    rescue: 'bg-blue-100 text-blue-700 border-blue-200',
  }
  const labels = {
    effective: '✅ Effective',
    moderate: '⚡ Moderate',
    stopped: '❌ Stopped',
    rescue: '💊 Rescue',
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles[verdict]}`}>
      {labels[verdict]}
    </span>
  )
}

function MetricCard({ label, before, during, suffix = '', format = 'number' }) {
  if (before === null || during === null) return null
  const delta = before - during
  const isImprovement = delta > 0
  return (
    <div className="bg-white rounded-lg p-2.5 border border-gray-100">
      <p className="text-[10px] text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400 line-through">{format === 'pct' ? `${before}%` : `${before}${suffix}`}</span>
        <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <span className={`text-sm font-bold ${isImprovement ? 'text-green-600' : 'text-red-500'}`}>
          {format === 'pct' ? `${during}%` : `${during}${suffix}`}
        </span>
        {delta !== 0 && (
          <span className={`text-[10px] font-medium ${isImprovement ? 'text-green-500' : 'text-red-400'}`}>
            ({isImprovement ? '-' : '+'}{Math.abs(delta).toFixed(1)})
          </span>
        )}
      </div>
    </div>
  )
}

export default function TreatmentResponseDashboard() {
  const [expandedTreatment, setExpandedTreatment] = useState(null)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">💊 Treatment Response Dashboard</h3>
          <p className="text-xs text-gray-500 mt-0.5">Track what's working — and what isn't</p>
        </div>
        <span className="bg-gradient-to-r from-endo-purple to-endo-pink text-white text-[10px] font-bold px-2 py-1 rounded-full">PREMIUM</span>
      </div>

      <div className="space-y-3">
        {MOCK_TREATMENTS.map((treatment) => {
          const isExpanded = expandedTreatment === treatment.id
          const borderColor = treatment.verdict === 'effective' ? 'border-green-200' :
                              treatment.verdict === 'moderate' ? 'border-amber-200' :
                              treatment.verdict === 'stopped' ? 'border-red-200' : 'border-blue-200'

          return (
            <div key={treatment.id} className={`border rounded-xl overflow-hidden ${borderColor}`}>
              <button
                onClick={() => setExpandedTreatment(isExpanded ? null : treatment.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{treatment.type === 'medication' ? '💊' : '🧘'}</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800">{treatment.name}</p>
                    <p className="text-[10px] text-gray-500">{treatment.startDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <VerdictBadge verdict={treatment.verdict} />
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
                  {treatment.verdict === 'rescue' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-[10px] text-blue-600 mb-0.5">Before: rescue use</p>
                        <p className="text-sm font-bold text-blue-800">{treatment.rescueUseBefore}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-[10px] text-blue-600 mb-0.5">During: rescue use</p>
                        <p className="text-sm font-bold text-blue-800">{treatment.rescueUseDuring}</p>
                      </div>
                      <div className="col-span-2 bg-blue-50 rounded-lg p-3">
                        <p className="text-[10px] text-blue-600 mb-0.5">Effectiveness when used</p>
                        <p className="text-sm font-bold text-blue-800">{treatment.rescueEffectiveness}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <MetricCard label="Avg Pain" before={treatment.painBefore} during={treatment.painDuring} suffix="/10" />
                        <MetricCard label="Peak Pain" before={treatment.peakBefore} during={treatment.peakDuring} suffix="/10" />
                        <MetricCard label="Flare Freq" before={treatment.flareBefore} during={treatment.flareDuring} suffix="/cycle" />
                        <MetricCard label="QoL Score" before={treatment.qolBefore} during={treatment.qolDuring} suffix="/10" />
                        <MetricCard label="Adherence" before={treatment.adherence} during={treatment.adherence} suffix="%" format="pct" />
                        <div className="bg-white rounded-lg p-2.5 border border-gray-100">
                          <p className="text-[10px] text-gray-500 mb-1">Side Effects</p>
                          <p className="text-xs text-gray-700">{treatment.sideEffectBurden}% of days</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{treatment.sideEffects}</p>
                        </div>
                      </div>

                      {treatment.verdict === 'effective' && (
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-green-700 font-medium">✅ Effective — continue; reassess at 6-month mark</p>
                        </div>
                      )}
                      {treatment.verdict === 'moderate' && (
                        <div className="bg-amber-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-amber-700 font-medium">⚡ Modest improvement — recommend continue for full course</p>
                        </div>
                      )}
                      {treatment.verdict === 'stopped' && (
                        <div className="bg-red-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-red-700 font-medium">❌ Stopped — {treatment.stoppedReason}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Treatment History Table */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-700 mb-2">Treatment History</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Treatment</th>
                <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Duration</th>
                <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Before</th>
                <th className="text-left py-1.5 px-2 text-gray-500 font-medium">After</th>
                <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TREATMENTS.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-2 text-gray-700">{t.name}</td>
                  <td className="py-2 px-2 text-gray-500">{t.startDate}</td>
                  <td className="py-2 px-2">{t.painBefore ? <span className="text-gray-400">{t.painBefore}/10</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 px-2">{t.painDuring ? <span className="font-medium text-gray-700">{t.painDuring}/10</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 px-2"><VerdictBadge verdict={t.verdict} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
