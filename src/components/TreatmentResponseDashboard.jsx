/**
 * TreatmentResponseDashboard
 *
 * Tracks treatments — medications, physical therapy, supplements, etc.
 * Logging is done here: name, type, dosage, start date, and whether it's
 * helping. Entries are saved via /api/treatments (treatment_log table).
 *
 * Full before/during pain-and-flare analytics per treatment (comparing
 * daily_logs data before vs. after a start date) aren't computed yet — if a
 * treatment object ever arrives with that data pre-computed (painBefore/
 * painDuring/verdict/etc.), this component will render the richer
 * comparison view for it automatically. Until then, logged treatments show
 * in the simpler list below.
 */

import { useState, useEffect, useCallback } from 'react'
import { getTreatments, addTreatment, updateTreatment, deleteTreatment } from '../services/dbService'

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
  if (before === null || before === undefined || during === null || during === undefined) return null
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

const TYPE_ICONS = { medication: '💊', supplement: '🌿', therapy: '🧘', other: '📋' }
const TYPE_LABELS = { medication: 'Medication', supplement: 'Supplement', therapy: 'Therapy/PT', other: 'Other' }

function AddTreatmentForm({ userId, onAdded, onCancel }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('medication')
  const [dosage, setDosage] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Enter a name for the treatment'); return }
    setSaving(true)
    setError('')
    try {
      await addTreatment({ userId, name: name.trim(), type, dosage: dosage.trim(), startDate, notes: notes.trim() })
      onAdded()
    } catch (err) {
      setError(err.message || 'Failed to save treatment')
    } finally {
      setSaving(false)
    }
  }, [userId, name, type, dosage, startDate, notes, onAdded])

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Naproxen, Vitamin D, Pelvic floor PT"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-endo-purple"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-endo-purple"
          >
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Dosage (optional)</label>
          <input
            type="text"
            value={dosage}
            onChange={e => setDosage(e.target.value)}
            placeholder="e.g. 200mg"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-endo-purple"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Started</label>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-endo-purple"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="How's it going so far?"
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-endo-purple resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm py-2 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save treatment'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 px-4 py-2 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </form>
  )
}

function SimpleTreatmentCard({ treatment, onMarkEffective, onDelete }) {
  const [busy, setBusy] = useState(false)

  const handleEffective = async (value) => {
    setBusy(true)
    try { await onMarkEffective(treatment.id, value) } finally { setBusy(false) }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-lg">{TYPE_ICONS[treatment.type] || '📋'}</span>
          <div>
            <p className="text-sm font-medium text-gray-800">{treatment.name}</p>
            <p className="text-[11px] text-gray-500">
              {treatment.dosage ? `${treatment.dosage} · ` : ''}Started {treatment.start_date}
            </p>
            {treatment.notes && <p className="text-xs text-gray-500 mt-1">{treatment.notes}</p>}
          </div>
        </div>
        <button
          onClick={() => onDelete(treatment.id)}
          className="text-gray-300 hover:text-red-500 text-xs shrink-0"
          aria-label="Remove treatment"
        >
          Remove
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
        <span className="text-[11px] text-gray-500 mr-1">Is it helping?</span>
        {[['yes', 'Yes'], ['unsure', 'Not sure'], ['no', 'No']].map(([val, label]) => (
          <button
            key={val}
            disabled={busy}
            onClick={() => handleEffective(val)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              treatment.effective === val
                ? 'bg-endo-purple text-white border-endo-purple'
                : 'bg-white text-gray-600 border-gray-200 hover:border-endo-purple'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function TreatmentResponseDashboard({ userId }) {
  const [treatments, setTreatments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedTreatment, setExpandedTreatment] = useState(null)

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    try {
      const rows = await getTreatments(userId)
      setTreatments(Array.isArray(rows) ? rows : [])
    } catch (e) {
      console.log('Could not load treatments:', e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const handleAdded = useCallback(() => {
    setShowAddForm(false)
    load()
  }, [load])

  const handleMarkEffective = useCallback(async (id, effective) => {
    await updateTreatment(id, { effective })
    load()
  }, [load])

  const handleDelete = useCallback(async (id) => {
    await deleteTreatment(id)
    load()
  }, [load])

  // Split out any treatments that already carry pre-computed before/during
  // analytics (verdict) from the plain logged ones, so both render correctly.
  const analyzedTreatments = treatments.filter(t => t.verdict)
  const simpleTreatments = treatments.filter(t => !t.verdict)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">💊 Treatment Response Dashboard</h3>
          <p className="text-xs text-gray-500 mt-0.5">Track what's working — and what isn't</p>
        </div>
        <span className="bg-gradient-to-r from-endo-purple to-endo-pink text-white text-[10px] font-bold px-2 py-1 rounded-full">PREMIUM</span>
      </div>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full text-sm font-medium text-endo-purple border border-endo-purple/30 rounded-xl py-2.5 mb-4 hover:bg-endo-purple/5 transition-colors"
        >
          + Add a treatment
        </button>
      )}

      {showAddForm && (
        <AddTreatmentForm userId={userId} onAdded={handleAdded} onCancel={() => setShowAddForm(false)} />
      )}

      {loading ? (
        <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
      ) : treatments.length === 0 ? (
        <div className="text-center py-8 px-4">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-medium text-gray-700 mb-1">No treatments logged yet</p>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Add a medication, supplement, or therapy above and this dashboard will help you
            track whether it's actually working.
          </p>
        </div>
      ) : (
        <>
          {simpleTreatments.length > 0 && (
            <div className="space-y-3 mb-4">
              {simpleTreatments.map(t => (
                <SimpleTreatmentCard key={t.id} treatment={t} onMarkEffective={handleMarkEffective} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {analyzedTreatments.length > 0 && (
            <div className="space-y-3">
              {analyzedTreatments.map((treatment) => {
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
                              {treatment.sideEffectBurden !== undefined && (
                                <div className="bg-white rounded-lg p-2.5 border border-gray-100">
                                  <p className="text-[10px] text-gray-500 mb-1">Side Effects</p>
                                  <p className="text-xs text-gray-700">{treatment.sideEffectBurden}% of days</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{treatment.sideEffects}</p>
                                </div>
                              )}
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
          )}
        </>
      )}
    </div>
  )
}
