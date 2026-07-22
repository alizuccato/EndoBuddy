/**
 * EndoBuddy API Server
 * 
 * Lightweight HTTP server bridging the React frontend to the Turso database.
 * Uses `team-db` CLI for all database operations.
 * Runs on port 3001, proxied by Vite on port 5173.
 */

import { createServer } from 'http'
import { execSync } from 'child_process'
import { randomUUID, scryptSync, timingSafeEqual } from 'crypto'

const PORT = 3001

function teamDb(sql) {
  try {
    // Escape quotes properly for shell
    const escaped = sql.replace(/'/g, "'\\''")
    const result = execSync(`team-db '${escaped}'`, { encoding: 'utf-8', timeout: 10000 })
    return JSON.parse(result.trim())
  } catch (err) {
    console.error('DB Error:', err.stderr?.toString() || err.message)
    throw new Error(err.stderr?.toString() || err.message)
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch { resolve({}) }
    })
    req.on('error', reject)
  })
}

// Ensure session table exists at startup
try {
  teamDb("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT)")
} catch (e) {
  console.error("Failed to create sessions table:", e.message)
}

// Password hashing with scrypt (salt + hash)
function hashPassword(password) {
  const salt = randomUUID().slice(0, 16)
  const hash = scryptSync(password, salt, 64).toString('hex')
  return salt + ':' + hash
}

// Ensure database password verification works smoothly
function verifyPassword(password, stored) {
  try {
    const parts = stored.split(':')
    if (parts.length < 2) return false
    const salt = parts[0]
    const hash = parts[1]
    const derived = scryptSync(password, salt, 64).toString('hex')
    return timingSafeEqual(Buffer.from(derived), Buffer.from(hash))
  } catch (e) {
    return false
  }
}

// Generate a simple session token
function generateToken() {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
}

// ===== SECURITY HELPERS =====
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id)
}
function escapeStr(str) {
  if (str == null) return 'NULL'
  return "'" + String(str).replace(/'/g, "''") + "'"
}
function isValidDate(str) {
  if (!str || typeof str !== 'string') return false
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str))
}
function isValidNumber(val) {
  if (val === null || val === undefined) return false
  const num = Number(val)
  return typeof val !== 'object' && !isNaN(num) && isFinite(num)
}
function requireUUID(val, name) {
  if (!isValidUUID(val)) throw new Error('Invalid ' + (name || 'UUID') + ': ' + val)
  return val
}

// ===== CORS ORIGIN HARDENING =====
const ALLOWED_ORIGINS = [
  'https://endobuddy.ctonew.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001'
]
function setCorsHeaders(req, res) {
  const origin = req.headers.origin
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://endobuddy.ctonew.app'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

// ===== IN-MEMORY RATE LIMITING =====
const rateLimitMap = new Map()
function checkRateLimit(req, res, isStrict = false) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const limit = isStrict ? 15 : 120 // Generous limits to allow seamless UI navigation
  const windowMs = 60000 // 1 minute
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  const data = rateLimitMap.get(ip)
  if (now > data.resetTime) {
    data.count = 1
    data.resetTime = now + windowMs
    return true
  }
  
  data.count++
  if (data.count > limit) {
    res.writeHead(429, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Too many requests. Please try again in a minute.' }))
    return false
  }
  return true
}

// ===== AUTHENTICATION & AUTHORIZATION MIDDLEWARE =====
function getAuthenticatedUserId(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]
  if (!token || token.length < 10) return null
  
  try {
    const rows = teamDb(`SELECT user_id, created_at FROM sessions WHERE token = ${escapeStr(token)}`)
    if (rows.length === 0) return null
    const session = rows[0]
    if (session.created_at) {
      const createdAt = new Date(session.created_at)
      const expiry = 24 * 60 * 60 * 1000 // 24-hour TTL expiry
      if (Date.now() - createdAt.getTime() > expiry) {
        try {
          teamDb(`DELETE FROM sessions WHERE token = ${escapeStr(token)}`)
        } catch (e) {
          console.error("Failed to delete expired session:", e.message)
        }
        return null
      }
    }
    return session.user_id
  } catch (e) {
    return null
  }
}

function verifyUserAuth(req, res, targetUserId) {
  try {
    const userRows = teamDb(`SELECT email FROM users WHERE id = ${escapeStr(targetUserId)}`)
    if (userRows.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'User not found' }))
      return false
    }
    
    const user = userRows[0]
    
    // If the user has a registered email, they MUST be authenticated via session token matching targetUserId
    if (user.email) {
      const authUserId = getAuthenticatedUserId(req)
      if (!authUserId) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Authentication token required (Bearer)' }))
        return false
      }
      if (authUserId !== targetUserId) {
        res.writeHead(403, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Access denied: You do not have permission to access this resource' }))
        return false
      }
    }
    return true
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error during auth verification' }))
    return false
  }
}

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json'
  })
  res.end(JSON.stringify(data))
}

try { teamDb(`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT)`) } catch (e) {}

