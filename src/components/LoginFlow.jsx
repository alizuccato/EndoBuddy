import { useState, useCallback } from 'react'
import { createUser, getUserId } from '../services/dbService'

/**
 * LoginFlow — Role-based login for Patients and Clinicians
 *
 * Two-step flow:
 *   1. Role selection (Patient / Clinician)
 *   2. Quick profile form tailored to the selected role
 *
 * WCAG-compliant with 44x44px touch targets on mobile.
 * Transitions seamlessly into the app via onComplete callback.
 */
export default function LoginFlow({ onComplete, onSkip }) {
  const [step, setStep] = useState('role')
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [specialty, setSpecialty] = useState('')

  const handleSelectRole = useCallback((selectedRole) => {
    setRole(selectedRole)
    setStep(selectedRole === 'patient' ? 'patient-form' : 'clinician-form')
  }, [])

  const handleBack = useCallback(() => {
    setStep('role')
    setRole(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    setLoading(true)
    try {
      const userData = {
        displayName: name || (role === 'patient' ? 'Patient' : 'Clinician'),
        role,
        clinicName: role === 'clinician' ? clinicName : undefined,
        specialty: role === 'clinician' ? specialty : undefined,
      }
      const user = await createUser(userData)
      onComplete({ ...user, role })
    } catch {
      // Fallback: use local ID with role
      onComplete({ id: getUserId(), role })
    } finally {
      setLoading(false)
    }
  }, [name, role, clinicName, specialty, onComplete])

  const handleSkip = useCallback(() => onSkip(), [onSkip])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-endo-lavender/10 via-white to-endo-pink/5 px-4">
      <div className="w-full max-w-md animate-fadeIn">
        {/* App Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3" role="img" aria-label="EndoBuddy">🌸</div>
          <h1 className="text-3xl font-bold text-endo-purple">
            Endo<span className="text-endo-pink">Buddy</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">Your AI-powered cycle companion</p>
        </div>

        {/* Step 1: Role Selection */}
        {step === 'role' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">Who are you?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">Choose your role to get started</p>

            <button onClick={() => handleSelectRole('patient')}
              className="w-full card hover:shadow-lg hover:border-endo-purple/30 transition-all duration-200 text-left group active:scale-[0.98]"
              aria-label="I'm tracking my symptoms — Patient">
              <div className="flex items-center gap-4 min-h-[44px]">
                <span className="text-4xl" role="img" aria-hidden="true">🌸</span>
                <div>
                  <p className="font-semibold text-gray-800 text-base group-hover:text-endo-purple transition-colors">
                    I'm tracking my symptoms
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">Log symptoms, generate doctor reports, track cycles</p>
                </div>
              </div>
            </button>

            <button onClick={() => handleSelectRole('clinician')}
              className="w-full card hover:shadow-lg hover:border-endo-purple/30 transition-all duration-200 text-left group active:scale-[0.98]"
              aria-label="I'm a healthcare professional — Clinician">
              <div className="flex items-center gap-4 min-h-[44px]">
                <span className="text-4xl" role="img" aria-hidden="true">🏥</span>
                <div>
                  <p className="font-semibold text-gray-800 text-base group-hover:text-endo-purple transition-colors">
                    I'm a healthcare professional
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">Access clinic portal, patient reports, surgical planning</p>
                </div>
              </div>
            </button>

            <div className="text-center pt-2">
              <button onClick={handleSkip}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] px-4">
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 2a: Patient Quick Form */}
        {step === 'patient-form' && (
          <div className="card">
            <button onClick={handleBack}
              className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 min-h-[44px]"
              aria-label="Go back">
              <span>←</span> Back
            </button>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome! 🌸</h2>
            <p className="text-sm text-gray-500 mb-6">Tell us a bit about yourself to personalize your experience</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="patient-name" className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
                <input id="patient-name" type="text" value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name (optional)"
                  className="input-field min-h-[44px]" autoFocus />
              </div>
              <button onClick={handleSubmit} disabled={loading}
                className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50">
                {loading ? (
                  <span className="inline-block animate-pulse">Loading...</span>
                ) : (
                  <><span>🌸</span> Continue to my dashboard</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2b: Clinician Quick Form */}
        {step === 'clinician-form' && (
          <div className="card">
            <button onClick={handleBack}
              className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 min-h-[44px]"
              aria-label="Go back">
              <span>←</span> Back
            </button>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome, Clinician 🏥</h2>
            <p className="text-sm text-gray-500 mb-6">Set up your clinic profile to access reports and patient tools</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="clinician-name" className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
                <input id="clinician-name" type="text" value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Jane Smith"
                  className="input-field min-h-[44px]" autoFocus />
              </div>
              <div>
                <label htmlFor="clinic-name" className="block text-sm font-medium text-gray-700 mb-1.5">Clinic / Hospital name</label>
                <input id="clinic-name" type="text" value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="e.g., Center for Endometriosis Care"
                  className="input-field min-h-[44px]" />
              </div>
              <div>
                <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1.5">Specialty</label>
                <input id="specialty" type="text" value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g., Minimally Invasive Gynecologic Surgery"
                  className="input-field min-h-[44px]" />
              </div>
              <button onClick={handleSubmit} disabled={loading}
                className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50">
                {loading ? (
                  <span className="inline-block animate-pulse">Loading...</span>
                ) : (
                  <><span>🏥</span> Access Clinic Portal</>
                )}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">Your data is private and secure. HIPAA/GDPR compliant.</p>
      </div>
    </div>
  )
}