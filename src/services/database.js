/**
 * EndoBuddy Database Service
 * 
 * Provides CRUD operations for symptom and cycle tracking.
 * Supports both local SQLite (development) and Turso/libSQL (production).
 * 
 * All queries are parameterized to prevent SQL injection.
 * All user IDs are UUIDs — no sequential IDs.
 */

import { v4 as uuidv4 } from 'uuid'
import { TABLES } from '../db/schema'

// -------------------------------------------------------------------
// UUID generation (lightweight — uses crypto.randomUUID when available)
// -------------------------------------------------------------------
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return uuidv4()
}

// -------------------------------------------------------------------
// User operations
// -------------------------------------------------------------------

/**
 * Create a new user with minimal PII
 */
export function createUser(db, { displayName, dateOfBirth, timezone }) {
  const id = generateId()
  const now = new Date().toISOString()
  
  db.run(
    `INSERT INTO ${TABLES.USERS} (id, display_name, date_of_birth, timezone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, displayName || null, dateOfBirth || null, timezone || 'UTC', now, now]
  )
  
  return { id, displayName, dateOfBirth, timezone }
}

/**
 * Get a user by ID
 */
export function getUser(db, userId) {
  return db.get(
    `SELECT * FROM ${TABLES.USERS} WHERE id = ?`,
    [userId]
  )
}

// -------------------------------------------------------------------
// Daily Log operations
// -------------------------------------------------------------------

/**
 * Create or update a daily log entry
 * Uses UPSERT (INSERT OR REPLACE logic) for idempotency
 */
export function upsertDailyLog(db, { userId, logDate, cycleDay, cyclePhase, isPeriodDay, flowLevel, overallWellness, notes }) {
  const id = generateId()
  const now = new Date().toISOString()
  
  // Try update first, then insert
  const existing = db.get(
    `SELECT id FROM ${TABLES.DAILY_LOGS} WHERE user_id = ? AND log_date = ?`,
    [userId, logDate]
  )
  
  if (existing) {
    db.run(
      `UPDATE ${TABLES.DAILY_LOGS} SET
         cycle_day = ?, cycle_phase = ?, is_period_day = ?,
         flow_level = ?, overall_wellness = ?, notes = ?,
         updated_at = ?
       WHERE id = ?`,
      [cycleDay || null, cyclePhase || null, isPeriodDay ? 1 : 0,
       flowLevel || null, overallWellness || null, notes || null,
       now, existing.id]
    )
    return { id: existing.id, ...existing, ...{ cycleDay, cyclePhase, isPeriodDay, flowLevel, overallWellness, notes } }
  }
  
  db.run(
    `INSERT INTO ${TABLES.DAILY_LOGS} (id, user_id, log_date, cycle_day, cycle_phase, is_period_day, flow_level, overall_wellness, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, logDate, cycleDay || null, cyclePhase || null, isPeriodDay ? 1 : 0,
     flowLevel || null, overallWellness || null, notes || null, now, now]
  )
  
  return { id, userId, logDate, cycleDay, cyclePhase, isPeriodDay, flowLevel, overallWellness, notes }
}

/**
 * Get daily log for a user on a specific date
 */
export function getDailyLog(db, userId, logDate) {
  return db.get(
    `SELECT * FROM ${TABLES.DAILY_LOGS} WHERE user_id = ? AND log_date = ?`,
    [userId, logDate]
  )
}

/**
 * Get daily logs for a date range
 */
export function getDailyLogRange(db, userId, startDate, endDate) {
  return db.all(
    `SELECT * FROM ${TABLES.DAILY_LOGS}
     WHERE user_id = ? AND log_date >= ? AND log_date <= ?
     ORDER BY log_date DESC`,
    [userId, startDate, endDate]
  )
}

// -------------------------------------------------------------------
// Symptom Entry operations
// -------------------------------------------------------------------

/**
 * Log a symptom for a given daily log
 */
