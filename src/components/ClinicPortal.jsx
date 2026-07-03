/**
 * ClinicPortal
 *
 * Professional clinical dashboard for medical professionals.
 * High information density, tabular data, minimal white space.
 *
 * Modules: Dashboard, Patient Directory, Patient Detail View
 * Design: /home/team/shared/clinic-portal-design.md
 */

import { useState, useMemo } from 'react'
import ClinicianOnboarding from './ClinicianOnboarding'

const MOCK_PATIENTS = [
  { id: 'EB-912', name: 'Jane D.', status: 'report_ready', quality: 5, lastLog: '2 hours ago', phase: 'menstrual', activeReports: ['Surgical Planning Summary'], trackingSince: '4 months' },
  { id: 'EB-441', name: 'Sarah K.', status: 'reviewing', quality: 3, lastLog: '1 day ago', phase: 'luteal', activeReports: ['Treatment Response Dashboard'], trackingSince: '6 months' },
  { id: 'EB-002', name: 'Maria G.', status: 'tracking', quality: 4, lastLog: '5 hours ago', phase: 'follicular', activeReports: [], trackingSince: '2 months' },
  { id: 'EB-337', name: 'Alex R.', status: 'report_ready', quality: 5, lastLog: '30 min ago', phase: 'ovulation', activeReports: ['Standard Summary', 'Surgical Planning Summary'], trackingSince: '8 months' },
  { id: 'EB-881', name: 'Priya S.', status: 'tracking', quality: 2, lastLog: '3 days ago', phase: 'luteal', activeReports: [], trackingSince: '3 weeks' },
  { id: 'EB-554', name: 'Luna M.', status: 'reviewing', quality: 4, lastLog: '4 hours ago', phase: 'menstrual', activeReports: ['Standard Summary'], trackingSince: '5 months' },
  { id: 'EB-123', name: 'Claire W.', status: 'tracking', quality: 5, lastLog: '1 hour ago', phase: 'follicular', activeReports: [], trackingSince: '12 months' },
  { id: 'EB-776', name: 'Nicole T.', status: 'report_ready', quality: 4, lastLog: '6 hours ago', phase: 'luteal', activeReports: ['Treatment Response Dashboard', 'Surgical Planning Summary'], trackingSince: '7 months' },
]

const RECENT_ACTIVITY = [
  { id: 1, text: 'EB-912 shared a new Surgical Planning Summary.', time: '12 min ago', type: 'report' },
  { id: 2, text: 'EB-441 reached 3-cycle tracking milestone.', time: '1 hour ago', type: 'milestone' },
  { id: 3, text: 'EB-002 shared a new Standard Summary report.', time: '3 hours ago', type: 'report' },
  { id: 4, text: 'EB-337 completed 8 months of consistent tracking.', time: '5 hours ago', type: 'milestone' },
  { id: 5, text: 'New patient EB-881 accepted clinic invitation.', time: '1 day ago', type: 'invite' },
]

const STATUS_CONFIG = {
  tracking: { label: 'TRACKING', class: 'bg-blue-100 text-blue-700' },
  report_ready: { label: 'REPORT READY', class: 'bg-amber-100 text-amber-700' },
  reviewing: { label: 'REVIEWED', class: 'bg-green-100 text-green-700' },
}

