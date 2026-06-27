/**
 * FeedbackPrompt
 * 
 * Star rating + comment feedback component for measuring clinical utility.
 * Triggers after report generation or major insight viewing.
 * Stores results in Turso DB via clinical_feedback table.
 */

import { useState, useCallback } from 'react'

const LABELS = ['Not useful', 'Slightly useful', 'Moderately useful', 'Very useful', 'Extremely useful']

export default function FeedbackPrompt({ 
  type,           // 'doctor_report' | 'insight_view' | 'surgical_plan' | 'treatment_dashboard'
  targetId,       // e.g., report ID, insight ID
  targetLabel,    // Human-readable label
  onDismiss,      // Called when user closes without rating
  className = ''
}) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showComment, setShowComment] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (rating === 0) return
    setSubmitting(true)
    
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType: type,
          targetId: targetId || '',
          targetLabel: targetLabel || '',
          rating,
          comment: comment || '',
        }),
      })
      setSubmitted(true)
      setTimeout(() => onDismiss?.(), 2000)
    } catch (e) {
      console.error('Failed to submit feedback:', e)
      setSubmitted(true)
      setTimeout(() => onDismiss?.(), 2000)
    }
    setSubmitting(false)
  }, [rating, comment, type, targetId, targetLabel, onDismiss])

  if (submitted) {
    return (
      <div className={`bg-green-50 rounded-xl p-4 border border-green-200 text-center ${className}`}>
        <p className="text-sm font-medium text-green-700">✅ Thank you for your feedback!</p>
        <p className="text-xs text-green-600 mt-1">Your input helps improve EndoBuddy.</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl p-4 border border-gray-200 shadow-sm ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Was this useful?</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Your feedback helps us improve</p>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 p-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Stars */}
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map(star => {
          const filled = star <= (hoveredRating || rating)
          return (
            <button
              key={star}
              onClick={() => { setRating(star); setShowComment(true) }}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="text-2xl transition-transform hover:scale-110 focus:outline-none"
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}: ${LABELS[star - 1]}`}
            >
              {filled ? '⭐' : '☆'}
            </button>
          )
        })}
      </div>

      {rating > 0 && (
        <p className={`text-xs font-medium mb-3 ${
          rating <= 2 ? 'text-amber-600' : rating >= 4 ? 'text-green-600' : 'text-blue-600'
        }`}>
          {LABELS[rating - 1]}
        </p>
      )}

      {/* Comment field (shown after star selection) */}
      {showComment && (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any additional thoughts? (optional)"
            rows={2}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-endo-purple focus:ring-1 focus:ring-endo-purple/20 outline-none resize-none"
          />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-400">Your feedback is anonymous</span>
            <div className="flex gap-2">
              <button onClick={onDismiss} className="text-xs text-gray-500 px-3 py-1.5 rounded-full hover:bg-gray-100">
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="text-xs font-medium bg-endo-purple text-white px-4 py-1.5 rounded-full hover:bg-purple-700 disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
