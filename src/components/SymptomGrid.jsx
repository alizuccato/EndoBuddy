/**
 * SymptomGrid
 * 
 * Step 3 of the logging flow: Symptom Selection.
 * Multi-select grid of symptom icons organized by category.
 * Smart-sorted: most frequently used symptoms appear first.
 * Large touch-friendly targets (min 44x44).
 */

import { useState, useCallback } from 'react'

// Reference symptom data matching the database schema seed
const SYMPTOMS_BY_CATEGORY = {
  pain: {
    label: '🩸 Pain',
    symptoms: [
      { id: 2, name: 'Cramping', icon: '⚡' },
      { id: 6, name: 'Back pain', icon: '🔙' },
      { id: 7, name: 'Breast tenderness', icon: '🎯' },
      { id: 14, name: 'Joint pain', icon: '🦴' },
      { id: 15, name: 'Muscle aches', icon: '💪' },
      { id: 5, name: 'Headache', icon: '🤕' },
    ]
  },
  digestive: {
    label: '🍽️ Digestive',
    symptoms: [
      { id: 1, name: 'Bloating', icon: '🫃' },
      { id: 4, name: 'Nausea', icon: '🤢' },
      { id: 17, name: 'Constipation', icon: '🚫' },
      { id: 18, name: 'Diarrhea', icon: '💧' },
      { id: 25, name: 'Appetite changes', icon: '🍽️' },
    ]
  },
  general: {
    label: '😴 Energy & General',
    symptoms: [
      { id: 3, name: 'Fatigue', icon: '😴' },
      { id: 11, name: 'Insomnia', icon: '🌙' },
      { id: 12, name: 'Brain fog', icon: '🌫️' },
      { id: 13, name: 'Dizziness', icon: '💫' },
      { id: 16, name: 'Acne', icon: '🔴' },
    ]
  },
  emotional: {
    label: '💭 Emotional',
    symptoms: [
      { id: 8, name: 'Mood swings', icon: '🎢' },
      { id: 9, name: 'Anxiety', icon: '😰' },
      { id: 10, name: 'Low mood', icon: '😢' },
    ]
  },
  urinary: {
    label: '🚽 Urinary & Bladder',
    symptoms: [
      { id: 19, name: 'Urinary urgency', icon: '🚽' },
      { id: 20, name: 'Painful urination', icon: '🔥' },
      { id: 30, name: 'Blood in urine', icon: '🔴' },
      { id: 31, name: 'Bladder pressure/fullness', icon: '🎈' },
    ]
  },
  // Bowel/rectal-specific symptoms, distinct from the general "digestive"
  // category above — these are the markers most associated with possible
  // bowel-wall or rectovaginal lesion involvement rather than everyday GI
  // upset, and are worth their own section for lesion mapping.
  bowel: {
    label: '🩹 Bowel & Rectal',
    symptoms: [
      { id: 26, name: 'Painful bowel movements', icon: '😣' },
      { id: 27, name: 'Rectal bleeding', icon: '🩸' },
      { id: 28, name: 'Bowel spasms', icon: '🌀' },
      { id: 29, name: 'Blood in stool', icon: '🔴' },
    ]
  },
  // Thoracic symptoms — referred/diaphragmatic and pulmonary markers
  // associated with thoracic (lung/diaphragm) endometriosis. Shoulder tip
  // pain in particular is a classic sign of diaphragmatic irritation.
  thoracic: {
    label: '🫁 Chest & Shoulder',
    symptoms: [
      { id: 32, name: 'Shoulder tip pain', icon: '💢' },
      { id: 33, name: 'Chest pain (cycle-related)', icon: '💥' },
      { id: 34, name: 'Shortness of breath', icon: '😮\u200d💨' },
      { id: 35, name: 'Coughing blood', icon: '🚨' },
    ]
  },
}

// Common endo-specific terms for additional context
const ENDO_TERMS = {
  'Cramping': 'Period cramps / Dysmenorrhea',
  'Bloating': 'Endo belly / Abdominal distention',
  'Headache': 'Can be menstrual migraine',
  'Back pain': 'Lower back / Pelvic back pain',
  'Painful bowel movements': 'Dyschezia — may suggest bowel/rectal involvement',
  'Rectal bleeding': 'Cyclical rectal bleeding may suggest bowel involvement',
  'Bowel spasms': 'Colicky bowel pain, often cycle-timed',
  'Blood in stool': 'Cyclical blood in stool may suggest bowel involvement',
  'Blood in urine': 'Cyclical hematuria may suggest bladder involvement',
  'Bladder pressure/fullness': 'Suprapubic pressure, often worse before/during period',
  'Shoulder tip pain': 'Classic sign of diaphragmatic irritation — often right-sided',
  'Chest pain (cycle-related)': 'Catamenial chest pain, timed to your cycle',
  'Shortness of breath': 'Cyclical breathlessness — seek care if sudden or severe',
  'Coughing blood': 'Catamenial hemoptysis — flag to your doctor promptly',
}