export function logSymptom(db, { dailyLogId, symptomId, severity, timeOfDay, durationMinutes, notes }) {
  const id = generateId()
  const now = new Date().toISOString()
  
  db.run(
    `INSERT INTO ${TABLES.SYMPTOM_ENTRIES} (id, daily_log_id, symptom_id, severity, time_of_day, duration_minutes, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, dailyLogId, symptomId, severity, timeOfDay || null, durationMinutes || null, notes || null, now]
  )
  
  return { id, dailyLogId, symptomId, severity, timeOfDay, durationMinutes, notes }
}

/**
 * Get all symptoms logged for a specific daily log
 */
export function getSymptomsForLog(db, dailyLogId) {
  return db.all(
    `SELECT se.*, s.name as symptom_name, s.category, s.icon
     FROM ${TABLES.SYMPTOM_ENTRIES} se
     JOIN ${TABLES.SYMPTOMS} s ON se.symptom_id = s.id
     WHERE se.daily_log_id = ?
     ORDER BY se.severity DESC`,
    [dailyLogId]
  )
}

// -------------------------------------------------------------------
// Pain Entry operations
// -------------------------------------------------------------------

/**
 * Log a pain entry with detailed endometriosis-specific data
 */
export function logPain(db, { dailyLogId, painLocationId, painType, severity, timeOfDay, durationMinutes, triggeredBy, reliefMethod, notes }) {
  const id = generateId()
  const now = new Date().toISOString()
  
  db.run(
    `INSERT INTO ${TABLES.PAIN_ENTRIES} (id, daily_log_id, pain_location_id, pain_type, severity, time_of_day, duration_minutes, triggered_by, relief_method, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, dailyLogId, painLocationId, painType || null, severity,
     timeOfDay || null, durationMinutes || null, triggeredBy || null,
     reliefMethod || null, notes || null, now]
  )
  
  return { id, dailyLogId, painLocationId, painType, severity, timeOfDay, durationMinutes, triggeredBy, reliefMethod, notes }
}

/**
 * Get pain entries for a daily log
 */
export function getPainForLog(db, dailyLogId) {
  return db.all(
    `SELECT pe.*, pl.name as location_name, pl.body_region
     FROM ${TABLES.PAIN_ENTRIES} pe
     JOIN ${TABLES.PAIN_LOCATIONS} pl ON pe.pain_location_id = pl.id
     WHERE pe.daily_log_id = ?
     ORDER BY pe.severity DESC`,
    [dailyLogId]
  )
}

// -------------------------------------------------------------------
// Food Entry operations
// -------------------------------------------------------------------

/**
 * Log a food/diet entry
 */
export function logFood(db, { dailyLogId, mealType, foodItems, inflammatoryRating, notes }) {
  const id = generateId()
  const now = new Date().toISOString()
  
  db.run(
    `INSERT INTO ${TABLES.FOOD_ENTRIES} (id, daily_log_id, meal_type, food_items, inflammatory_rating, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, dailyLogId, mealType || null, foodItems, inflammatoryRating || null, notes || null, now]
  )
  
  return { id, dailyLogId, mealType, foodItems, inflammatoryRating, notes }
}

/**
 * Get food entries for a daily log
 */
export function getFoodForLog(db, dailyLogId) {
  return db.all(
    `SELECT * FROM ${TABLES.FOOD_ENTRIES} WHERE daily_log_id = ? ORDER BY created_at ASC`,
    [dailyLogId]
  )
}

// -------------------------------------------------------------------
// Stress & Mood operations
// -------------------------------------------------------------------

/**
 * Log stress, mood, and sleep for a day
 */
export function logStressMood(db, { dailyLogId, stressLevel, mood, sleepHours, sleepQuality, exerciseMinutes, exerciseType, notes }) {
  const id = generateId()
  const now = new Date().toISOString()
  
  db.run(
    `INSERT INTO ${TABLES.STRESS_MOOD_ENTRIES} (id, daily_log_id, stress_level, mood, sleep_hours, sleep_quality, exercise_minutes, exercise_type, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, dailyLogId, stressLevel || null, mood || null,
     sleepHours || null, sleepQuality || null,
     exerciseMinutes || null, exerciseType || null, notes || null, now]
  )
  
  return { id, dailyLogId, stressLevel, mood, sleepHours, sleepQuality, exerciseMinutes, exerciseType, notes }
}

/**
 * Get stress/mood entries for a daily log
 */
export function getStressMoodForLog(db, dailyLogId) {
  return db.all(
    `SELECT * FROM ${TABLES.STRESS_MOOD_ENTRIES} WHERE daily_log_id = ? ORDER BY created_at ASC`,
    [dailyLogId]
  )
}

// -------------------------------------------------------------------
// Medication operations
// -------------------------------------------------------------------

/**
 * Log a medication entry
 */