const router = {
  // Health check
  'GET /api/health': (req, res) => {
    json(res, { status: 'ok', timestamp: new Date().toISOString() })
  },

  // ===== USERS =====
  'POST /api/users': async (req, res) => {
    const body = await parseBody(req)
    const id = randomUUID()
    const now = new Date().toISOString()
    
    // Input validation & sanitization
    const safeName = escapeStr(body.displayName || '')
    const safeDob = isValidDate(body.dateOfBirth) ? escapeStr(body.dateOfBirth) : 'NULL'
    const safeTz = escapeStr(body.timezone || 'UTC')
    const safeCycle = isValidNumber(body.cycleLength) ? Number(body.cycleLength) : 28
    const safeLps = isValidDate(body.lastPeriodStart) ? escapeStr(body.lastPeriodStart) : 'NULL'
    const safeRole = ['patient', 'clinician', 'admin'].includes(body.role) ? escapeStr(body.role) : escapeStr('patient')
    const safeClinic = escapeStr(body.clinicName || '')
    const safeSpecialty = escapeStr(body.specialty || '')
    
    teamDb(`INSERT INTO users (id, display_name, date_of_birth, timezone, cycle_length_avg, last_period_start, onboarding_complete, created_at, updated_at, role, clinic_name, specialty) VALUES (${escapeStr(id)}, ${safeName}, ${safeDob}, ${safeTz}, ${safeCycle}, ${safeLps}, 1, ${escapeStr(now)}, ${escapeStr(now)}, ${safeRole}, ${safeClinic}, ${safeSpecialty})`)
    json(res, { id, ...body }, 201)
  },

  'GET /api/users/:id': (req, res, params) => {
    if (!isValidUUID(params.id)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!verifyUserAuth(req, res, params.id)) return
    
    const rows = teamDb(`SELECT * FROM users WHERE id = ${escapeStr(params.id)}`)
    if (rows.length === 0) return json(res, { error: 'User not found' }, 404)
    json(res, rows[0])
  },

  'PUT /api/users/:id': async (req, res, params) => {
    if (!isValidUUID(params.id)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!verifyUserAuth(req, res, params.id)) return
    
    const body = await parseBody(req)
    const now = new Date().toISOString()
    
    // Strict allowlist of updatable fields with DB column mapping
    const ALLOWED_FIELDS = {
      displayName: 'display_name',
      dateOfBirth: 'date_of_birth',
      timezone: 'timezone',
      cycleLength: 'cycle_length_avg',
      lastPeriodStart: 'last_period_start',
      onboardingComplete: 'onboarding_complete',
      clinicName: 'clinic_name',
      specialty: 'specialty',
      email: 'email',
    }
    
    const updates = []
    for (const [field, dbCol] of Object.entries(ALLOWED_FIELDS)) {
      if (body[field] !== undefined && body[field] !== null) {
        let val = body[field]
        if (field === 'dateOfBirth' || field === 'lastPeriodStart') {
          val = isValidDate(val) ? escapeStr(val) : 'NULL'
        } else if (typeof val === 'string') {
          val = escapeStr(val)
        } else if (field === 'cycleLength' || field === 'onboardingComplete') {
          val = isValidNumber(val) ? Number(val) : 'NULL'
        } else {
          val = 'NULL'
        }
        updates.push(`${dbCol} = ${val}`)
      }
    }
    
    if (updates.length === 0) return json(res, { error: 'No valid fields to update' }, 400)
    teamDb(`UPDATE users SET ${updates.join(', ')}, updated_at = ${escapeStr(now)} WHERE id = ${escapeStr(params.id)}`)
    json(res, { id: params.id, updated: true })
  },

  // ===== DAILY LOGS =====
  'POST /api/logs': async (req, res) => {
    const body = await parseBody(req)
    if (!isValidUUID(body.userId)) return json(res, { error: 'Invalid or missing user ID' }, 400)
    if (!verifyUserAuth(req, res, body.userId)) return
    
    if (!isValidDate(body.logDate)) return json(res, { error: 'Invalid or missing log date' }, 400)
    
    const id = randomUUID()
    const now = new Date().toISOString()
    
    // Validate optional inputs
    const cycleDay = isValidNumber(body.cycleDay) ? Number(body.cycleDay) : 'NULL'
    const cyclePhase = ['menstrual', 'follicular', 'ovulatory', 'luteal'].includes(body.cyclePhase) ? escapeStr(body.cyclePhase) : 'NULL'
    const isPeriodDay = body.isPeriodDay ? 1 : 0
    const flowLevel = ['heavy', 'medium', 'light', 'spotting'].includes(body.flowLevel) ? escapeStr(body.flowLevel) : 'NULL'
    const painLevel = (isValidNumber(body.painLevel) && body.painLevel >= 0 && body.painLevel <= 10) ? Number(body.painLevel) : 'NULL'
    const overallWellness = (isValidNumber(body.overallWellness) && body.overallWellness >= 1 && body.overallWellness <= 10) ? Number(body.overallWellness) : 'NULL'
    const notes = body.notes ? escapeStr(String(body.notes)) : 'NULL'
    
    teamDb(`INSERT INTO daily_logs (id, user_id, log_date, cycle_day, cycle_phase, is_period_day, flow_level, pain_level, overall_wellness, notes, created_at, updated_at) VALUES (${escapeStr(id)}, ${escapeStr(body.userId)}, ${escapeStr(body.logDate)}, ${cycleDay}, ${cyclePhase}, ${isPeriodDay}, ${flowLevel}, ${painLevel}, ${overallWellness}, ${notes}, ${escapeStr(now)}, ${escapeStr(now)})`)
    
    // Save symptoms
    if (body.symptoms && Array.isArray(body.symptoms) && body.symptoms.length > 0) {
      for (const symptom of body.symptoms) {
        if (!symptom.name) continue
        const sid = randomUUID()
        const safeSymName = escapeStr(symptom.name)
        const safeSymIcon = escapeStr(symptom.icon || '')
        const safeSeverity = (isValidNumber(symptom.severity) && symptom.severity >= 1 && symptom.severity <= 10) ? Number(symptom.severity) : 5
        
        teamDb(`INSERT INTO symptom_entries (id, daily_log_id, symptom_name, symptom_icon, severity, created_at) VALUES (${escapeStr(sid)}, ${escapeStr(id)}, ${safeSymName}, ${safeSymIcon}, ${safeSeverity}, ${escapeStr(now)})`)
      }
    }
    
    json(res, { id, ...body }, 201)
  },

  'GET /api/logs/:userId': (req, res, params) => {
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!verifyUserAuth(req, res, params.userId)) return
    
    const rows = teamDb(`SELECT * FROM daily_logs WHERE user_id = ${escapeStr(params.userId)} ORDER BY log_date DESC LIMIT 90`)
    json(res, rows)
  },

  'GET /api/logs/:userId/:date': (req, res, params) => {
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!verifyUserAuth(req, res, params.userId)) return
    if (!isValidDate(params.date)) return json(res, { error: 'Invalid date format (must be YYYY-MM-DD)' }, 400)
    
    const rows = teamDb(`SELECT * FROM daily_logs WHERE user_id = ${escapeStr(params.userId)} AND log_date = ${escapeStr(params.date)}`)
    if (rows.length === 0) return json(res, null)
    const log = rows[0]
    const symptoms = teamDb(`SELECT * FROM symptom_entries WHERE daily_log_id = ${escapeStr(log.id)}`)
    json(res, { ...log, symptoms })
  },

  // ===== SYMPTOMS FOR A LOG =====
  'GET /api/symptoms/:logId': (req, res, params) => {
    if (!isValidUUID(params.logId)) return json(res, { error: 'Invalid log ID format' }, 400)
    
    // Resolve log first to check authorization
    const logRows = teamDb(`SELECT user_id FROM daily_logs WHERE id = ${escapeStr(params.logId)}`)
    if (logRows.length === 0) return json(res, { error: 'Log entry not found' }, 404)
    if (!verifyUserAuth(req, res, logRows[0].user_id)) return
    
    const rows = teamDb(`SELECT * FROM symptom_entries WHERE daily_log_id = ${escapeStr(params.logId)} ORDER BY severity DESC`)
    json(res, rows)
  },

  // ===== CYCLES =====
  'POST /api/cycles': async (req, res) => {
    const body = await parseBody(req)
    if (!isValidUUID(body.userId)) return json(res, { error: 'Invalid or missing user ID' }, 400)
    if (!verifyUserAuth(req, res, body.userId)) return
    
    if (!isValidDate(body.periodStart)) return json(res, { error: 'Invalid or missing period start date' }, 400)
    
    const id = randomUUID()
    const now = new Date().toISOString()
    const safeStart = escapeStr(body.periodStart)
    const safeEnd = isValidDate(body.periodEnd) ? escapeStr(body.periodEnd) : 'NULL'
    const safeNotes = body.notes ? escapeStr(String(body.notes)) : 'NULL'
    
    teamDb(`INSERT INTO cycles (id, user_id, period_start, period_end, notes, created_at) VALUES (${escapeStr(id)}, ${escapeStr(body.userId)}, ${safeStart}, ${safeEnd}, ${safeNotes}, ${escapeStr(now)})`)
    json(res, { id, ...body }, 201)
  },

  'GET /api/cycles/:userId': (req, res, params) => {
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!verifyUserAuth(req, res, params.userId)) return
    
    const rows = teamDb(`SELECT * FROM cycles WHERE user_id = ${escapeStr(params.userId)} ORDER BY period_start DESC`)
    json(res, rows)
  },

  // ===== INSIGHTS =====
  'GET /api/insights/:userId': (req, res, params) => {
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!verifyUserAuth(req, res, params.userId)) return
    
    // Calculate pain-by-phase from logged data
    const logRows = teamDb(`SELECT dl.cycle_phase, dl.pain_level, dl.log_date FROM daily_logs dl WHERE dl.user_id = ${escapeStr(params.userId)} AND dl.pain_level IS NOT NULL ORDER BY dl.log_date`)
    
    if (logRows.length === 0) {
      return json(res, { painByPhase: {}, avgPain: null, totalLogs: 0 })
    }
    
    const painByPhase = {}
    for (const row of logRows) {
      if (!row.cycle_phase) continue
      if (!painByPhase[row.cycle_phase]) painByPhase[row.cycle_phase] = []
      painByPhase[row.cycle_phase].push(row.pain_level)
    }
    
    const phaseAverages = {}
    for (const [phase, levels] of Object.entries(painByPhase)) {
      phaseAverages[phase] = {
        avg: (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1),
        max: Math.max(...levels),
        count: levels.length,
      }
    }
    
    const allLevels = logRows.map(r => r.pain_level).filter(p => p != null)
    const avgPain = allLevels.length > 0 ? (allLevels.reduce((a, b) => a + b, 0) / allLevels.length).toFixed(1) : null
    
    json(res, { painByPhase: phaseAverages, avgPain, totalLogs: logRows.length })
  },

  // ===== AI PATTERN RECOGNITION =====
  'GET /api/patterns/:userId': (req, res, params) => {
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!verifyUserAuth(req, res, params.userId)) return
    
    const userId = params.userId
    const patterns = []

    // 1. Fetch all logs with symptoms
    const logRows = teamDb(`SELECT dl.id, dl.log_date, dl.cycle_phase, dl.pain_level, dl.cycle_day 
      FROM daily_logs dl WHERE dl.user_id = ${escapeStr(userId)} AND dl.pain_level IS NOT NULL 
      ORDER BY dl.log_date ASC`)
    
    if (logRows.length < 5) {
      return json(res, { patterns: [], message: 'Need at least 5 logged days for analysis' })
    }

    // Build a map: logId -> { date, phase, painLevel, cycleDay }
    const logMap = {}
    for (const row of logRows) {
      logMap[row.id] = { date: row.log_date, phase: row.cycle_phase, pain: row.pain_level, day: row.cycle_day }
    }

    // Fetch all symptoms
    const logIds = logRows.map(r => `'${r.id}'`).join(',')
    const symptomRows = teamDb(`SELECT se.daily_log_id, se.symptom_name, se.severity, se.symptom_icon 
      FROM symptom_entries se WHERE se.daily_log_id IN (${logIds})`)

    // Group symptoms by log
    const symptomsByLog = {}
    for (const sr of symptomRows) {
      if (!symptomsByLog[sr.daily_log_id]) symptomsByLog[sr.daily_log_id] = []
      symptomsByLog[sr.daily_log_id].push({ name: sr.symptom_name, severity: sr.severity, icon: sr.symptom_icon })
    }

    // ============================================================
    // ANALYSIS 1: Phase-Symptom Correlation
    // ============================================================
    const phasePain = { menstrual: [], follicular: [], ovulatory: [], luteal: [] }
    const phaseSymptoms = { menstrual: {}, follicular: {}, ovulatory: {}, luteal: {} }
    
    for (const row of logRows) {
      const phase = row.cycle_phase
      if (!phase || !phasePain[phase]) continue
      phasePain[phase].push(row.pain_level)
      
      const syms = symptomsByLog[row.id] || []
      for (const s of syms) {
        if (!phaseSymptoms[phase][s.name]) phaseSymptoms[phase][s.name] = []
        phaseSymptoms[phase][s.name].push(s.severity)
      }
    }

    // Calculate phase averages and find correlations
    const phaseAverages = {}
    for (const [phase, levels] of Object.entries(phasePain)) {
      if (levels.length > 0) {
        phaseAverages[phase] = (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1)
      }
    }

    // Find which phase has highest average pain
    const sortedPhases = Object.entries(phaseAverages).sort((a, b) => b[1] - a[1])
    if (sortedPhases.length >= 2) {
      const worst = sortedPhases[0]
      const best = sortedPhases[sortedPhases.length - 1]
      const increase = ((parseFloat(worst[1]) - parseFloat(best[1])) / parseFloat(best[1]) * 100).toFixed(0)
      
      if (parseFloat(increase) >= 20) {
        patterns.push({
          id: randomUUID(),
          type: 'phase_correlation',
          title: `Pain spikes during ${worst[0]} phase`,
          description: `Your pain averages ${worst[1]}/10 during ${worst[0]} phase — that's ${increase}% higher than your best phase (${best[0]}: ${best[1]}/10).`,
          severity: parseFloat(worst[1]) >= 7 ? 'warning' : 'info',
          icon: parseFloat(worst[1]) >= 7 ? '⚠️' : '📊',
          confidence: Math.min(0.95, 0.5 + (parseFloat(worst[1]) / 20)),
          metric: { phase: worst[0], avgPain: worst[1], increasePct: parseInt(increase) },
        })
      }
    }

    // Find symptom-specific phase correlations
    for (const [symptomName, phasesWithSymptom] of Object.entries(
      Object.fromEntries(
        Object.entries(phaseSymptoms).map(([phase, syms]) => [phase, Object.entries(syms)])
      )
    )) {
      // Check each symptom across phases
      const symptomPhaseData = {}
      for (const [phase, syms] of Object.entries(phaseSymptoms)) {
        for (const [symName, severities] of Object.entries(syms)) {
          if (!symptomPhaseData[symName]) symptomPhaseData[symName] = {}
          symptomPhaseData[symName][phase] = (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1)
        }
      }

      for (const [symName, phaseData] of Object.entries(symptomPhaseData)) {
        const phaseEntries = Object.entries(phaseData).filter(([_, v]) => v !== 'NaN')
        if (phaseEntries.length >= 2) {
          phaseEntries.sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
          const worstPhase = phaseEntries[0]
          const otherAvg = phaseEntries.slice(1).reduce((s, [_, v]) => s + parseFloat(v), 0) / (phaseEntries.length - 1)
          const multiplier = (parseFloat(worstPhase[1]) / Math.max(otherAvg, 0.1)).toFixed(1)
          
          if (parseFloat(multiplier) >= 1.5 && patterns.length < 8) {
            patterns.push({
              id: randomUUID(),
              type: 'symptom_phase_correlation',
              title: `${symName} peaks during ${worstPhase[0]} phase`,
              description: `Your ${symName.toLowerCase()} severity is ${multiplier}x higher during ${worstPhase[0]} compared to other phases (${worstPhase[1]}/10 vs ~${otherAvg.toFixed(1)}/10).`,
              severity: parseFloat(worstPhase[1]) >= 6 ? 'warning' : 'info',
              icon: '🔍',
              confidence: Math.min(0.9, 0.4 + (parseInt(multiplier) / 5)),
              metric: { symptom: symName, phase: worstPhase[0], avgSeverity: worstPhase[1], multiplier: parseFloat(multiplier) },
            })
          }
        }
      }
    }

    // ============================================================
    // ANALYSIS 2: Symptom Clusters
    // ============================================================
    const symptomCooccurrence = {}
    const symptomCount = {}
    
    for (const row of logRows) {
      const syms = symptomsByLog[row.id] || []
      const names = [...new Set(syms.map(s => s.name))]
      
      for (const name of names) {
        symptomCount[name] = (symptomCount[name] || 0) + 1
      }
      
      // Count co-occurrences
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const key = [names[i], names[j]].sort().join('+')
          symptomCooccurrence[key] = (symptomCooccurrence[key] || 0) + 1
        }
      }
    }

    // Find strongest clusters (co-occur in > 40% of days where either appears)
    const totalLogs = logRows.length
    for (const [key, count] of Object.entries(symptomCooccurrence)) {
      const [a, b] = key.split('+')
      const freqA = symptomCount[a] || 0
      const freqB = symptomCount[b] || 0
      const minFreq = Math.min(freqA, freqB)
      const cooccurrenceRate = minFreq > 0 ? (count / minFreq) : 0
      
      if (cooccurrenceRate >= 0.35 && count >= 3 && patterns.length < 10) {
        const aIcon = symptomRows.find(s => s.symptom_name === a)?.symptom_icon || ''
        const bIcon = symptomRows.find(s => s.symptom_name === b)?.symptom_icon || ''
        patterns.push({
          id: randomUUID(),
          type: 'symptom_cluster',
          title: `${a} & ${b} often occur together`,
          description: `You've logged both ${a.toLowerCase()} and ${b.toLowerCase()} together ${count} times (${Math.round(cooccurrenceRate * 100)}% co-occurrence rate).`,
          severity: 'info',
          icon: '🔗',
          confidence: Math.min(0.85, 0.3 + (count / totalLogs)),
          metric: { symptomA: a, symptomB: b, cooccurrences: count, rate: Math.round(cooccurrenceRate * 100) },
        })
      }
    }

    // ============================================================
    // ANALYSIS 3: Trend Detection
    // ============================================================
    if (logRows.length >= 10) {
      const mid = Math.floor(logRows.length / 2)
      const firstHalf = logRows.slice(0, mid)
      const secondHalf = logRows.slice(mid)
      
      const firstAvg = firstHalf.reduce((s, r) => s + r.pain_level, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((s, r) => s + r.pain_level, 0) / secondHalf.length
      const change = ((secondAvg - firstAvg) / firstAvg * 100).toFixed(0)
      
      if (Math.abs(parseFloat(change)) >= 15 && patterns.length < 10) {
        const isImproving = parseFloat(change) < 0
        patterns.push({
          id: randomUUID(),
          type: 'trend_detection',
          title: isImproving ? 'Pain levels trending downward 📉' : 'Pain levels trending upward 📈',
          description: isImproving
            ? `Your average pain has decreased by ${Math.abs(parseFloat(change))}% from ${firstAvg.toFixed(1)}/10 to ${secondAvg.toFixed(1)}/10 across your tracked periods.`
            : `Your average pain has increased by ${Math.abs(parseFloat(change))}% from ${firstAvg.toFixed(1)}/10 to ${secondAvg.toFixed(1)}/10. Consider discussing with your care team.`,
          severity: isImproving ? 'positive' : 'warning',
          icon: isImproving ? '📉' : '📈',
          confidence: Math.min(0.8, 0.3 + (logRows.length / 60)),
          metric: { change: parseFloat(change), firstAvg: firstAvg.toFixed(1), secondAvg: secondAvg.toFixed(1) },
        })
      }
    }

    // ============================================================
    // ANALYSIS 4: Flare-up Pattern Detection
    // ============================================================
    let consecutiveSevere = 0
    const severeClusters = []
    for (const row of logRows) {
      if (row.pain_level >= 7) {
        consecutiveSevere++
      } else if (consecutiveSevere >= 2) {
        severeClusters.push(consecutiveSevere)
        consecutiveSevere = 0
      } else {
        consecutiveSevere = 0
      }
    }
    if (consecutiveSevere >= 2) severeClusters.push(consecutiveSevere)

    if (severeClusters.length >= 2 && patterns.length < 10) {
      const avgClusterLen = (severeClusters.reduce((a, b) => a + b, 0) / severeClusters.length).toFixed(1)
      patterns.push({
        id: randomUUID(),
        type: 'flare_pattern',
        title: `Flare-ups last ${avgClusterLen} days on average`,
        description: `You've had ${severeClusters.length} flare-up episodes (consecutive days with pain 7+). They average ${avgClusterLen} days each. Tracking what precedes them may reveal triggers.`,
        severity: 'warning',
        icon: '🔥',
        confidence: Math.min(0.85, 0.4 + (severeClusters.length / 10)),
        metric: { episodes: severeClusters.length, avgDuration: parseFloat(avgClusterLen) },
      })
    }

    // ============================================================
    // ANALYSIS 5: Weekly Pattern
    // ============================================================
    const dayOfWeekPain = Array(7).fill(0).map(() => [])
    for (const row of logRows) {
      const d = new Date(row.log_date + 'T00:00:00')
      const dow = d.getDay()
      dayOfWeekPain[dow].push(row.pain_level)
    }
    
    const dowLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dowAvgs = dayOfWeekPain.map((levels, i) => ({
      day: dowLabels[i],
      avg: levels.length > 0 ? (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1) : null,
      count: levels.length,
    }))
    
    const validDow = dowAvgs.filter(d => d.count >= 2)
    if (validDow.length >= 4 && patterns.length < 10) {
      validDow.sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg))
      const worstDay = validDow[0]
      const bestDay = validDow[validDow.length - 1]
      const diff = parseFloat(worstDay.avg) - parseFloat(bestDay.avg)
      
      if (diff >= 2) {
        patterns.push({
          id: randomUUID(),
          type: 'weekly_pattern',
          title: `${worstDay.day}s are your toughest days`,
          description: `Your pain averages ${worstDay.avg}/10 on ${worstDay.day}s — ${diff.toFixed(1)} points higher than ${bestDay.day}s (${bestDay.avg}/10). This could help with weekly planning.`,
          severity: 'info',
          icon: '📅',
          confidence: Math.min(0.75, 0.3 + (diff / 10)),
          metric: { worstDay: worstDay.day, worstAvg: worstDay.avg, bestDay: bestDay.day, bestAvg: bestDay.avg },
        })
      }
    }

    patterns.sort((a, b) => b.confidence - a.confidence)
    json(res, { patterns })
  },

  // ===== FEEDBACK =====
  'POST /api/feedback': async (req, res) => {
    const body = await parseBody(req)
    
    // Input validation
    if (!body.feedbackType) return json(res, { error: 'Missing feedbackType' }, 400)
    if (!isValidNumber(body.rating) || body.rating < 1 || body.rating > 5) {
      return json(res, { error: 'Rating must be an integer between 1 and 5' }, 400)
    }
    
    const id = randomUUID()
    const now = new Date().toISOString()
    const safeUserId = escapeStr(body.userId || 'anonymous')
    const safeType = escapeStr(body.feedbackType)
    const safeTargetId = escapeStr(body.targetId || '')
    const safeTargetLabel = escapeStr(body.targetLabel || '')
    const safeRating = Number(body.rating)
    const safeComment = body.comment ? escapeStr(String(body.comment)) : 'NULL'
    
    teamDb(`INSERT INTO clinical_feedback (id, user_id, feedback_type, target_id, target_label, rating, comment, created_at) VALUES (${escapeStr(id)}, ${safeUserId}, ${safeType}, ${safeTargetId}, ${safeTargetLabel}, ${safeRating}, ${safeComment}, ${escapeStr(now)})`)
    json(res, { id, submitted: true }, 201)
  },

  'GET /api/feedback/stats': (req, res) => {
    const rows = teamDb(`SELECT feedback_type, AVG(rating) as avg_rating, COUNT(*) as count FROM clinical_feedback GROUP BY feedback_type ORDER BY count DESC`)
    json(res, rows)
  },

  // ===== FEEDBACK LOGS (Report Utility) =====
  'POST /api/feedback-logs': async (req, res) => {
    const body = await parseBody(req)
    
    // Input validation
    if (!isValidNumber(body.rating) || body.rating < 1 || body.rating > 5) {
      return json(res, { error: 'Rating must be an integer between 1 and 5' }, 400)
    }
    
    const id = randomUUID()
    const now = new Date().toISOString()
    const safeReportId = escapeStr(body.reportId || '')
    const safeRole = escapeStr(body.userRole || 'patient')
    const safeRating = Number(body.rating)
    const safeComments = body.comments ? escapeStr(String(body.comments)) : 'NULL'
    const safeLesionMappings = body.lesionMappings ? escapeStr(String(body.lesionMappings)) : 'NULL'
    
    teamDb(`INSERT INTO feedback_logs (id, report_id, user_role, rating, comments, lesion_mappings, created_at) VALUES (${escapeStr(id)}, ${safeReportId}, ${safeRole}, ${safeRating}, ${safeComments}, ${safeLesionMappings}, ${escapeStr(now)})`)
    json(res, { id, submitted: true }, 201)
  },

  // ===== AUTHENTICATION =====
  'POST /api/register': async (req, res) => {
    const body = await parseBody(req)
    const { email, password, displayName, role, clinicName, specialty } = body
    
    if (!email || !password) {
      return json(res, { error: 'Email and password are required' }, 400)
    }
    if (password.length < 6) {
      return json(res, { error: 'Password must be at least 6 characters' }, 400)
    }
    
    const safeEmail = email.toLowerCase()
    const existing = teamDb(`SELECT id FROM users WHERE email = ${escapeStr(safeEmail)}`)
    if (existing.length > 0) {
      return json(res, { error: 'Email already registered' }, 409)
    }
    
    const id = randomUUID()
    const now = new Date().toISOString()
    const passwordHash = hashPassword(password)
    const userRole = 'patient' // All self-registrations default to patient; admins create clinician accounts manually
    
    const safeName = escapeStr(displayName || '')
    const safeClinic = clinicName ? escapeStr(clinicName) : 'NULL'
    const safeSpecialty = specialty ? escapeStr(specialty) : 'NULL'
    
    // Insert new user
    teamDb(`INSERT INTO users (id, display_name, email, password_hash, role, clinic_name, specialty, onboarding_complete, created_at, updated_at) VALUES (${escapeStr(id)}, ${safeName}, ${escapeStr(safeEmail)}, ${escapeStr(passwordHash)}, ${escapeStr(userRole)}, ${safeClinic}, ${safeSpecialty}, 0, ${escapeStr(now)}, ${escapeStr(now)})`)
    
    // Create and save session token
    const token = generateToken()
    teamDb(`INSERT INTO sessions (token, user_id, created_at) VALUES (${escapeStr(token)}, ${escapeStr(id)}, ${escapeStr(now)})`)
    
    json(res, { id, email: safeEmail, displayName: displayName || '', role: userRole, token }, 201)
  },

  'POST /api/login': async (req, res) => {
    const body = await parseBody(req)
    const { email, password } = body
    
    if (!email || !password) {
      return json(res, { error: 'Email and password are required' }, 400)
    }
    
    const safeEmail = email.toLowerCase()
    const rows = teamDb(`SELECT id, display_name, email, password_hash, role, clinic_name, specialty, onboarding_complete FROM users WHERE email = ${escapeStr(safeEmail)}`)
    if (rows.length === 0) {
      return json(res, { error: 'Invalid email or password' }, 401)
    }
    
    const user = rows[0]
    if (!verifyPassword(password, user.password_hash)) {
      return json(res, { error: 'Invalid email or password' }, 401)
    }
    
    // Create and save session token
    const token = generateToken()
    const now = new Date().toISOString()
    teamDb(`INSERT INTO sessions (token, user_id, created_at) VALUES (${escapeStr(token)}, ${escapeStr(user.id)}, ${escapeStr(now)})`)
    
    json(res, {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      clinicName: user.clinic_name,
      specialty: user.specialty,
      onboardingComplete: user.onboarding_complete === 1,
      token,
    })
  },

  'GET /api/me/:userId': (req, res, params) => {
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!verifyUserAuth(req, res, params.userId)) return
    
    const rows = teamDb(`SELECT id, display_name, email, role, clinic_name, specialty, onboarding_complete, cycle_length_avg, last_period_start, created_at FROM users WHERE id = ${escapeStr(params.userId)}`)
    if (rows.length === 0) return json(res, { error: 'User not found' }, 404)
    const u = rows[0]
    json(res, {
      id: u.id,
      displayName: u.display_name,
      email: u.email,
      role: u.role,
      clinicName: u.clinic_name,
      specialty: u.specialty,
      onboardingComplete: u.onboarding_complete === 1,
      cycleLength: u.cycle_length_avg,
      lastPeriodStart: u.last_period_start,
    })
  },

  // ===== SEED TESTING ACCOUNTS =====
  'POST /api/seed/auth': (req, res) => {
    if (process.env.NODE_ENV === 'production') return json(res, { error: 'Seed endpoints are disabled in production' }, 403)
      return json(res, { error: 'Forbidden: Seeding is disabled in production' }, 403)
    }
    const now = new Date().toISOString()
    const results = []
    
    // Seed patient account
    const patientId = randomUUID()
    const patientHash = hashPassword('test123')
    teamDb(`INSERT OR IGNORE INTO users (id, display_name, email, password_hash, role, onboarding_complete, created_at, updated_at) VALUES ('${patientId}', 'Test Patient', 'patient@endobuddy.test', '${patientHash}', 'patient', 1, '${now}', '${now}')`)
    teamDb(`INSERT OR IGNORE INTO sessions (token, user_id, created_at) VALUES ('testpatienttoken', '${patientId}', '${now}')`)
    results.push({ email: 'patient@endobuddy.test', password: 'test123', role: 'patient', id: patientId, token: 'testpatienttoken' })
    
    // Seed clinician account
    const clinicianId = randomUUID()
    const clinicianHash = hashPassword('test123')
    teamDb(`INSERT OR IGNORE INTO users (id, display_name, email, password_hash, role, clinic_name, specialty, onboarding_complete, created_at, updated_at) VALUES ('${clinicianId}', 'Dr. Smith', 'clinician@endobuddy.test', '${clinicianHash}', 'clinician', 'Endo Care Center', 'Minimally Invasive Gynecology', 1, '${now}', '${now}')`)
    teamDb(`INSERT OR IGNORE INTO sessions (token, user_id, created_at) VALUES ('testcliniciantoken', '${clinicianId}', '${now}')`)
    results.push({ email: 'clinician@endobuddy.test', password: 'test123', role: 'clinician', id: clinicianId, token: 'testcliniciantoken' })
    
    // Seed admin account
    const adminId = randomUUID()
    const adminHash = hashPassword('admin123')
    teamDb(`INSERT OR IGNORE INTO users (id, display_name, email, password_hash, role, onboarding_complete, created_at, updated_at) VALUES ('${adminId}', 'Admin', 'admin@endobuddy.test', '${adminHash}', 'admin', 1, '${now}', '${now}')`)
    teamDb(`INSERT OR IGNORE INTO sessions (token, user_id, created_at) VALUES ('testadmintoken', '${adminId}', '${now}')`)
    results.push({ email: 'admin@endobuddy.test', password: 'admin123', role: 'admin', id: adminId, token: 'testadmintoken' })
    
    json(res, { seeded: true, accounts: results })
  },

  'POST /api/seed/:userId': (req, res, params) => {
    if (process.env.NODE_ENV === 'production') return json(res, { error: 'Seed endpoints are disabled in production' }, 403)
      return json(res, { error: 'Forbidden: Seeding is disabled in production' }, 403)
    }
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    const userId = params.userId
    
    // Only allow seeding for new users (onboarding_complete = 0 and no existing logs)
    const userRows = teamDb(`SELECT onboarding_complete, email FROM users WHERE id = ${escapeStr(userId)}`)
    if (userRows.length === 0) return json(res, { error: 'User not found' }, 404)
    
    // Authentication check for non-anonymous accounts
    if (userRows[0].email && !verifyUserAuth(req, res, userId)) return
    
    if (userRows[0].onboarding_complete !== 0) {
      return json(res, { error: 'Seed data can only be generated for new users (before onboarding is complete)' }, 403)
    }
    const logCount = teamDb(`SELECT COUNT(*) as cnt FROM daily_logs WHERE user_id = ${escapeStr(userId)}`)
    if (logCount[0].cnt > 0) {
      return json(res, { error: 'Seed data can only be generated for users with no existing logs' }, 403)
    }
    
    const now = new Date()
    
    // Generate 30 days of realistic sample data
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000)
      const dateStr = date.toISOString().split('T')[0]
      const dayNum = (30 - i) + 1
      
      let phase, painLevel, flowLevel
      if (dayNum <= 5) { phase = 'menstrual'; painLevel = Math.floor(Math.random() * 3) + 6; flowLevel = ['heavy','medium','light','spotting',null][dayNum - 1] }
      else if (dayNum <= 14) { phase = 'follicular'; painLevel = Math.max(0, Math.floor(Math.random() * 3)) }
      else if (dayNum === 15) { phase = 'ovulatory'; painLevel = Math.floor(Math.random() * 3) + 3 }
      else { phase = 'luteal'; painLevel = Math.floor(Math.random() * 4) + 3 }
      
      try {
        const logId = randomUUID()
        teamDb(`INSERT OR IGNORE INTO daily_logs (id, user_id, log_date, cycle_day, cycle_phase, pain_level, flow_level, created_at, updated_at) VALUES (${escapeStr(logId)}, ${escapeStr(userId)}, ${escapeStr(dateStr)}, ${dayNum}, ${escapeStr(phase)}, ${painLevel}, ${flowLevel ? escapeStr(flowLevel) : 'NULL'}, ${escapeStr(now.toISOString())}, ${escapeStr(now.toISOString())})`)
        
        // Add symptoms for higher pain days
        if (painLevel >= 3) {
          const symptoms = [
            { name: 'Cramping', icon: '⚡' },
            { name: 'Bloating', icon: '🫃' },
            { name: 'Fatigue', icon: '😴' },
          ]
          for (const s of symptoms.slice(0, Math.floor(Math.random() * 3) + 1)) {
            const sid = randomUUID()
            teamDb(`INSERT INTO symptom_entries (id, daily_log_id, symptom_name, symptom_icon, severity, created_at) VALUES (${escapeStr(sid)}, ${escapeStr(logId)}, ${escapeStr(s.name)}, ${escapeStr(s.icon)}, ${painLevel}, ${escapeStr(now.toISOString())})`)
          }
        }
      } catch (e) {
        // Skip duplicates
      }
    }
    json(res, { seeded: true, userId })
  },
}

// Create server
const server = createServer((req, res) => {
  // CORS origin check and headers
  setCorsHeaders(req, res)
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  // Route matching
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname
  const key = `${req.method} ${path}`
  
  // Check rate limiting on all requests
  const isStrict = ['/api/register', '/api/login', '/api/seed'].some(route => path.startsWith(route))
  if (!checkRateLimit(req, res, isStrict)) return

  // Try exact match first
  if (router[key]) {
    return router[key](req, res, {})
  }

  // Try parameterized routes
  for (const [routeKey, handler] of Object.entries(router)) {
    const [method, routePath] = routeKey.split(' ')
    if (method !== req.method) continue
    
    const routeParts = routePath.split('/')
    const pathParts = path.split('/')
    
    if (routeParts.length !== pathParts.length) continue
    
    const params = {}
    let match = true
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = pathParts[i]
      } else if (routeParts[i] !== pathParts[i]) {
        match = false
        break
      }
    }
    
    if (match) {
      return handler(req, res, params)
    }
  }

  json(res, { error: 'Not found' }, 404)
})

server.listen(PORT, () => {
  console.log(`EndoBuddy API server running on http://localhost:${PORT}`)
})
