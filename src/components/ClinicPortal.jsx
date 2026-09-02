/**
 * ClinicPortal
 *
 * Professional clinical dashboard for medical professionals.
 * High information density, tabular data, minimal white space.
 *
 * Modules: Dashboard, Patient Directory, Patient Detail View, Invitations
 *
 * Identity and account creation are handled entirely upstream, by the real
 * clinician registration flow in LoginFlow.jsx (-> POST /api/register).
 * This component just displays that account (`clinician` prop) and the
 * real patients/invitations linked to it via /api/clinic/* — it does not
 * run its own onboarding or hold any mock data.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getClinicPatients, getClinicInvitations, generateClinicInvitation, getClinicPatientReport } from '../services/dbService'

const STATUS_CONFIG = {
  tracking: { label: 'TRACKING', class: 'bg-blue-100 text-blue-700' },
  report_ready: { label: 'REPORT READY', class: 'bg-red-100 text-red-800 border border-red-200' },
}

function statusFor(patient) {
  return patient.reports && patient.reports.length > 0 ? 'report_ready' : 'tracking'
}

function formatRelativeDate(isoDateOrDatetime) {
  if (!isoDateOrDatetime) return 'No logs yet'
  const then = new Date(isoDateOrDatetime.includes('T') ? isoDateOrDatetime : `${isoDateOrDatetime}T00:00:00`)
  if (isNaN(then.getTime())) return isoDateOrDatetime
  const diffMs = Date.now() - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

export default function ClinicPortal({ clinician }) {
  const [currentView, setCurrentView] = useState('dashboard')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [patients, setPatients] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [loadingInvites, setLoadingInvites] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [inviteAccessLevel, setInviteAccessLevel] = useState('standard')
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [latestInviteCode, setLatestInviteCode] = useState('')

  // Report Vault detail viewer: which report (if any) is currently open,
  // its full content once loaded, and load state/error.
  const [viewingReportId, setViewingReportId] = useState(null)
  const [reportDetail, setReportDetail] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportLoadError, setReportLoadError] = useState(null)

  const clinicianId = clinician?.id

  const loadPatients = useCallback(async () => {
    if (!clinicianId) return
    setLoadingPatients(true)
    try {
      const rows = await getClinicPatients(clinicianId)
      setPatients(rows || [])
      setLoadError(null)
    } catch (e) {
      console.error('Failed to load patients:', e)
      setLoadError('Could not load your patient roster. Try refreshing.')
    } finally {
      setLoadingPatients(false)
    }
  }, [clinicianId])

  const loadInvitations = useCallback(async () => {
    if (!clinicianId) return
    setLoadingInvites(true)
    try {
      const rows = await getClinicInvitations(clinicianId)
      setInvitations(rows || [])
    } catch (e) {
      console.error('Failed to load invitations:', e)
    } finally {
      setLoadingInvites(false)
    }
  }, [clinicianId])

  useEffect(() => {
    loadPatients()
    loadInvitations()
  }, [loadPatients, loadInvitations])

  // The roster/invitations lists were otherwise only ever fetched once on
  // mount, so a patient revoking clinic access mid-session (Profile ->
  // Disconnect) wouldn't disappear from an already-open portal until a
  // full page reload — reading as "the clinic can still see the patient's
  // data" even though the backend link was already gone. Refetch whenever
  // the tab regains focus so a revoked patient drops out promptly.
  useEffect(() => {
    const handleFocus = () => { loadPatients(); loadInvitations() }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadPatients, loadInvitations])

  const handleGenerateInvite = async () => {
    if (!clinicianId || generatingInvite) return
    setGeneratingInvite(true)
    try {
      const result = await generateClinicInvitation(clinicianId, inviteAccessLevel)
      setLatestInviteCode(result.code)
      await loadInvitations()
    } catch (e) {
      console.error('Failed to generate invitation:', e)
    } finally {
      setGeneratingInvite(false)
    }
  }

  const handleOpenReport = useCallback(async (patientId, reportId) => {
    setViewingReportId(reportId)
    setReportDetail(null)
    setReportLoadError(null)
    setLoadingReport(true)
    try {
      const detail = await getClinicPatientReport(clinicianId, patientId, reportId)
      setReportDetail(detail)
    } catch (e) {
      console.error('Failed to load report:', e)
      setReportLoadError('Could not load this report. It may have been removed, or the patient may have disconnected.')
    } finally {
      setLoadingReport(false)
    }
  }, [clinicianId])

  const closeReport = useCallback(() => {
    setViewingReportId(null)
    setReportDetail(null)
    setReportLoadError(null)
  }, [])

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients
    const q = searchQuery.toLowerCase()
    return patients.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
  }, [patients, searchQuery])

  const patientDetail = selectedPatient ? patients.find(p => p.id === selectedPatient) : null
  const reportReadyCount = patients.filter(p => statusFor(p) === 'report_ready').length
  const pendingInviteCount = invitations.filter(i => i.status === 'pending').length

  if (!clinician) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading your clinic account…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Portal Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">🏥</span>
            <div>
              <h1 className="text-sm font-bold text-gray-900">EndoBuddy <span className="text-endo-purple">Clinic Portal</span></h1>
              <p className="text-[10px] text-gray-400">
                {clinician.display_name || 'Unnamed clinician'}
                {clinician.specialty ? ` · ${clinician.specialty}` : ''}
                {clinician.clinic_name ? ` · ${clinician.clinic_name}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-[10px] text-gray-500">System Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-6xl mx-auto flex gap-6">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'patients', label: 'Patient List' },
            { id: 'invitations', label: 'Invitations' },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setCurrentView(tab.id); setSelectedPatient(null) }}
              className={`py-2.5 text-xs font-medium border-b-2 transition-colors ${
                currentView === tab.id ? 'border-endo-purple text-endo-purple' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >{tab.label}</button>
          ))}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {loadError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">{loadError}</div>
        )}

        {/* ===== DASHBOARD VIEW ===== */}
        {currentView === 'dashboard' && (
          <div className="space-y-5">
            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Linked Patients', value: patients.length, color: 'bg-blue-50 text-blue-700' },
                { label: 'Reports Ready', value: reportReadyCount, color: 'bg-amber-50 text-amber-700' },
                { label: 'Total Logs (all patients)', value: patients.reduce((s, p) => s + (p.totalLogs || 0), 0), color: 'bg-green-50 text-green-700' },
                { label: 'Pending Invites', value: pendingInviteCount, color: 'bg-purple-50 text-purple-700' },
              ].map(stat => (
                <div key={stat.label} className={`rounded-xl p-4 ${stat.color}`}>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs mt-0.5 opacity-80">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Quick Invite */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 max-w-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Quick Invite</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Access Level</label>
                  <select value={inviteAccessLevel} onChange={e => setInviteAccessLevel(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-200 focus:border-endo-purple outline-none bg-white"
                    title="Standard: basic symptoms & cycle data. Advanced: includes surgical planning & treatment response mapping.">
                    <option value="standard">Standard</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <button onClick={handleGenerateInvite} disabled={generatingInvite}
                  className="w-full py-2 text-xs font-medium bg-endo-purple text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {generatingInvite ? 'Generating…' : 'Generate Code'}
                </button>
                {latestInviteCode && (
                  <div className="bg-purple-50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-purple-600 mb-0.5">Share this code with the patient:</p>
                    <p className="text-sm font-bold text-purple-800 tracking-wider">{latestInviteCode}</p>
                    <p className="text-[9px] text-purple-500 mt-1">They enter it in their Profile tab to link their account.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Patient Queue */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase">Patient Queue</h3>
                <button onClick={() => setCurrentView('patients')} className="text-[10px] text-endo-purple font-medium hover:underline">View All</button>
              </div>
              {loadingPatients ? (
                <p className="text-xs text-gray-400 py-4 text-center">Loading patients…</p>
              ) : patients.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No patients linked yet. Generate an invite code above to get started.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 font-medium text-gray-500">Patient</th>
                      <th className="text-left py-2 font-medium text-gray-500">Status</th>
                      <th className="text-left py-2 font-medium text-gray-500">Last Log</th>
                      <th className="text-left py-2 font-medium text-gray-500">Reports</th>
                      <th className="text-left py-2 font-medium text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.slice(0, 4).map(p => (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedPatient(p.id); setCurrentView('patients') }}>
                        <td className="py-2.5 font-medium text-gray-800">{p.name}</td>
                        <td className="py-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS_CONFIG[statusFor(p)].class}`}>
                            {STATUS_CONFIG[statusFor(p)].label}
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-500">{formatRelativeDate(p.lastLogDate)}</td>
                        <td className="py-2.5 text-endo-purple text-[10px]">{p.reports.length} report{p.reports.length !== 1 ? 's' : ''}</td>
                        <td className="py-2.5">
                          <button className="text-[10px] text-endo-purple font-medium hover:underline">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ===== PATIENT LIST VIEW ===== */}
        {currentView === 'patients' && !selectedPatient && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Patient Directory</h3>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 w-48 focus:border-endo-purple outline-none"
                placeholder="Search by name…" />
            </div>
            {loadingPatients ? (
              <p className="text-center text-xs text-gray-400 py-8">Loading patients…</p>
            ) : (
              <>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2.5 font-semibold text-gray-500">Patient</th>
                      <th className="text-left py-2.5 font-semibold text-gray-500">Status</th>
                      <th className="text-left py-2.5 font-semibold text-gray-500">Last Log</th>
                      <th className="text-left py-2.5 font-semibold text-gray-500">Phase</th>
                      <th className="text-left py-2.5 font-semibold text-gray-500">Total Logs</th>
                      <th className="text-left py-2.5 font-semibold text-gray-500">Reports</th>
                      <th className="text-left py-2.5 font-semibold text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map(p => (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedPatient(p.id)}>
                        <td className="py-3 font-medium text-gray-800">{p.name}</td>
                        <td className="py-3">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS_CONFIG[statusFor(p)].class}`}>{STATUS_CONFIG[statusFor(p)].label}</span>
                        </td>
                        <td className="py-3 text-gray-500">{formatRelativeDate(p.lastLogDate)}</td>
                        <td className="py-3 text-gray-500 capitalize">{p.phase || '—'}</td>
                        <td className="py-3 text-gray-500">{p.totalLogs}</td>
                        <td className="py-3 text-endo-purple text-[10px]">{p.reports.length > 0 ? p.reports.length + ' ready' : '—'}</td>
                        <td className="py-3">
                          <button className="text-[10px] font-medium text-endo-purple hover:underline">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPatients.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-8">
                    {patients.length === 0 ? 'No patients linked yet.' : 'No patients match your search.'}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== PATIENT DETAIL VIEW ===== */}
        {currentView === 'patients' && selectedPatient && patientDetail && (
          <div className="space-y-4">
            <button onClick={() => setSelectedPatient(null)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Directory
            </button>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{patientDetail.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Linked since {formatRelativeDate(patientDetail.linkedSince)} · {patientDetail.totalLogs} total logs</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded ${STATUS_CONFIG[statusFor(patientDetail)].class}`}>
                  {STATUS_CONFIG[statusFor(patientDetail)].label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500">Current Phase</p>
                  <p className="text-sm font-bold text-gray-800 capitalize">{patientDetail.phase || 'No logs yet'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500">Last Log</p>
                  <p className="text-sm font-bold text-gray-800">{formatRelativeDate(patientDetail.lastLogDate)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500">Total Logs</p>
                  <p className="text-sm font-bold text-gray-800">{patientDetail.totalLogs}</p>
                </div>
              </div>

              {/* Report Vault */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Report Vault</h3>
              <div className="space-y-2 mb-2">
                {patientDetail.reports.length > 0 ? patientDetail.reports.map(report => (
                  <button
                    key={report.id}
                    onClick={() => handleOpenReport(patientDetail.id, report.id)}
                    className="w-full p-3 bg-gray-50 rounded-lg flex items-center justify-between hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">{report.type === 'lesion_mapping' ? '🔬' : '📄'}</span>
                      <p className="text-xs font-medium text-gray-700 capitalize">{report.type.replace(/_/g, ' ')}</p>
                    </div>
                    <span className="text-[10px] text-gray-400">{formatRelativeDate(report.generatedAt)}</span>
                  </button>
                )) : (
                  <p className="text-xs text-gray-400 py-3 text-center">No reports shared yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== REPORT DETAIL MODAL ===== */}
        {viewingReportId && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={closeReport}>
            <div
              className="bg-white rounded-xl border border-gray-200 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
                <h3 className="text-sm font-bold text-gray-900 capitalize">
                  {reportDetail ? `${reportDetail.type.replace(/_/g, ' ')} Report` : 'Report'}
                </h3>
                <button onClick={closeReport} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
              </div>

              <div className="p-5">
                {loadingReport && <p className="text-xs text-gray-400 py-6 text-center">Loading report…</p>}
                {reportLoadError && <p className="text-xs text-red-600 py-6 text-center">{reportLoadError}</p>}

                {reportDetail && reportDetail.type === 'general' && (
                  <div className="space-y-5">
                    <p className="text-[10px] text-gray-400">
                      Period {reportDetail.startDate} – {reportDetail.endDate} · Generated {formatRelativeDate(reportDetail.generatedAt)}
                      {reportDetail.reportData?.patientName ? ` · ${reportDetail.reportData.patientName}` : ''}
                    </p>

                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">{reportDetail.reportData?.avgPain ?? '—'}</p>
                        <p className="text-[10px] text-gray-500">Avg Pain</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-red-600">{reportDetail.reportData?.severeDays ?? '—'}</p>
                        <p className="text-[10px] text-red-600">Severe Days</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-orange-600">{reportDetail.reportData?.moderateDays ?? '—'}</p>
                        <p className="text-[10px] text-orange-600">Moderate Days</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-green-600">{reportDetail.reportData?.totalLoggedDays ?? '—'}</p>
                        <p className="text-[10px] text-green-600">Tracked Days</p>
                      </div>
                    </div>

                    {reportDetail.reportData?.topSymptoms?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">Primary Symptoms</p>
                        <div className="space-y-1">
                          {reportDetail.reportData.topSymptoms.map(([name, count]) => (
                            <div key={name} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2.5 py-1.5">
                              <span className="text-gray-700">{name}</span>
                              <span className="text-gray-400">{count}x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reportDetail.reportData?.dailyLog?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">Daily Detail Log</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="text-left text-gray-400">
                                <th className="py-1 pr-2">Date</th>
                                <th className="py-1 pr-2">Phase</th>
                                <th className="py-1 pr-2">Pain</th>
                                <th className="py-1 pr-2">Symptoms</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportDetail.reportData.dailyLog.map(d => (
                                <tr key={d.date} className="border-t border-gray-50">
                                  <td className="py-1 pr-2 text-gray-600">{d.date}</td>
                                  <td className="py-1 pr-2 text-gray-600 capitalize">{d.phase || '—'}</td>
                                  <td className="py-1 pr-2 text-gray-600">{d.painLevel}/10</td>
                                  <td className="py-1 pr-2 text-gray-600">{(d.symptoms || []).join(', ') || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {reportDetail && reportDetail.type === 'lesion_mapping' && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-gray-400">Generated {formatRelativeDate(reportDetail.generatedAt)}</p>
                    {(reportDetail.reportData?.lesionAssessments || []).length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center">No lesion assessments in this report.</p>
                    ) : reportDetail.reportData.lesionAssessments.map((lesion, idx) => (
                      <div key={idx} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-gray-800">{idx + 1}. {lesion.location}</p>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
                            {lesion.confidenceLevel}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mb-1">Matched: {lesion.pattern}</p>
                        {lesion.rationale && <p className="text-[11px] text-gray-600">{lesion.rationale}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">Evidence: {lesion.score}/{lesion.maxScore}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== INVITATIONS VIEW ===== */}
        {currentView === 'invitations' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Manage Invitations</h3>
            {loadingInvites ? (
              <p className="text-xs text-gray-400 py-4 text-center">Loading invitations…</p>
            ) : invitations.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No invitations generated yet.</p>
            ) : (
              <div className="space-y-3">
                {invitations.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{inv.code}</p>
                      <p className="text-[10px] text-gray-500 capitalize">
                        {inv.access_level} · Sent {formatRelativeDate(inv.created_at)}
                        {inv.patient_name ? ` · ${inv.patient_name}` : ''}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      inv.status === 'accepted' ? 'bg-green-100 text-green-700'
                        : inv.status === 'revoked' ? 'bg-gray-200 text-gray-600'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {inv.status === 'accepted' ? '✅ Accepted' : inv.status === 'revoked' ? '🚫 Revoked' : '⏳ Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <select value={inviteAccessLevel} onChange={e => setInviteAccessLevel(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-lg border border-gray-200 bg-white">
                  <option value="standard">Standard</option>
                  <option value="advanced">Advanced</option>
                </select>
                <button onClick={handleGenerateInvite} disabled={generatingInvite}
                  className="text-xs font-medium bg-endo-purple text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {generatingInvite ? 'Generating…' : '+ Generate New Invitation'}
                </button>
              </div>
              {latestInviteCode && (
                <div className="mt-3 bg-purple-50 rounded-lg p-3 inline-block">
                  <p className="text-[10px] text-purple-600">New code generated:</p>
                  <p className="text-sm font-bold text-purple-800 tracking-wider">{latestInviteCode}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
