/**
 * SurgicalPlanningSummary
 * 
 * AI-generated report mapping symptom patterns to suspected endometriosis lesion locations.
 * Uses clinical logic from clinical-logic-advanced-reports.md (Section 1).
 * Helps surgeons prioritize exploration areas during laparoscopy.
 */

import { useState, useMemo } from 'react'

// Symptom Pattern → Lesion Location Mapping (from clinical-logic-advanced-reports.md)
const LESION_MAP = [
  { id: 1, pattern: 'One-sided pelvic pain', painType: ['sharp', 'stabbing'], minSeverity: 6, timing: ['ovulation', 'menstrual'], location: 'Ovarian endometrioma / ovarian lesion', confidence: 'High', rationale: 'Ovulation pain suggests ovarian involvement; one-sided points to specific ovary.' },
  { id: 2, pattern: 'Deep pain during intercourse', painType: ['deep', 'burning'], minSeverity: 5, timing: ['menstrual', 'luteal'], location: 'DIE — uterosacral ligaments, pouch of Douglas, rectovaginal septum', confidence: 'Very High', rationale: 'Dyspareunia is one of the strongest predictors of DIE.' },
  { id: 3, pattern: 'Painful bowel movements', painType: ['sharp'], minSeverity: 5, timing: ['menstrual'], location: 'Bowel endometriosis — rectosigmoid colon, rectum', confidence: 'High', rationale: 'Cyclical dyschezia is highly predictive of bowel involvement.' },
  { id: 4, pattern: 'Cyclical diarrhea/constipation', painType: [], minSeverity: 0, timing: ['luteal', 'menstrual'], location: 'Bowel endometriosis — rectosigmoid', confidence: 'Moderate' },
  { id: 6, pattern: 'Painful urination', painType: ['burning', 'stinging'], minSeverity: 4, timing: ['menstrual'], location: 'Bladder endometriosis', confidence: 'High' },
  { id: 8, pattern: 'Radiating leg pain', painType: ['shooting'], minSeverity: 5, timing: ['menstrual'], location: 'Sciatic nerve endometriosis', confidence: 'High' },
  { id: 9, pattern: 'Deep low back pain', painType: ['dull', 'aching'], minSeverity: 4, timing: ['menstrual'], location: 'Uterosacral ligament endometriosis', confidence: 'Moderate' },
  { id: 11, pattern: 'Pain with sitting', painType: ['sharp', 'dull'], minSeverity: 4, timing: ['menstrual'], location: 'Rectovaginal septum, posterior fornix', confidence: 'Moderate' },
  { id: 15, pattern: 'Multiple co-occurring symptoms', painType: [], minSeverity: 6, timing: ['menstrual'], location: 'Multiple lesion sites — Stage 3-4 endometriosis', confidence: 'Very High' },
]

const CONFIDENCE_ORDER = { 'Very High': 4, 'High': 3, 'Moderate': 2, 'Low': 1 }

