/**
 * EndoBuddy Database Service (Client-side)
 * 
 * Makes HTTP API calls to the backend server which communicates with Turso.
 * All values are stored/retrieved via REST endpoints.
 */

import { getLocalDateString } from '../utils/dateHelpers'

const API_BASE = '/api'

// Session token storage — set after a successful login/register, and sent
// as a Bearer token on every request from then on so the server's
// verifyUserAuth() can confirm requests for accounts that have an email
// (i.e. accounts that opted into being recoverable across devices).
function getToken() {
  return localStorage.getItem('endobuddy_session_token')
}
function setToken(token) {
  if (token) localStorage.setItem('endobuddy_session_token', token)
}
function clearToken() {
  localStorage.removeItem('endobuddy_session_token')
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const token = getToken()
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  }
  
  const res = await fetch(url, config)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// Get or create a demo user ID (stored in localStorage)
function getUserId() {
  let userId = localStorage.getItem('endobuddy_user_id')
  if (!userId) {
    userId = crypto.randomUUID?.() || 'demo-' + Date.now()
    localStorage.setItem('endobuddy_user_id', userId)
  }
  return userId
}

// ============================================================
// User API
// ============================================================

export async function createUser(userData) {
  const user = await request('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
  localStorage.setItem('endobuddy_user_id', user.id)
  return user
}

// Creates a recoverable account (email + password) instead of the quick
// anonymous one createUser() makes. Lets someone log back in later from
// any device or browser, since it doesn't depend on localStorage.
export async function registerUser(userData) {
  const user = await request('/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
  localStorage.setItem('endobuddy_user_id', user.id)
  setToken(user.token)
  return user
}

// Logs into an existing email+password account from any browser/device.
export async function loginUser(email, password) {
  const user = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem('endobuddy_user_id', user.id)
  setToken(user.token)
  return user
}

// Opens Stripe's hosted Billing Portal so the user can update payment
// details, view invoices, or cancel their subscription themselves.
export async function createBillingPortalSession(userId, returnUrl) {
  return request(`/users/${userId || getUserId()}/billing-portal`, {
    method: 'POST',
    body: JSON.stringify({ returnUrl: returnUrl || window.location.origin + '/' }),
  })
}

export function logoutUser() {
  clearToken()
  localStorage.removeItem('endobuddy_user_id')
}

export async function getUser(userId) {
  try {
    return await request(`/users/${userId || getUserId()}`)
  } catch {
    return null
  }
}

export async function updateUser(userId, data) {
  return request(`/users/${userId || getUserId()}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Sets a password (if the account has none yet, e.g. anonymous signup) or
// changes an existing one. currentPassword can be omitted when setting a
// password for the first time.
export async function changePassword(userId, { currentPassword, newPassword }) {
  const result = await request(`/users/${userId || getUserId()}/password`, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (result.token) setToken(result.token)
  return result
}

// Permanently deletes the account and all associated data. `password` is
// required only if the account has a password set.
export async function deleteAccount(userId, password) {
  const result = await request(`/users/${userId || getUserId()}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
  clearToken()
  localStorage.removeItem('endobuddy_user_id')
  return result
}

// ============================================================
// Daily Log API
// ============================================================

export async function saveDailyLog(logData) {
  const userId = logData.userId || getUserId()
  const today = getLocalDateString()
  
  return request('/logs', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      logDate: today,
      ...logData,
    }),
  })
}

export async function getLogs(userId) {
  return request(`/logs/${userId || getUserId()}`)
}

export async function getLogByDate(userId, date) {
  return request(`/logs/${userId || getUserId()}/${date}`)
}

export async function updateLog(logId, logData) {
  return request(`/logs/${logId}`, {
    method: 'PUT',
    body: JSON.stringify(logData),
  })
}

export async function deleteLog(logId) {
  return request(`/logs/${logId}`, {
    method: 'DELETE',
  })
}

// ============================================================
// Symptoms API
// ============================================================

export async function getSymptomsForLog(logId) {
  return request(`/symptoms/${logId}`)
}

// ============================================================
// Cycles API
// ============================================================

export async function startCycle(userId, periodStart) {
  return request('/cycles', {
    method: 'POST',
    body: JSON.stringify({ userId: userId || getUserId(), periodStart }),
  })
}

export async function getCycles(userId) {
  return request(`/cycles/${userId || getUserId()}`)
}

// ============================================================
// Insights API
// ============================================================

