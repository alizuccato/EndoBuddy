/**
 * EndoBuddy Schema & Database Service
 * 
 * Central database interface for symptom and cycle tracking.
 * Designed to work with any SQLite-compatible backend (local SQLite or Turso/libSQL).
 * 
 * Privacy: All user data is pseudonymous via UUIDs.
 * No PII (email/name) stored in tracking tables.
 */

// Table names for reference
export const TABLES = {
  USERS: 'users',
  CYCLES: 'cycles',
  CYCLE_PHASES: 'cycle_phases',
  DAILY_LOGS: 'daily_logs',
  SYMPTOMS: 'symptoms',
  SYMPTOM_ENTRIES: 'symptom_entries',
  PAIN_LOCATIONS: 'pain_locations',
  PAIN_ENTRIES: 'pain_entries',
  FOOD_ENTRIES: 'food_entries',
  STRESS_MOOD_ENTRIES: 'stress_mood_entries',
  MEDICATIONS: 'medications',
  MEDICATION_ENTRIES: 'medication_entries',
  PATTERN_INSIGHTS: 'pattern_insights',
  DOCTOR_REPORTS: 'doctor_reports',
}

/**
 * Current schema version
 */
export const SCHEMA_VERSION = 1

/**
 * Default database configuration
 */
export const DB_CONFIG = {
  // Local SQLite path (for development/offline)
  localPath: 'endobuddy.db',
  // Turso/libSQL URL (set via env in production)
  tursoUrl: process.env.TURSO_DATABASE_URL || null,
  tursoToken: process.env.TURSO_AUTH_TOKEN || null,
}

/**
 * Category constants for reference data
 */
export const SYMPTOM_CATEGORIES = {
  PAIN: 'pain',
  DIGESTIVE: 'digestive',
  NEUROLOGICAL: 'neurological',
  EMOTIONAL: 'emotional',
  GENERAL: 'general',
  URINARY: 'urinary',
}

export const PAIN_TYPES = [
  'cramping',
  'sharp',
  'stabbing',
  'dull',
  'burning',
  'throbbing',
]

export const FLOW_LEVELS = ['light', 'medium', 'heavy', 'spotting']

export const CYCLE_PHASES_LIST = ['menstrual', 'follicular', 'ovulatory', 'luteal']

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

export const TIME_OF_DAY = ['morning', 'afternoon', 'evening', 'night']

export const MOODS = [
  'happy', 'anxious', 'depressed', 'irritable',
  'neutral', 'calm', 'sad', 'angry', 'energetic',
]

export const EXERCISE_TYPES = [
  'walking', 'running', 'yoga', 'swimming',
  'cycling', 'strength', 'pilates', 'stretching',
  'dancing', 'other',
]

export const MEDICATION_TYPES = ['prescription', 'OTC', 'supplement', 'herbal']

export const PATTERN_TYPES = [
  'symptom_cycle_correlation',
  'food_trigger',
  'stress_impact',
  'medication_effectiveness',
]

export const REPORT_TYPES = ['full', 'symptom_summary', 'cycle_summary']