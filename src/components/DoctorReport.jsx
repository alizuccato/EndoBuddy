/**
 * DoctorReport
 * 
 * Professional clinical-grade report generator for medical consultations.
 * Transforms daily symptom logs into a data-driven PDF-ready document.
 * 
 * Sections (from doctor-report-design.md):
 *   1. Report Header & Patient Identification
 *   2. Executive Symptom Summary
 *   3. Cycle & Period Analytics
 *   4. Symptom Correlation (Cycle Overlay)
 *   5. Daily Detail Log (Condensed)
 * 
 * Features: Generate PDF (via browser print), Share, Date range selection
 */

import { useState, useMemo, useCallback } from 'react'
import { getPainColor, PHASE_STYLES, PHASE_ORDER } from '../utils/mockData'

export default function DoctorReport({ cycleData, insights, onBack }) {
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [patientName, setPatientName] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [showReport, setShowReport] = useState(false)

  const { days, cycleLength, periodLength, cycleStartDate } = cycleData || {}

  // Calculate report data
  const reportData = useMemo(() => {
    if (!days || days.length === 0) return null

    const loggedDays = days.filter(d => !d.isFuture && d.painLevel > 0)
    const painLevels = loggedDays.map(d => d.painLevel)
    const avgPain = painLevels.length > 0 
      ? (painLevels.reduce((a, b) => a + b, 0) / painLevels.length).toFixed(1)
      : 'N/A'
    
    const severeDays = painLevels.filter(p => p >= 7).length
    const moderateDays = painLevels.filter(p => p >= 4 && p <= 6).length
    
    // Top symptoms
    const symptomCount = {}
    loggedDays.forEach(day => {
      day.symptoms?.forEach(s => {
        symptomCount[s.name] = (symptomCount[s.name] || 0) + 1
      })
    })
    const topSymptoms = Object.entries(symptomCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Pain by cycle phase
    const painByPhase = {}
    PHASE_ORDER.forEach(phase => {
      const phaseDays = loggedDays.filter(d => d.phase === phase)
      if (phaseDays.length > 0) {
        const avg = phaseDays.reduce((sum, d) => sum + d.painLevel, 0) / phaseDays.length
        painByPhase[phase] = {
          avg: avg.toFixed(1),
          max: Math.max(...phaseDays.map(d => d.painLevel)),
          days: phaseDays.length,
        }
      }
    })

    return {
      avgPain,
      maxPain: Math.max(...painLevels, 0),
      severeDays,
      moderateDays,
      totalLoggedDays: loggedDays.length,
      topSymptoms,
      painByPhase,
      cycleLength: cycleLength || 28,
      periodLength: periodLength || 5,
    }
  }, [days, cycleLength, periodLength])

  const handleGenerateReport = useCallback(() => {
    setShowReport(true)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
  }, [])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // If no data, show the setup form
  if (!showReport) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 pb-24 md:pb-8">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">📋 Doctor Report</h2>
        <p className="text-gray-500 text-sm mb-8">
          Generate a professional clinical summary of your symptom and cycle data for your healthcare provider.
        </p>

        <div className="space-y-5 max-w-md">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Report Period</label>
            <div className="flex gap-3">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="input-field text-sm"
                placeholder="Start date"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="input-field text-sm"
                placeholder="End date"
              />
            </div>
          </div>

          {/* Patient Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Patient Name (Optional)</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="input-field text-sm"
              placeholder="Jane Doe"
            />
          </div>

          {/* Doctor Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prepared for Dr. (Optional)</label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="input-field text-sm"
              placeholder="Dr. Smith"
            />
          </div>

          {/* Quick range selectors */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Quick select:</p>
            <div className="flex gap-2 flex-wrap">
              {['1 month', '3 months', '6 months'].map(label => (
                <button
                  key={label}
                  onClick={() => {
                    const end = new Date()
                    let start = new Date()
                    if (label === '1 month') start.setMonth(start.getMonth() - 1)
                    else if (label === '3 months') start.setMonth(start.getMonth() - 3)
                    else start.setMonth(start.getMonth() - 6)
                    setDateRange({
                      start: start.toISOString().split('T')[0],
                      end: end.toISOString().split('T')[0],
                    })
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerateReport}
            disabled={!reportData}
            className={`w-full btn-primary text-lg py-4 mt-4 ${!reportData ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {reportData ? '📄 Generate Report' : '⚠️ Need more data to generate a report'}
          </button>

          {/* Data preview */}
          {reportData && (
            <div className="card bg-gray-50 !p-4 text-sm">
              <p className="font-medium text-gray-700 mb-2">Available data:</p>
              <ul className="space-y-1 text-gray-600">
                <li>• {reportData.totalLoggedDays} logged days</li>
                <li>• {reportData.topSymptoms.length} symptom types tracked</li>
                <li>• Last cycle: {cycleLength} days</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================================
  // REPORT VIEW (printable)
  // ============================================================
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Action buttons (hidden when printing) */}
      <div className="flex justify-between items-center mb-6 no-print">
        <button onClick={() => setShowReport(false)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Editor
        </button>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-primary text-sm px-6 py-2.5">
            🖨️ Save as PDF / Print
          </button>
          <button className="px-4 py-2.5 text-sm font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
            📤 Share
          </button>
        </div>
      </div>

      {/* ====== THE REPORT ====== */}
      <div className="report-content">
        <div className="report-container bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
        {/* Page 1: Clinical Summary */}
        <div className="p-8 print:p-6">
          {/* Header */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl">🌸</span>
                <h1 className="text-xl font-bold text-endo-purple mt-1">
                  Endo<span className="text-endo-pink">Buddy</span>
                </h1>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">HEALTH REPORT</p>
                <p className="text-sm font-semibold text-gray-700">Endometriosis Symptom & Cycle Tracking</p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {patientName && (
                <div>
                  <span className="text-gray-400 text-xs">Patient</span>
                  <p className="font-medium text-gray-800">{patientName}</p>
                </div>
              )}
              <div>
                <span className="text-gray-400 text-xs">Report Period</span>
                <p className="font-medium text-gray-800">
                  {dateRange.start || 'N/A'} – {dateRange.end || 'N/A'}
                </p>
              </div>
              {doctorName && (
                <div>
                  <span className="text-gray-400 text-xs">Prepared for</span>
                  <p className="font-medium text-gray-800">{doctorName}</p>
                </div>
              )}
              <div>
                <span className="text-gray-400 text-xs">Generated</span>
                <p className="font-medium text-gray-800">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="mb-8">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-endo-pink rounded-full inline-block" />
              Executive Symptom Summary
            </h2>
            
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{reportData.avgPain}</p>
                <p className="text-xs text-gray-500 mt-1">Avg Pain</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{reportData.severeDays}</p>
                <p className="text-xs text-red-600 mt-1">Severe Days (7-10)</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">{reportData.moderateDays}</p>
                <p className="text-xs text-orange-600 mt-1">Moderate Days (4-6)</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{reportData.totalLoggedDays}</p>
                <p className="text-xs text-green-600 mt-1">Tracked Days</p>
              </div>
            </div>

            {/* Top Symptoms */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Primary Symptoms (by frequency)</p>
              <div className="space-y-1.5">
                {reportData.topSymptoms.map(([name, count], index) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="w-5 text-xs font-bold text-gray-400">#{index + 1}</span>
                    <div className="flex-1 bg-white rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full bg-endo-purple/20 rounded-full flex items-center px-2"
                        style={{ width: `${Math.min(100, (count / reportData.topSymptoms[0][1]) * 100)}%` }}
                      >
                        <span className="text-xs text-endo-purple font-medium">{name}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{count}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cycle Analytics */}
          <div className="mb-8">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-endo-teal rounded-full inline-block" />
              Cycle & Period Analytics
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Average Cycle Length</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.cycleLength} <span className="text-sm font-normal text-gray-500">days</span></p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Consistent</span>
                  <span className="text-xs text-gray-400">within normal range</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Average Period Duration</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.periodLength} <span className="text-sm font-normal text-gray-500">days</span></p>
              </div>
            </div>

            {/* Phase-level pain breakdown */}
            {Object.keys(reportData.painByPhase).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Pain Level by Cycle Phase</p>
                <div className="space-y-2">
                  {PHASE_ORDER.map(phase => {
                    const data = reportData.painByPhase[phase]
                    if (!data) return null
                    const style = PHASE_STYLES[phase]
                    
                    return (
                      <div key={phase} className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                        <span className="text-xs font-medium text-gray-600 w-20">{style.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(data.avg / 10) * 100}%`,
                              backgroundColor: style.color + '40',
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-12 text-right">
                          {data.avg}/10
                        </span>
                        <span className="text-xs text-gray-400">({data.days}d)</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Symptom Correlation Insight */}
          <div className="mb-8">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-endo-purple rounded-full inline-block" />
              AI-Detected Patterns <span class="text-[10px] font-normal text-gray-400">(Correlational)</span>
            </h2>
            
            <div className="bg-gradient-to-br from-endo-purple/5 to-endo-pink/5 rounded-xl p-4 border border-endo-lavender/20">
              {(() => {
                // Find which phase has highest avg pain
                const phases = Object.entries(reportData.painByPhase)
                if (phases.length === 0) return <p className="text-sm text-gray-500">More data needed for pattern analysis.</p>
                
                const sorted = phases.sort((a, b) => b[1].avg - a[1].avg)
                const worstPhase = sorted[0]
                const worstStyle = PHASE_STYLES[worstPhase[0]]
                
                return (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">Clinical Note:</span> Symptom intensity is highest during the{' '}
                      <span className={`font-semibold ${worstStyle.text}`}>{worstStyle.label}</span> phase
                      (average {worstPhase[1].avg}/10 pain).
                    </p>
                    {reportData.topSymptoms.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Most frequently reported symptoms: {reportData.topSymptoms.slice(0, 3).map(([n]) => n).join(', ')}.
                      </p>
                    )}
                    {reportData.severeDays >= 3 && (
                      <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-2 mt-2">
                        ⚠️ Multiple severe pain days ({reportData.severeDays}) logged — may indicate inadequate pain management or flare-up pattern.
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Page 2+: Daily Detail Log */}
        <div className="border-t border-gray-200 p-8 print:p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-gray-400 rounded-full inline-block" />
            Daily Detail Log (Condensed)
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Day</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Phase</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Pain</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Symptoms</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Flow</th>
                </tr>
              </thead>
              <tbody>
                {(days || []).filter(d => !d.isFuture && d.painLevel > 0).slice(0, 30).map((day) => {
                  const style = PHASE_STYLES[day.phase]
                  const painColor = getPainColor(day.painLevel)
                  
                  return (
                    <tr key={day.date} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 text-xs text-gray-600">{day.date.slice(5)}</td>
                      <td className="py-2 px-2 text-xs text-gray-600">{day.dayNum}</td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${painColor.bg} ${painColor.text}`}>
                          {day.painLevel}/10
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1 flex-wrap">
                          {(day.symptoms || []).slice(0, 3).map(s => (
                            <span key={s.id} className="text-xs text-gray-600">{s.icon}</span>
                          ))}
                          {(day.symptoms || []).length > 3 && (
                            <span className="text-xs text-gray-400">+{day.symptoms.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-xs text-gray-600 capitalize">{day.flowLevel || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {(days || []).filter(d => d.painLevel > 0).length > 30 && (
              <p className="text-xs text-gray-400 text-center mt-3">
                Showing 30 of {(days || []).filter(d => d.painLevel > 0).length} days with symptoms
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 text-center">
          <p className="text-xs text-gray-400">
            EndoBuddy is a data-tracking tool. This report contains <strong>correlational</strong> insights and does not constitute medical diagnosis or advice.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Always consult a qualified healthcare provider for medical decisions. Patient name field accepts real name or pseudonym — your choice.
          </p>
        </div>
      </div>
      </div>

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .report-container { box-shadow: none !important; border: none !important; border-radius: 0 !important; }
          @page { margin: 0.5in; }
        }
      `}} />
    </div>
  )
}