export async function getInsights(userId) {
  return request(`/insights/${userId || getUserId()}`)
}

// ============================================================
// AI Patterns API
// ============================================================

export async function getPatterns(userId) {
  return request(`/patterns/${userId || getUserId()}`)
}

// ============================================================
// Treatments API (medications, supplements, PT, etc.)
// ============================================================

export async function getTreatments(userId) {
  return request(`/treatments/${userId || getUserId()}`)
}

export async function addTreatment(treatmentData) {
  const userId = treatmentData.userId || getUserId()
  return request('/treatments', {
    method: 'POST',
    body: JSON.stringify({ ...treatmentData, userId }),
  })
}

export async function updateTreatment(treatmentId, data) {
  return request(`/treatments/${treatmentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteTreatment(treatmentId) {
  return request(`/treatments/${treatmentId}`, {
    method: 'DELETE',
  })
}

// ============================================================
// Feedback API
// ============================================================

export async function submitFeedback(data) {
  const userId = getUserId()
  return request('/feedback', {
    method: 'POST',
    body: JSON.stringify({ userId, ...data }),
  })
}

export async function getFeedbackStats() {
  return request('/feedback/stats')
}

// ============================================================
// Onboarding
// ============================================================

// Saves onboarding answers. If existingUserId is provided (the person is
// already logged in — e.g. their account just happens to have
// onboarding_complete unset), this UPDATES that account instead of
// creating a brand new anonymous one, which used to silently orphan real
// logins by switching localStorage over to a fresh empty account.
export async function completeOnboarding(onboardingData, existingUserId) {
  const cycleTrackingMode = onboardingData.cycleTrackingMode === 'acyclic' ? 'acyclic' : 'menstrual'
  const hormoneCycleTracking = !!onboardingData.hormoneCycleTracking

  if (existingUserId) {
    await updateUser(existingUserId, {
      displayName: onboardingData.name || undefined,
      cycleLength: onboardingData.cycleLength || 28,
      lastPeriodStart: onboardingData.lastPeriodStart || undefined,
      onboardingComplete: 1,
      cycleTrackingMode,
      hormoneCycleTracking,
    })
    return await getUser(existingUserId)
  }

  // No one logged in yet — create a fresh anonymous account (original behavior)
  const user = await createUser({
    displayName: onboardingData.name || '',
    cycleLength: onboardingData.cycleLength || 28,
    lastPeriodStart: onboardingData.lastPeriodStart || null,
    cycleTrackingMode,
    hormoneCycleTracking,
  })

  return user
}

// ============================================================
// Doctor Reports API
// ============================================================

// Saves a generated report (report_type: 'general' | 'lesion_mapping') so
// it becomes visible to whichever clinician this patient is currently
// linked to — visibility is governed entirely by the existing accepted
// clinic link, there's no separate per-report send step.
export async function saveDoctorReport(reportData) {
  const userId = reportData.userId || getUserId()
  return request('/reports', {
    method: 'POST',
    body: JSON.stringify({ ...reportData, userId }),
  })
}

export async function getDoctorReports(userId) {
  return request(`/reports/${userId || getUserId()}`)
}

// Called from the Clinic Portal's Report Vault to open one specific
// patient's report. Fails with 403 if that patient isn't (or is no
// longer) linked to this clinician.
export async function getClinicPatientReport(clinicianId, patientId, reportId) {
  return request(`/clinic/${clinicianId}/patients/${patientId}/reports/${reportId}`)
}

// ============================================================
// Clinic API
// ============================================================

export async function generateClinicInvitation(clinicianId, accessLevel = 'standard') {
  return request(`/clinic/${clinicianId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ accessLevel }),
  })
}

export async function getClinicInvitations(clinicianId) {
  return request(`/clinic/${clinicianId}/invitations`)
}

export async function getClinicPatients(clinicianId) {
  return request(`/clinic/${clinicianId}/patients`)
}

// Called from the patient's Profile tab to link their account to a
// clinician using a code the clinician generated in their Clinic Portal.
export async function acceptClinicInvitation(patientId, code) {
  return request('/clinic/invitations/accept', {
    method: 'POST',
    body: JSON.stringify({ patientId: patientId || getUserId(), code }),
  })
}

// Lets a patient unlink their account from whichever clinician they're
// currently connected to.
export async function disconnectFromClinic(patientId) {
  return request('/clinic/disconnect', {
    method: 'POST',
    body: JSON.stringify({ patientId: patientId || getUserId() }),
  })
}

export { getUserId }