// Categories that warrant a visible safety note, since some of their
// symptoms (sudden breathlessness, coughing blood) can be urgent
// regardless of cycle timing.
const SAFETY_NOTE_CATEGORIES = {
  thoracic: '⚠️ Sudden shortness of breath or coughing blood can be serious — seek prompt medical attention, even if it seems cycle-related.',
}

export default function SymptomGrid({ onSelect, selectedSymptoms = [], onNext }) {
  const [expandedCategory, setExpandedCategory] = useState('pain')

  const toggleSymptom = useCallback((symptom) => {
    const isSelected = selectedSymptoms.some(s => s.id === symptom.id)
    const updated = isSelected
      ? selectedSymptoms.filter(s => s.id !== symptom.id)
      : [...selectedSymptoms, { ...symptom, severity: 5 }]
    onSelect('symptoms', updated)
  }, [selectedSymptoms, onSelect])

  const toggleCategory = useCallback((category) => {
    setExpandedCategory(prev => prev === category ? null : category)
  }, [])

  return (
    <div className="space-y-6">
      {/* Question */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          What symptoms are you experiencing?
        </h2>
        <p className="text-gray-500 text-sm">
          Tap all that apply — {selectedSymptoms.length > 0 
            ? `${selectedSymptoms.length} selected` 
            : 'you can select multiple'}
        </p>
      </div>

      {/* Symptom Categories */}
      <div className="space-y-3 max-w-lg mx-auto">
        {Object.entries(SYMPTOMS_BY_CATEGORY).map(([key, category]) => {
          const isExpanded = expandedCategory === key
          const selectedInCat = selectedSymptoms.filter(s => 
            category.symptoms.some(cs => cs.id === s.id)
          ).length

          return (
            <div key={key} className="card !p-0 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(key)}
                className={`
                  w-full flex items-center justify-between px-4 py-3.5
                  font-medium text-gray-900 text-sm
                  transition-colors duration-150
                  ${isExpanded ? 'bg-endo-lavender/10' : 'hover:bg-gray-50'}
                `}
                aria-expanded={isExpanded}
              >
                <span>{category.label}</span>
                <span className="flex items-center gap-2">
                  {selectedInCat > 0 && (
                    <span className="bg-endo-purple text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {selectedInCat}
                    </span>
                  )}
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {/* Symptom Grid */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2">
                  <div className="grid grid-cols-3 gap-2">
                    {category.symptoms.map((symptom) => {
                      const isSelected = selectedSymptoms.some(s => s.id === symptom.id)
                      const endoTerm = ENDO_TERMS[symptom.name]
                      
                      return (
                        <button
                          key={symptom.id}
                          onClick={() => toggleSymptom(symptom)}
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
                          title={endoTerm || symptom.name}
                          role="checkbox"
                          aria-checked={isSelected}
                        >
                          <span className="text-2xl mb-1">{symptom.icon}</span>
                          <span className="text-[11px] leading-tight text-center">
                            {symptom.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {/* Endo context tooltip */}
                  {category.symptoms.some(s => ENDO_TERMS[s.name]) && (
                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                      💡 Tap for details on endo-specific terms
                    </p>
                  )}
                  {/* Safety note for categories with potentially urgent symptoms */}
                  {SAFETY_NOTE_CATEGORIES[key] && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-2 mt-2 text-center leading-snug">
                      {SAFETY_NOTE_CATEGORIES[key]}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Next button */}
      <div className="text-center pt-2">
        <button
          onClick={onNext}
          disabled={selectedSymptoms.length === 0}
          className={`
            btn-primary text-base px-10 py-3
            ${selectedSymptoms.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {selectedSymptoms.length > 0 
            ? `Continue with ${selectedSymptoms.length} symptom${selectedSymptoms.length > 1 ? 's' : ''}`
            : 'Skip symptoms'}
        </button>
      </div>
    </div>
  )
}