export function logMedication(db, { dailyLogId, medicationId, customName, dosage, timeTaken, effective, sideEffects }) {
  const id = generateId()
  const now = new Date().toISOString()
  
  db.run(
    `INSERT INTO ${TABLES.MEDICATION_ENTRIES} (id, daily_log_id, medication_id, custom_name, dosage, time_taken, effective, side_effects, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, dailyLogId, medicationId || null, customName || null,
     dosage || null, timeTaken || null, effective ? 1 : 0,
     sideEffects || null, now]
  )
  
  return { id, dailyLogId, medicationId, customName, dosage, timeTaken, effective, sideEffects }
}

/**
 * Get medication entries for a daily log
 */
export function getMedicationsForLog(db, dailyLogId) {
  return db.all(
    `SELECT me.*, m.name as medication_name, m.type as medication_type, m.category as medication_category
     FROM ${TABLES.MEDICATION_ENTRIES} me
     LEFT JOIN ${TABLES.MEDICATIONS} m ON me.medication_id = m.id
     WHERE me.daily_log_id = ?
     ORDER BY me.created_at ASC`,
    [dailyLogId]
  )
}

// -------------------------------------------------------------------
// Cycle operations
// -------------------------------------------------------------------

/**
 * Start a new cycle (period start)
 */
export function startCycle(db, { userId, periodStart, periodEnd, notes }) {
  const id = generateId()
  const now = new Date().toISOString()
  
  db.run(
    `INSERT INTO ${TABLES.CYCLES} (id, user_id, period_start, period_end, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, periodStart, periodEnd || null, notes || null, now]
  )
  
  return { id, userId, periodStart, periodEnd, notes }
}

/**
 * Update cycle (e.g., set period end date)
 */
export function updateCycleEnd(db, cycleId, periodEnd) {
  db.run(
    `UPDATE ${TABLES.CYCLES} SET period_end = ?, cycle_length_days = julianday(?) - julianday(period_start) WHERE id = ?`,
    [periodEnd, periodEnd, cycleId]
  )
}

/**
 * Get all cycles for a user
 */
export function getUserCycles(db, userId) {
  return db.all(
    `SELECT * FROM ${TABLES.CYCLES} WHERE user_id = ? ORDER BY period_start DESC`,
    [userId]
  )
}

/**
 * Get the most recent cycle for a user
 */
export function getLatestCycle(db, userId) {
  return db.get(
    `SELECT * FROM ${TABLES.CYCLES} WHERE user_id = ? ORDER BY period_start DESC LIMIT 1`,
    [userId]
  )
}

// -------------------------------------------------------------------
// AI Pattern Insight operations
// -------------------------------------------------------------------

/**
 * Save an AI-detected pattern insight
 */
export function savePatternInsight(db, { userId, patternType, title, description, confidenceScore, supportingData }) {
  const id = generateId()
  const now = new Date().toISOString()
  
  db.run(
    `INSERT INTO ${TABLES.PATTERN_INSIGHTS} (id, user_id, pattern_type, title, description, confidence_score, supporting_data, detected_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, patternType, title, description,
     confidenceScore || null, supportingData ? JSON.stringify(supportingData) : null,
     now, now]
  )
  
  return { id, userId, patternType, title, description, confidenceScore, supportingData, detectedAt: now }
}

/**
 * Get active pattern insights for a user
 */
export function getActiveInsights(db, userId) {
  return db.all(
    `SELECT * FROM ${TABLES.PATTERN_INSIGHTS}
     WHERE user_id = ? AND is_active = 1
     ORDER BY confidence_score DESC`,
    [userId]
  )
}

// -------------------------------------------------------------------
// Doctor Report operations
// -------------------------------------------------------------------

/**
 * Generate and save a doctor report
 */
export function saveDoctorReport(db, { userId, startDate, endDate, reportType, reportData }) {
  const id = generateId()
  const now = new Date().toISOString()
  
  db.run(
    `INSERT INTO ${TABLES.DOCTOR_REPORTS} (id, user_id, start_date, end_date, report_type, report_data, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, startDate, endDate, reportType,
     JSON.stringify(reportData), now]
  )
  
  return { id, userId, startDate, endDate, reportType, reportData, generatedAt: now }
}

/**
 * Get all doctor reports for a user
 */
export function getUserReports(db, userId) {
  return db.all(
    `SELECT id, user_id, start_date, end_date, report_type, generated_at, shared_count
     FROM ${TABLES.DOCTOR_REPORTS}
     WHERE user_id = ?
     ORDER BY generated_at DESC`,
    [userId]
  )
}

// -------------------------------------------------------------------
// AI Analysis Queries
// -------------------------------------------------------------------

/**
 * Get average symptom severity by cycle phase
 * Useful for detecting which phase is worst for each symptom
 */
export function getSymptomSeverityByPhase(db, userId) {
  return db.all(
    `SELECT dl.cycle_phase, s.name as symptom_name, s.category,
            AVG(se.severity) as avg_severity,
            COUNT(*) as occurrences
     FROM ${TABLES.SYMPTOM_ENTRIES} se
     JOIN ${TABLES.DAILY_LOGS} dl ON se.daily_log_id = dl.id
     JOIN ${TABLES.SYMPTOMS} s ON se.symptom_id = s.id
     WHERE dl.user_id = ? AND dl.cycle_phase IS NOT NULL
     GROUP BY dl.cycle_phase, se.symptom_id
     HAVING occurrences >= 2
     ORDER BY avg_severity DESC`,
    [userId]
  )
}

