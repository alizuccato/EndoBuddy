/**
 * ClinicianOnboarding
 *
 * Professional onboarding flow for medical professionals joining EndoBuddy.
 * Includes: Account creation, verification status, BAA sign-off, clinic config.
 * Design: /home/team/shared/clinician-onboarding-design.md
 */

import { useState } from 'react'

export default function ClinicianOnboarding({ onComplete }) {
  const [step, setStep] = useState('create')
  const [form, setForm] = useState({ name: '', title: '', npi: '', specialty: '', clinicName: '', clinicAddress: '' })
  const [verificationStatus, setVerificationStatus] = useState({ credentialCheck: 'in_progress', baaStatus: 'action_required', pilotStatus: 'pending' })
  const [clinicCode, setClinicCode] = useState('')
  const [staffList, setStaffList] = useState([])

  const handleFormChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmitProfile = () => {
    if (!form.name || !form.npi) return
    setStep('waiting')
    // Simulate credential check resolving
    setTimeout(() => setVerificationStatus(prev => ({ ...prev, credentialCheck: 'verified' })), 2000)
  }

  const handleBaaSign = () => {
    setVerificationStatus(prev => ({ ...prev, baaStatus: 'signed' }))
  }

  const handleCompleteWaiting = () => {
    if (verificationStatus.baaStatus !== 'signed') return
    setVerificationStatus(prev => ({ ...prev, pilotStatus: 'signed' }))
    setStep('config')
  }

  const generateCode = () => {
    const code = 'EB-CLINIC-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    setClinicCode(code)
  }

  const handleActivate = () => {
    setStep('dashboard')
    onComplete?.()
  }

  const statusLabels = {
    verified: { label: '✅ Verified', class: 'text-green-600 bg-green-50 border-green-200' },
    signed: { label: '✅ Signed', class: 'text-green-600 bg-green-50 border-green-200' },
    in_progress: { label: '⏳ In Progress', class: 'text-amber-600 bg-amber-50 border-amber-200' },
    action_required: { label: '⚠️ Action Required', class: 'text-red-600 bg-red-50 border-red-200' },
    pending: { label: '⏳ Pending', class: 'text-gray-500 bg-gray-50 border-gray-200' },
  }

  // ===== ACCOUNT CREATION =====
  if (step === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 space-y-5">
          <div className="text-center">
            <span className="text-3xl">🏥</span>
            <h2 className="text-xl font-bold text-gray-900 mt-2">Join EndoBuddy Clinical</h2>
            <p className="text-sm text-gray-500">Create your professional account to start receiving patient reports.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Full Name & Title *</label>
              <div className="grid grid-cols-2 gap-2">
                <input value={form.name} onChange={e => handleFormChange('name', e.target.value)} className="input-field text-sm col-span-2" placeholder="Dr. Jane Smith, MD" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">NPI Number (US) / License ID *</label>
              <input value={form.npi} onChange={e => handleFormChange('npi', e.target.value)} className="input-field text-sm" placeholder="1234567890" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Primary Specialty</label>
              <select value={form.specialty} onChange={e => handleFormChange('specialty', e.target.value)} className="input-field text-sm bg-white">
                <option value="">Select...</option>
                <option>Endometriosis Excision Specialist</option>
                <option>General Gynecologist</option>
                <option>Reproductive Endocrinologist</option>
                <option>Pain Management Specialist</option>
                <option>Pelvic Floor Physical Therapist</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Clinic Name</label>
              <input value={form.clinicName} onChange={e => handleFormChange('clinicName', e.target.value)} className="input-field text-sm" placeholder="City Endometriosis Center" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Clinic Address</label>
              <input value={form.clinicAddress} onChange={e => handleFormChange('clinicAddress', e.target.value)} className="input-field text-sm" placeholder="123 Medical Plaza, Suite 200" />
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <p className="text-[10px] text-blue-700">🔒 Your credentials will be verified against public registries. HIPAA-compliant.</p>
          </div>

          <button onClick={handleSubmitProfile} disabled={!form.name || !form.npi}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">Submit & Verify</button>
        </div>
      </div>
    )
  }

  // ===== WAITING ROOM =====
  if (step === 'waiting') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-5">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">⏳</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Verification in Progress</h2>
                <p className="text-xs text-gray-500">Estimated activation: Within 24 hours</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { key: 'credentialCheck', label: 'Identity Verification', detail: `NPI #${form.npi}`, status: verificationStatus.credentialCheck },
                { key: 'baaStatus', label: 'HIPAA BAA Agreement', detail: 'Business Associate Agreement', status: verificationStatus.baaStatus },
                { key: 'pilotStatus', label: 'Pilot Program Terms', detail: 'Clinical Pilot Agreement', status: verificationStatus.pilotStatus },
              ].map(item => {
                const s = statusLabels[item.status]
                return (
                  <div key={item.key} className={`flex items-center justify-between p-3 rounded-xl border ${s.class}`}>
                    <div>
                      <p className="text-xs font-medium">{item.label}</p>
                      <p className="text-[10px] opacity-70">{item.detail}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.class}`}>{s.label}</span>
                  </div>
                )
              })}
            </div>

            {/* BAA Sign-off */}
            {verificationStatus.baaStatus === 'action_required' && (
              <div className="mt-4 bg-red-50 rounded-xl p-4 border border-red-200">
                <p className="text-xs font-medium text-red-700 mb-2">HIPAA Business Associate Agreement</p>
                <p className="text-[10px] text-red-600 mb-3">You must sign the BAA before accessing patient data. This is a standard HIPAA requirement.</p>
                <button onClick={handleBaaSign} className="w-full py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">
                  ✍️ View & Sign BAA
                </button>
              </div>
            )}

            {/* Staff Management */}
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs font-semibold text-gray-700 mb-2">Add Clinic Staff (Optional)</p>
              <div className="flex gap-2">
                <input className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-200" placeholder="Staff email" />
                <select className="text-xs px-2 py-2 rounded-lg border border-gray-200 bg-white">
                  <option>Admin</option>
                  <option>Nurse</option>
                </select>
                <button className="text-xs bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300">+</button>
              </div>
              {staffList.length > 0 && <p className="text-[10px] text-gray-500 mt-2">{staffList.length} staff added</p>}
            </div>

            <button onClick={handleCompleteWaiting} disabled={verificationStatus.baaStatus !== 'signed'}
              className="w-full mt-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">
              Complete Verification
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== CLINIC CONFIG =====
  if (step === 'config') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 space-y-5">
          <div className="text-center">
            <span className="text-3xl">⚙️</span>
            <h2 className="text-xl font-bold text-gray-900 mt-2">Configure Your Clinic</h2>
            <p className="text-sm text-gray-500">Set up your clinic for patient data sharing.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Clinic Logo (Optional)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300">
                <span className="text-2xl">📁</span>
                <p className="text-xs text-gray-500 mt-1">Upload logo (PNG, JPG, SVG)</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Default Sharing Level</label>
              <select className="input-field text-sm bg-white">
                <option>Standard (Symptoms + Cycle Data)</option>
                <option>Advanced (Includes Surgical Planning)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Clinic Code</label>
              <div className="flex gap-2">
                <input value={clinicCode} readOnly className="input-field text-sm flex-1 font-mono" placeholder="Generate a code" />
                <button onClick={generateCode} className="text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200">Generate</button>
              </div>
              {clinicCode && <p className="text-[10px] text-green-600 mt-1">✅ Code generated. Share this with patients to link them to your clinic.</p>}
            </div>
          </div>

          <button onClick={handleActivate} disabled={!clinicCode}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">
            Activate Clinic Portal
          </button>
        </div>
      </div>
    )
  }

  // ===== FIRST-RUN DASHBOARD =====
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <span className="text-5xl">🎉</span>
          <h2 className="text-2xl font-bold text-gray-900 mt-3">Welcome to EndoBuddy Clinical</h2>
          <p className="text-sm text-gray-500 mt-1">Your clinic is verified and ready to connect with patients.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Getting Started — 3 Simple Steps</h3>
          <div className="space-y-3">
            {[
              { num: 1, text: 'Share your Clinic Code with a patient during their appointment.', icon: '🔑' },
              { num: 2, text: 'Patient enters the code in their EndoBuddy app to authorize data sharing.', icon: '📱' },
              { num: 3, text: 'Clinical Reports appear here in real-time before their next visit.', icon: '📋' },
            ].map(s => (
              <div key={s.num} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">{s.num}</div>
                <p className="text-xs text-gray-700 flex-1">{s.text}</p>
                <span className="text-lg">{s.icon}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Widget */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Invite Your First Patient</h3>
          <div className="space-y-3">
            <input className="input-field text-sm" placeholder="Patient Initials or ID" />
            <select className="input-field text-sm bg-white">
              <option>Standard Access</option>
              <option>Advanced Access</option>
            </select>
            <button onClick={generateCode} className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700">
              Generate Invitation Code
            </button>
            {clinicCode && (
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-indigo-600">Share this code with your patient:</p>
                <p className="text-lg font-bold text-indigo-800 tracking-wider">{clinicCode}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
