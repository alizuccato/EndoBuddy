/**
 * EndoBuddy Database Service (Client-side)
 * 
 * Makes HTTP API calls to the backend server which communicates with Turso.
 * All values are stored/retrieved via REST endpoints.
 */

import { getLocalDateString } from '../utils/dateHelpers'

const API_BASE = '/api'

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const config = {
    headers: { 'Content-Type': 'application/json' },
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
// Seed Data (Demo)
// ============================================================

export async function seedDemoData(userId) {
  return request(`/seed/${userId || getUserId()}`, { method: 'POST' })
}

// ============================================================
// Combined: Save onboarding + seed demo data
// ============================================================

export async function completeOnboarding(onboardingData) {
  // Create user
  const user = await createUser({
    displayName: onboardingData.name || '',
    cycleLength: onboardingData.cycleLength || 28,
    lastPeriodStart: onboardingData.lastPeriodStart || null,
  })
  
  // Seed demo data for the new user
  await seedDemoData(user.id)
  
  return user
}

export { getUserId }