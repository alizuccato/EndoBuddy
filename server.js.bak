/**
 * EndoBuddy API Server
 * 
 * Lightweight HTTP server bridging the React frontend to the Turso database.
 * Uses `team-db` CLI for all database operations.
 * Runs on port 3001, proxied by Vite on port 5173.
 */

import { createServer } from 'http'
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'

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

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data))
}

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
    teamDb(`INSERT INTO users (id, display_name, date_of_birth, timezone, cycle_length_avg, last_period_start, onboarding_complete, created_at, updated_at) VALUES ('${id}', '${body.displayName || ''}', ${body.dateOfBirth ? `'${body.dateOfBirth}'` : 'NULL'}, '${body.timezone || 'UTC'}', ${body.cycleLength || 28}, ${body.lastPeriodStart ? `'${body.lastPeriodStart}'` : 'NULL'}, 1, '${now}', '${now}')`)
    json(res, { id, ...body }, 201)
  },

  'GET /api/users/:id': (req, res, params) => {
    const rows = teamDb(`SELECT * FROM users WHERE id = '${params.id}'`)
    if (rows.length === 0) return json(res, { error: 'User not found' }, 404)
    json(res, rows[0])
  },

  'PUT /api/users/:id': async (req, res, params) => {
    const body = await parseBody(req)
    const now = new Date().toISOString()
    const updates = Object.entries(body)
      .filter(([k]) => k !== 'id')
      .map(([k, v]) => `${k} = ${v === null || v === undefined ? 'NULL' : `'${v}'`}`)
      .join(', ')
    teamDb(`UPDATE users SET ${updates}, updated_at = '${now}' WHERE id = '${params.id}'`)
    json(res, { id: params.id, ...body })
  },

  // ===== DAILY LOGS =====
  'POST /api/logs': async (req, res) => {
    const body = await parseBody(req)
    const id = randomUUID()
    const now = new Date().toISOString()
    teamDb(`INSERT INTO daily_logs (id, user_id, log_date, cycle_day, cycle_phase, is_period_day, flow_level, pain_level, overall_wellness, notes, created_at, updated_at) VALUES ('${id}', '${body.userId}', '${body.logDate}', ${body.cycleDay || 'NULL'}, ${body.cyclePhase ? `'${body.cyclePhase}'` : 'NULL'}, ${body.isPeriodDay ? 1 : 0}, ${body.flowLevel ? `'${body.flowLevel}'` : 'NULL'}, ${body.painLevel || 'NULL'}, ${body.overallWellness || 'NULL'}, ${body.notes ? `'${body.notes.replace(/'/g, "''")}'` : 'NULL'}, '${now}', '${now}')`)
    
    // Save symptoms
    if (body.symptoms && body.symptoms.length > 0) {
      for (const symptom of body.symptoms) {
        const sid = randomUUID()
        teamDb(`INSERT INTO symptom_entries (id, daily_log_id, symptom_name, symptom_icon, severity, created_at) VALUES ('${sid}', '${id}', '${symptom.name.replace(/'/g, "''")}', '${symptom.icon || ''}', ${symptom.severity || 5}, '${now}')`)
      }
    }
    
    json(res, { id, ...body }, 201)
  },

  'GET /api/logs/:userId': (req, res, params) => {
    const rows = teamDb(`SELECT * FROM daily_logs WHERE user_id = '${params.userId}' ORDER BY log_date DESC LIMIT 90`)
    json(res, rows)
  },

  'GET /api/logs/:userId/:date': (req, res, params) => {
    const rows = teamDb(`SELECT * FROM daily_logs WHERE user_id = '${params.userId}' AND log_date = '${params.date}'`)
    if (rows.length === 0) return json(res, null)
    const log = rows[0]
    const symptoms = teamDb(`SELECT * FROM symptom_entries WHERE daily_log_id = '${log.id}'`)
    json(res, { ...log, symptoms })
  },

  // ===== SYMPTOMS FOR A LOG =====
  'GET /api/symptoms/:logId': (req, res, params) => {
    const rows = teamDb(`SELECT * FROM symptom_entries WHERE daily_log_id = '${params.logId}' ORDER BY severity DESC`)
    json(res, rows)
  },

  // ===== CYCLES =====
  'POST /api/cycles': async (req, res) => {
    const body = await parseBody(req)
    const id = randomUUID()
    const now = new Date().toISOString()
    teamDb(`INSERT INTO cycles (id, user_id, period_start, period_end, notes, created_at) VALUES ('${id}', '${body.userId}', '${body.periodStart}', ${body.periodEnd ? `'${body.periodEnd}'` : 'NULL'}, ${body.notes ? `'${body.notes.replace(/'/g, "''")}'` : 'NULL'}, '${now}')`)
    json(res, { id, ...body }, 201)
  },

  'GET /api/cycles/:userId': (req, res, params) => {
    const rows = teamDb(`SELECT * FROM cycles WHERE user_id = '${params.userId}' ORDER BY period_start DESC`)
    json(res, rows)
  },

  // ===== INSIGHTS =====
  'GET /api/insights/:userId': (req, res, params) => {
    // Calculate pain-by-phase from logged data
    const logRows = teamDb(`SELECT dl.cycle_phase, dl.pain_level, dl.log_date FROM daily_logs dl WHERE dl.user_id = '${params.userId}' AND dl.pain_level IS NOT NULL ORDER BY dl.log_date`)
    
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
    const userId = params.userId
    const patterns = []

    // 1. Fetch all logs with symptoms
    const logRows = teamDb(`SELECT dl.id, dl.log_date, dl.cycle_phase, dl.pain_level, dl.cycle_day 
      FROM daily_logs dl WHERE dl.user_id = '${userId}' AND dl.pain_level IS NOT NULL 
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
    const phasePain = { menstrual: [], follicular: [], ovulation: [], luteal: [] }
    const phaseSymptoms = { menstrual: {}, follicular: {}, ovulation: {}, luteal: {} }
    
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
    // Find pairs of symptoms that frequently occur together
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
    // Split logs into first half and second half to compare trends
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
    // Detect if severe pain (7+) days tend to cluster
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
    // ANALYSIS 5: Weekly Pattern (day-of-week patterns)
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

    // Sort by confidence descending
    patterns.sort((a, b) => b.confidence - a.confidence)

    json(res, { patterns })
  },

  // ===== FEEDBACK =====
  'POST /api/feedback': async (req, res) => {
    const body = await parseBody(req)
    const id = randomUUID()
    const now = new Date().toISOString()
    teamDb(`INSERT INTO clinical_feedback (id, user_id, feedback_type, target_id, target_label, rating, comment, created_at) VALUES ('${id}', '${body.userId || 'anonymous'}', '${body.feedbackType}', '${body.targetId || ''}', '${(body.targetLabel || '').replace(/'/g, "''")}', ${body.rating}, ${body.comment ? `'${body.comment.replace(/'/g, "''")}'` : 'NULL'}, '${now}')`)
    json(res, { id, submitted: true }, 201)
  },

  'GET /api/feedback/stats': (req, res) => {
    const rows = teamDb(`SELECT feedback_type, AVG(rating) as avg_rating, COUNT(*) as count FROM clinical_feedback GROUP BY feedback_type ORDER BY count DESC`)
    json(res, rows)
  },

  // ===== FEEDBACK LOGS (Report Utility) =====
  'POST /api/feedback-logs': async (req, res) => {
    const body = await parseBody(req)
    const id = randomUUID()
    const now = new Date().toISOString()
    teamDb(`INSERT INTO feedback_logs (id, report_id, user_role, rating, comments, lesion_mappings, created_at) VALUES ('${id}', '${body.reportId || ''}', '${body.userRole || 'patient'}', ${body.rating}, ${body.comments ? `'${body.comments.replace(/'/g, "''")}'` : 'NULL'}, ${body.lesionMappings ? `'${body.lesionMappings.replace(/'/g, "''")}'` : 'NULL'}, '${now}')`)
    json(res, { id, submitted: true }, 201)
  },

  'POST /api/seed/:userId': (req, res, params) => {
    const userId = params.userId
    const now = new Date()
    
    // Generate 30 days of realistic sample data
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000)
      const dateStr = date.toISOString().split('T')[0]
      const dayNum = (30 - i) + 1
      
      let phase, painLevel, flowLevel
      if (dayNum <= 5) { phase = 'menstrual'; painLevel = Math.floor(Math.random() * 3) + 6; flowLevel = ['heavy','medium','light','spotting',null][dayNum - 1] }
      else if (dayNum <= 14) { phase = 'follicular'; painLevel = Math.max(0, Math.floor(Math.random() * 3)) }
      else if (dayNum === 15) { phase = 'ovulation'; painLevel = Math.floor(Math.random() * 3) + 3 }
      else { phase = 'luteal'; painLevel = Math.floor(Math.random() * 4) + 3 }
      
      try {
        const logId = randomUUID()
        teamDb(`INSERT OR IGNORE INTO daily_logs (id, user_id, log_date, cycle_day, cycle_phase, pain_level, flow_level, created_at, updated_at) VALUES ('${logId}', '${userId}', '${dateStr}', ${dayNum}, '${phase}', ${painLevel}, ${flowLevel ? `'${flowLevel}'` : 'NULL'}, '${now.toISOString()}', '${now.toISOString()}')`)
        
        // Add symptoms for higher pain days
        if (painLevel >= 3) {
          const symptoms = [
            { name: 'Cramping', icon: '⚡' },
            { name: 'Bloating', icon: '🫃' },
            { name: 'Fatigue', icon: '😴' },
          ]
          for (const s of symptoms.slice(0, Math.floor(Math.random() * 3) + 1)) {
            const sid = randomUUID()
            teamDb(`INSERT INTO symptom_entries (id, daily_log_id, symptom_name, symptom_icon, severity, created_at) VALUES ('${sid}', '${logId}', '${s.name}', '${s.icon}', ${painLevel}, '${now.toISOString()}')`)
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
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return res.end()
  }

  // Route matching
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname
  const key = `${req.method} ${path}`
  
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