export default function SurgicalPlanningSummary({ patterns }) {
  const [expandedLesion, setExpandedLesion] = useState(null)

  // Extract relevant symptoms from the pattern recognition data
  const lesionAssessments = useMemo(() => {
    // Use the pattern data to build lesion assessments
    const phaseCorrelations = (patterns || []).filter(p => 
      p.type === 'phase_correlation' || p.type === 'symptom_phase_correlation'
    )
    
    const scoredLesions = LESION_MAP.map(lesion => {
      let score = 0
      const matchedPatterns = []
      const maxScore = 4
      
      // Check if logged symptoms match the lesion pattern
      const hasCyclicalPain = phaseCorrelations.some(p => 
        p.metric?.avgPain && parseFloat(p.metric.avgPain) >= lesion.minSeverity
      )
      
      if (hasCyclicalPain) score += 1
      
      // Check timing matches
      const timingMatch = phaseCorrelations.some(p => 
        lesion.timing.some(t => p.title?.toLowerCase().includes(t))
      )
      if (timingMatch) score += 1
      
      // Check pain type matches
      const painTypeMatch = lesion.painType.length === 0 || phaseCorrelations.some(p =>
        lesion.painType.some(pt => p.title?.toLowerCase().includes(pt))
      )
      if (painTypeMatch && lesion.painType.length > 0) score += 1
      
      // Bonus for multiple related symptoms
      if (phaseCorrelations.length >= 3) score += 1
      
      const confidenceLevel = score >= 3 ? lesion.confidence : 
                              score >= 2 ? (lesion.confidence === 'Very High' ? 'High' : lesion.confidence) :
                              score >= 1 ? 'Low' : 'Insufficient'
      
      return {
        ...lesion,
        score,
        maxScore,
        confidenceLevel,
        dataQuality: score >= 3 ? 'sufficient' : score >= 2 ? 'partial' : 'insufficient',
      }
    })

    return scoredLesions
      .filter(l => l.score > 0)
      .sort((a, b) => CONFIDENCE_ORDER[b.confidenceLevel] - CONFIDENCE_ORDER[a.confidenceLevel])
  }, [patterns])

  const hasData = lesionAssessments.length > 0

  if (!hasData) {
    return (
      <div className="card text-center py-8">
        <div className="text-5xl mb-3">🔬</div>
        <h3 className="font-semibold text-gray-700 mb-2">Insufficient Data</h3>
        <p className="text-sm text-gray-500">Log at least 14 days with pain type, location, and cycle phase data to generate a Surgical Planning Summary.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">🔬 Surgical Planning Summary</h3>
          <p className="text-xs text-gray-500 mt-0.5">Suspected lesion locations based on logged symptom patterns</p>
        </div>
        <span className="bg-gradient-to-r from-endo-purple to-endo-pink text-white text-[10px] font-bold px-2 py-1 rounded-full">PREMIUM</span>
      </div>

      <div className="space-y-3">
        {lesionAssessments.map((lesion, idx) => {
          const isExpanded = expandedLesion === idx
          const confidenceColors = {
            'Very High': 'bg-green-100 text-green-700 border-green-200',
            'High': 'bg-blue-100 text-blue-700 border-blue-200',
            'Moderate': 'bg-amber-100 text-amber-700 border-amber-200',
            'Low': 'bg-gray-100 text-gray-500 border-gray-200',
            'Insufficient': 'bg-red-50 text-red-400 border-red-100',
          }
          const dotColors = {
            'Very High': 'bg-green-500',
            'High': 'bg-blue-500',
            'Moderate': 'bg-amber-500',
            'Low': 'bg-gray-400',
            'Insufficient': 'bg-red-300',
          }

          return (
            <div key={lesion.id} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedLesion(isExpanded ? null : idx)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColors[lesion.confidenceLevel]}`} />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-800">{idx + 1}. {lesion.location}</p>
                  <p className="text-xs text-gray-500">Matched: {lesion.pattern}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${confidenceColors[lesion.confidenceLevel]}`}>
                  {lesion.confidenceLevel}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Clinical Rationale</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{lesion.rationale}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Evidence strength:</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`w-4 h-1.5 rounded-full ${i <= lesion.score ? 'bg-endo-purple' : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-500">{lesion.score}/{lesion.maxScore}</span>
                  </div>
                  {lesion.dataQuality === 'insufficient' && (
                    <p className="text-[10px] text-amber-600">⚠️ More data needed for confident assessment. Continue tracking pain type + timing + location.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Imaging Recommendations */}
      {lesionAssessments.some(l => l.confidenceLevel === 'Very High' || l.confidenceLevel === 'High') && (
        <div className="mt-4 bg-purple-50 rounded-xl p-4 border border-purple-100">
          <p className="text-xs font-semibold text-purple-800 mb-2">Suggested Pre-Surgical Imaging</p>
          <ul className="space-y-1 text-xs text-purple-700">
            <li>• MRI with endometriosis protocol (for DIE mapping)</li>
            <li>• Transvaginal ultrasound with bowel prep</li>
            {lesionAssessments.some(l => l.location.includes('Bowel')) && (
              <li>• Colonoscopy / sigmoidoscopy for bowel involvement</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