export default function ClinicPortal() {
  const [onboarded, setOnboarded] = useState(false)
  const [currentView, setCurrentView] = useState('dashboard')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [clinicNotes, setClinicNotes] = useState('')
  const [reportRatings, setReportRatings] = useState({})
  const [reportComments, setReportComments] = useState({})

  const handleRateReport = (key, rating) => {
    setReportRatings(prev => ({ ...prev, [key]: { rating, submitted: false } }))
  }

  const handleCommentChange = (key, comment) => {
    setReportComments(prev => ({ ...prev, [key]: comment }))
  }

  const handleSubmitRating = async (key, reportName) => {
    const rating = reportRatings[key]?.rating
    if (!rating) return
    try {
      await fetch('/api/feedback-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: key,
          userRole: 'clinician',
          rating,
          comments: reportComments[key] || '',
          lesionMappings: reportName,
        }),
      })
      setReportRatings(prev => ({ ...prev, [key]: { rating, submitted: true } }))
    } catch (e) {
      console.error('Failed to submit feedback:', e)
    }
  }

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return MOCK_PATIENTS
    const q = searchQuery.toLowerCase()
    return MOCK_PATIENTS.filter(p =>
      p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const generateInviteCode = () => {
    const code = 'EB-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    setInviteCode(code)
  }

  // If not onboarded, show onboarding flow
  if (!onboarded) {
    return <ClinicianOnboarding onComplete={() => setOnboarded(true)} />
  }

  const patientDetail = selectedPatient
    ? MOCK_PATIENTS.find(p => p.id === selectedPatient)
    : null

  const reportReadyCount = MOCK_PATIENTS.filter(p => p.status === 'report_ready').length
  const newShares = RECENT_ACTIVITY.filter(a => a.type === 'report').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Portal Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">🏥</span>
            <div>
              <h1 className="text-sm font-bold text-gray-900">EndoBuddy <span className="text-endo-purple">Clinic Portal</span></h1>
              <p className="text-[10px] text-gray-400">Dr. Arrington · General Gynecology</p>
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
        {/* ===== DASHBOARD VIEW ===== */}
        {currentView === 'dashboard' && (
          <div className="space-y-5">
            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Active Tracking', value: MOCK_PATIENTS.length, color: 'bg-blue-50 text-blue-700' },
                { label: 'Reports Ready', value: reportReadyCount, color: 'bg-amber-50 text-amber-700' },
                { label: 'New Shares (24h)', value: newShares, color: 'bg-green-50 text-green-700' },
                { label: 'Pending Invites', value: 2, color: 'bg-purple-50 text-purple-700' },
              ].map(stat => (
                <div key={stat.label} className={`rounded-xl p-4 ${stat.color}`}>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs mt-0.5 opacity-80">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Activity + Quick Invite */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Recent Activity</h3>
                <div className="space-y-2.5">
                  {RECENT_ACTIVITY.map(activity => (
                    <div key={activity.id} className="flex items-start gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                        activity.type === 'report' ? 'bg-amber-400' :
                        activity.type === 'milestone' ? 'bg-green-400' : 'bg-blue-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-relaxed">{activity.text}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Invite Widget */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Quick Invite</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Patient Name</label>
                    <input type="text" className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-200 focus:border-endo-purple outline-none" placeholder="Enter name" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Access Level</label>
                    <select className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-200 focus:border-endo-purple outline-none bg-white">
                      <option>Standard</option>
                      <option>Advanced</option>
                    </select>
                  </div>
                  <button onClick={generateInviteCode} className="w-full py-2 text-xs font-medium bg-endo-purple text-white rounded-lg hover:bg-purple-700">
                    Generate Code
                  </button>
                  {inviteCode && (
                    <div className="bg-purple-50 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-purple-600 mb-0.5">Share this code with the patient:</p>
                      <p className="text-sm font-bold text-purple-800 tracking-wider">{inviteCode}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Urgent Queue */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase">Patient Queue</h3>
                <button onClick={() => setCurrentView('patients')} className="text-[10px] text-endo-purple font-medium hover:underline">View All</button>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 font-medium text-gray-500">ID</th>
                    <th className="text-left py-2 font-medium text-gray-500">Status</th>
                    <th className="text-left py-2 font-medium text-gray-500">Quality</th>
                    <th className="text-left py-2 font-medium text-gray-500">Reports</th>
                    <th className="text-left py-2 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PATIENTS.slice(0, 4).map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedPatient(p.id); setCurrentView('patients') }}>
                      <td className="py-2.5 font-medium text-gray-800">{p.id}</td>
                      <td className="py-2.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS_CONFIG[p.status].class}`}>
                          {STATUS_CONFIG[p.status].label}
                        </span>
                      </td>
                      <td className="py-2.5">{'★'.repeat(p.quality)}{'☆'.repeat(5 - p.quality)}</td>
                      <td className="py-2.5 text-endo-purple text-[10px]">{p.activeReports.length} report{p.activeReports.length !== 1 ? 's' : ''}</td>
                      <td className="py-2.5">
                        <button className="text-[10px] text-endo-purple font-medium hover:underline">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                placeholder="Search by ID or name..." />
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2.5 font-semibold text-gray-500">Patient</th>
                  <th className="text-left py-2.5 font-semibold text-gray-500">Status</th>
                  <th className="text-left py-2.5 font-semibold text-gray-500">Last Log</th>
                  <th className="text-left py-2.5 font-semibold text-gray-500">Quality</th>
                  <th className="text-left py-2.5 font-semibold text-gray-500">Phase</th>
                  <th className="text-left py-2.5 font-semibold text-gray-500">Reports</th>
                  <th className="text-left py-2.5 font-semibold text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedPatient(p.id)}>
                    <td className="py-3">
                      <p className="font-medium text-gray-800">{p.id}</p>
                      <p className="text-[10px] text-gray-400">{p.name}</p>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS_CONFIG[p.status].class}`}>{STATUS_CONFIG[p.status].label}</span>
                    </td>
                    <td className="py-3 text-gray-500">{p.lastLog}</td>
                    <td className="py-3 text-[11px]">{'★'.repeat(p.quality)}{'☆'.repeat(5 - p.quality)}</td>
                    <td className="py-3 text-gray-500 capitalize">{p.phase}</td>
                    <td className="py-3 text-endo-purple text-[10px]">{p.activeReports.length > 0 ? p.activeReports.length + ' ready' : '—'}</td>
                    <td className="py-3">
                      <button className="text-[10px] font-medium text-endo-purple hover:underline">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPatients.length === 0 && <p className="text-center text-xs text-gray-400 py-8">No patients match your search.</p>}
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
                  <h2 className="text-lg font-bold text-gray-900">{patientDetail.id}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{patientDetail.name} · Tracking for {patientDetail.trackingSince} · Log quality: {'★'.repeat(patientDetail.quality)}{'☆'.repeat(5 - patientDetail.quality)}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded ${STATUS_CONFIG[patientDetail.status].class}`}>
                  {STATUS_CONFIG[patientDetail.status].label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500">Current Phase</p>
                  <p className="text-sm font-bold text-gray-800 capitalize">{patientDetail.phase}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500">Last Log</p>
                  <p className="text-sm font-bold text-gray-800">{patientDetail.lastLog}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500">Total Logs Est.</p>
                  <p className="text-sm font-bold text-gray-800">{Math.floor(Math.random() * 100 + 80)}</p>
                </div>
              </div>

              {/* Report Vault */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase">Report Vault</h3>
                <span className="text-[9px] text-gray-400">Rate each report's clinical utility</span>
              </div>
              <div className="space-y-2 mb-5">
                {patientDetail.activeReports.length > 0 ? patientDetail.activeReports.map((report, idx) => {
                  const repKey = report + idx
                  const rated = reportRatings[repKey]?.rating || 0
                  const submitted = reportRatings[repKey]?.submitted
                  const showComment = rated > 0 && rated <= 3 && !submitted

                  return (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">{idx === 0 ? '🆕' : '📄'}</span>
                          <p className="text-xs font-medium text-gray-700">{report}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="text-[10px] font-medium text-endo-purple hover:underline">Download PDF</button>
                          <button className="text-[10px] text-gray-400 hover:text-gray-600">View</button>
                        </div>
                      </div>

                      {/* Interactive Clinical Utility Score */}
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-gray-400">Clinical Utility:</span>
                          {submitted ? (
                            <span className="text-[10px] text-green-600 font-medium">✅ Rated {rated}/5</span>
                          ) : (
                            [1, 2, 3, 4, 5].map(star => (
                              <button key={star} onClick={() => handleRateReport(repKey, star)}
                                className={`text-sm transition-all ${rated >= star ? 'text-amber-400 scale-110' : 'text-gray-300 hover:text-amber-300'}`}
                                title={`Rate ${star}`}
                              >{rated >= star ? '★' : '☆'}</button>
                            ))
                          )}
                        </div>

                        {/* Comment field for low ratings */}
                        {showComment && (
                          <div className="mt-2 flex gap-2">
                            <input
                              value={reportComments[repKey] || ''}
                              onChange={e => handleCommentChange(repKey, e.target.value)}
                              className="flex-1 text-[10px] px-2 py-1.5 rounded border border-gray-200 focus:border-indigo-400 outline-none"
                              placeholder="Notes for AI refinement (e.g., suspected lesion location mismatch)..."
                            />
                            <button onClick={() => handleSubmitRating(repKey, report)}
                              className="text-[10px] font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                              Submit
                            </button>
                          </div>
                        )}

                        {/* Quick submit for 4-5 star ratings */}
                        {rated > 3 && !submitted && (
                          <div className="mt-2">
                            <button onClick={() => handleSubmitRating(repKey, report)}
                              className="text-[10px] font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                              Submit Rating
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }) : (
                  <p className="text-xs text-gray-400 py-3 text-center">No reports shared yet.</p>
                )}
              </div>

              {/* Trend Sparklines */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Pain Trend (6 months)</h3>
              <div className="bg-gray-50 rounded-lg p-3 mb-5">
                <div className="flex items-end gap-0.5 h-12">
                  {[5, 6, 8, 7, 9, 4, 3, 5, 6, 7, 6, 4, 5, 3, 2, 4, 6, 8, 7, 5, 4, 3, 5, 6].map((val, idx) => (
                    <div key={idx} className="flex-1 rounded-t-sm transition-all"
                      style={{
                        height: `${(val / 10) * 100}%`,
                        backgroundColor: val >= 7 ? '#EF4444' : val >= 4 ? '#FB923C' : '#86EFAC',
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[8px] text-gray-400 mt-1">
                  <span>6mo ago</span>
                  <span>Avg: 5.2</span>
                  <span>Now</span>
                </div>
              </div>

              {/* Symptom Tags */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Primary Symptoms</h3>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['#Dysmenorrhea (92%)', '#Pelvic Pain (88%)', '#Endo Belly (45%)', '#Fatigue (40%)', '#Dyschezia (32%)'].map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-endo-purple/10 text-endo-purple font-medium">{tag}</span>
                ))}
              </div>

              {/* Clinic Notes */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Clinic Notes</h3>
              <textarea value={clinicNotes} onChange={e => setClinicNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:border-endo-purple outline-none resize-none h-16"
                placeholder="Add clinical notes for this patient..." />
              <div className="flex justify-end mt-2">
                <button className="text-xs font-medium bg-endo-purple text-white px-4 py-1.5 rounded-lg hover:bg-purple-700">Save Note</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== INVITATIONS VIEW ===== */}
        {currentView === 'invitations' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Manage Invitations</h3>
            <div className="space-y-3">
              {[
                { code: 'EB-X7K9M2', level: 'Advanced', status: 'pending', sent: '2 hours ago' },
                { code: 'EB-3P5R8N', level: 'Standard', status: 'accepted', sent: '1 day ago' },
              ].map(inv => (
                <div key={inv.code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{inv.code}</p>
                    <p className="text-[10px] text-gray-500">{inv.level} · Sent {inv.sent}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    inv.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {inv.status === 'accepted' ? '✅ Accepted' : '⏳ Pending'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button onClick={generateInviteCode} className="text-xs font-medium bg-endo-purple text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                + Generate New Invitation
              </button>
              {inviteCode && (
                <div className="mt-3 bg-purple-50 rounded-lg p-3 inline-block">
                  <p className="text-[10px] text-purple-600">New code generated:</p>
                  <p className="text-sm font-bold text-purple-800 tracking-wider">{inviteCode}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