/**
 * Get average pain severity by cycle phase
 */
export function getPainSeverityByPhase(db, userId) {
  return db.all(
    `SELECT dl.cycle_phase, pl.name as location_name,
            AVG(pe.severity) as avg_severity,
            COUNT(*) as occurrences
     FROM ${TABLES.PAIN_ENTRIES} pe
     JOIN ${TABLES.DAILY_LOGS} dl ON pe.daily_log_id = dl.id
     JOIN ${TABLES.PAIN_LOCATIONS} pl ON pe.pain_location_id = pl.id
     WHERE dl.user_id = ? AND dl.cycle_phase IS NOT NULL
     GROUP BY dl.cycle_phase, pe.pain_location_id
     HAVING occurrences >= 2
     ORDER BY avg_severity DESC`,
    [userId]
  )
}

/**
 * Correlate stress levels with symptom severity
 */
export function getStressSymptomCorrelation(db, userId) {
  return db.all(
    `SELECT sme.stress_level,
            s.name as symptom_name,
            AVG(se.severity) as avg_symptom_severity,
            COUNT(*) as data_points
     FROM ${TABLES.STRESS_MOOD_ENTRIES} sme
     JOIN ${TABLES.DAILY_LOGS} dl ON sme.daily_log_id = dl.id
     JOIN ${TABLES.SYMPTOM_ENTRIES} se ON se.daily_log_id = dl.id
     JOIN ${TABLES.SYMPTOMS} s ON se.symptom_id = s.id
     WHERE dl.user_id = ? AND sme.stress_level IS NOT NULL
     GROUP BY sme.stress_level, se.symptom_id
     HAVING data_points >= 2
     ORDER BY sme.stress_level DESC`,
    [userId]
  )
}

/**
 * Find potential food triggers by correlating food items with symptom severity
 */
export function getFoodTriggerCorrelation(db, userId, symptomName) {
  return db.all(
    `SELECT fe.food_items, fe.inflammatory_rating,
            AVG(se.severity) as avg_symptom_severity,
            COUNT(*) as occurrences
     FROM ${TABLES.FOOD_ENTRIES} fe
     JOIN ${TABLES.DAILY_LOGS} dl ON fe.daily_log_id = dl.id
     JOIN ${TABLES.SYMPTOM_ENTRIES} se ON se.daily_log_id = dl.id
     JOIN ${TABLES.SYMPTOMS} s ON se.symptom_id = s.id
     WHERE dl.user_id = ? AND s.name = ?
     GROUP BY fe.food_items
     HAVING occurrences >= 2
     ORDER BY avg_symptom_severity DESC
     LIMIT 20`,
    [userId, symptomName]
  )
}

/**
 * Generate a complete day summary with all tracked data
 */
export function getFullDaySummary(db, userId, logDate) {
  const dailyLog = getDailyLog(db, userId, logDate)
  if (!dailyLog) return null
  
  return {
    ...dailyLog,
    symptoms: getSymptomsForLog(db, dailyLog.id),
    pain: getPainForLog(db, dailyLog.id),
    food: getFoodForLog(db, dailyLog.id),
    stressMood: getStressMoodForLog(db, dailyLog.id),
    medications: getMedicationsForLog(db, dailyLog.id),
  }
}

/**
 * Generate a report-ready symptom timeline for a date range
 * Used for doctor consultation reports
 */
export function getSymptomTimeline(db, userId, startDate, endDate) {
  return db.all(
    `SELECT dl.log_date, dl.cycle_day, dl.cycle_phase, dl.is_period_day, dl.flow_level,
            dl.overall_wellness,
            s.name as symptom_name, s.category, s.icon,
            se.severity as symptom_severity,
            pl.name as pain_location, pe.severity as pain_severity, pe.pain_type,
            sme.stress_level, sme.mood, sme.sleep_hours, sme.sleep_quality
     FROM ${TABLES.DAILY_LOGS} dl
     LEFT JOIN ${TABLES.SYMPTOM_ENTRIES} se ON se.daily_log_id = dl.id
     LEFT JOIN ${TABLES.SYMPTOMS} s ON se.symptom_id = s.id
     LEFT JOIN ${TABLES.PAIN_ENTRIES} pe ON pe.daily_log_id = dl.id
     LEFT JOIN ${TABLES.PAIN_LOCATIONS} pl ON pe.pain_location_id = pl.id
     LEFT JOIN ${TABLES.STRESS_MOOD_ENTRIES} sme ON sme.daily_log_id = dl.id
     WHERE dl.user_id = ? AND dl.log_date >= ? AND dl.log_date <= ?
     ORDER BY dl.log_date ASC`,
    [userId, startDate, endDate]
  )
}