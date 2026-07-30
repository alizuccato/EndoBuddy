import { useState, useCallback } from 'react'
import { createUser, registerUser, loginUser } from '../services/dbService'

/**
 * LoginFlow — Role-based login for Patients and Clinicians
 *
 * Steps:
 *   'role'           — Role selection (Patient / Clinician), or "Log in"
 *                       for someone who already has an account
 *   'login'          — Email + password sign-in for an existing account
 *   'patient-form'   — Quick profile form for patients. Email/password are
 *                       optional here: leaving them blank creates a fast,
 *                       anonymous local account like before; filling them
 *                       in creates a recoverable account (registerUser)
 *                       that can be logged into from any device.
 *   'clinician-form' — Same idea, for clinicians.
 *
 * WCAG-compliant with 44x44px touch targets on mobile.
 * Transitions seamlessly into the app via onComplete callback.
 */
export default function LoginFlow({ onComplete, onSkip }) {
  const [step, setStep] = useState('role')
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const handleSelectRole = useCallback((selectedRole) => {
    setError('')
    setRole(selectedRole)
    setStep(selectedRole === 'patient' ? 'patient-form' : 'clinician-form')
  }, [])

  const handleBack = useCallback(() => {
    setError('')
    setStep('role')
    setRole(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const userData = {
        displayName: name || (role === 'patient' ? 'Patient' : 'Clinician'),
        role,
        clinicName: role === 'clinician' ? clinicName : undefined,
        specialty: role === 'clinician' ? specialty : undefined,
      }
      // If they filled in email + password, create a recoverable account
      // instead of a quick anonymous one.
      const user = (email && password)
        ? await registerUser({ ...userData, email, password })
        : await createUser(userData)
      onComplete({ ...user, role })
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [name, role, clinicName, specialty, email, password, onComplete])

  const handleLogin = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const user = await loginUser(loginEmail, loginPassword)
      onComplete(user)
    } catch (e) {
      setError(e.message === 'Invalid email or password' ? e.message : 'Could not log in. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [loginEmail, loginPassword, onComplete])

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

            <div className="text-center pt-2 space-y-2">
              <button onClick={() => { setError(''); setStep('login') }}
                className="block w-full text-sm font-medium text-endo-purple hover:text-endo-pink transition-colors min-h-[44px]">
                Already have an account? Log in
              </button>
              <button onClick={handleSkip}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] px-4">
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Log in to an existing (email + password) account */}
        {step === 'login' && (
          <div className="card">
            <button onClick={handleBack}
              className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 min-h-[44px]"
              aria-label="Go back">
              <span>←</span> Back
            </button>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome back 🌸</h2>
            <p className="text-sm text-gray-500 mb-6">Log in to pick up where you left off, on any device.</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input id="login-email" type="email" value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="input-field min-h-[44px]" autoFocus autoComplete="email" />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input id="login-password" type="password" value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Your password"
                  className="input-field min-h-[44px]" autoComplete="current-password"
                  onKeyDown={(e) => { if (e.key === 'Enter' && loginEmail && loginPassword && !loading) handleLogin() }} />
              </div>
              {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
              <button onClick={handleLogin} disabled={loading || !loginEmail || !loginPassword}
                className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50">
                {loading ? (
                  <span className="inline-block animate-pulse">Logging in...</span>
                ) : (
                  <><span>🌸</span> Log In</>
                )}
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
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3">Add an email &amp; password (optional) so you can log back in from any device — otherwise your account only lives in this browser.</p>
                <label htmlFor="patient-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input id="patient-email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com (optional)"
                  className="input-field min-h-[44px] mb-3" autoComplete="email" />
                <label htmlFor="patient-password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input id="patient-password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters (optional)"
                  className="input-field min-h-[44px]" autoComplete="new-password" />
              </div>
              {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
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
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3">Add an email &amp; password (optional) so you can log back in from any device — otherwise your account only lives in this browser.</p>
                <label htmlFor="clinician-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input id="clinician-email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.com (optional)"
                  className="input-field min-h-[44px] mb-3" autoComplete="email" />
                <label htmlFor="clinician-password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input id="clinician-password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters (optional)"
                  className="input-field min-h-[44px]" autoComplete="new-password" />
              </div>
              {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
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