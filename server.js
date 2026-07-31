/**
 * EndoBuddy API Server
 * 
 * Lightweight HTTP server bridging the React frontend to the Turso database.
 * Uses @libsql/client to talk to Turso directly (no external CLI dependency).
 * Runs on port 3001, proxied by Vite on port 5173.
 */

import { createServer } from 'http'
import { createClient } from '@libsql/client'
import { randomUUID, scryptSync, timingSafeEqual, createHmac } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const PORT = process.env.PORT || 3001

// ===== DATABASE CLIENT =====
// Requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to be set as environment
// variables (e.g. in Render's Environment tab, or a local .env for dev).
if (!process.env.TURSO_DATABASE_URL) {
  console.error('FATAL: TURSO_DATABASE_URL environment variable is not set.')
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('WARNING: STRIPE_WEBHOOK_SECRET is not set. /api/webhooks/stripe will reject all events until it is configured in Render\'s Environment tab.')
}
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('WARNING: STRIPE_SECRET_KEY is not set. The "Manage subscription" billing portal link will not work until it is configured in Render\'s Environment tab.')
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function teamDb(sql) {
  try {
    const result = await db.execute(sql)
    return result.rows
  } catch (err) {
    console.error('DB Error:', err.message)
    throw new Error(err.message)
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
  await teamDb("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT)")
} catch (e) {
  console.error("Failed to create sessions table:", e.message)
}

// Premium status columns, set by the Stripe webhook below. SQLite/Turso
// doesn't support "ADD COLUMN IF NOT EXISTS", so these are wrapped in
// try/catch and will just no-op with an error once the column already
// exists on subsequent deploys.
try { await teamDb("ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 0") } catch (e) {}
try { await teamDb("ALTER TABLE users ADD COLUMN stripe_customer_id TEXT") } catch (e) {}

// period_length_avg has been in 001_initial_schema.sql since the very first
// commit, but that migration file is never actually run against the live
// Turso database (runMigrations() in src/db/migrate.js is defined but never
// called anywhere in this server). The production `users` table was created
// before this column existed, so it's missing in prod even though it's in
// the schema file. Add it the same defensive way as the two columns above.
try { await teamDb("ALTER TABLE users ADD COLUMN period_length_avg INTEGER") } catch (e) {}

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
  'https://myendobuddy.com',
  'https://www.myendobuddy.com',
  'https://endobuddy.ctonew.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001'
]
function setCorsHeaders(req, res) {
  const origin = req.headers.origin
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://myendobuddy.com'
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
async function getAuthenticatedUserId(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]
  if (!token || token.length < 10) return null
  
  try {
    const rows = await teamDb(`SELECT user_id, created_at FROM sessions WHERE token = ${escapeStr(token)}`)
    if (rows.length === 0) return null
    const session = rows[0]
    if (session.created_at) {
      const createdAt = new Date(session.created_at)
      const expiry = 24 * 60 * 60 * 1000 // 24-hour TTL expiry
      if (Date.now() - createdAt.getTime() > expiry) {
        try {
          await teamDb(`DELETE FROM sessions WHERE token = ${escapeStr(token)}`)
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

async function verifyUserAuth(req, res, targetUserId) {
  try {
    const userRows = await teamDb(`SELECT password_hash FROM users WHERE id = ${escapeStr(targetUserId)}`)
    if (userRows.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'User not found' }))
      return false
    }
    
    const user = userRows[0]
    
    // Only accounts with an actual password can ever obtain a session
    // token (via /login or /register, both of which require one). Gating
    // this on email presence alone — rather than password_hash — used to
    // lock people out permanently: an account could pick up an email
    // (e.g. via the optional onboarding field, or editing it in Profile)
    // without ever getting a password or a token, making it impossible to
    // pass this check from that point on.
    if (user.password_hash) {
      const authUserId = await getAuthenticatedUserId(req)
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

// ===== STATIC FRONTEND SERVING =====
// Serves the built React app (output of `vite build`) so that visiting the
// site in a browser returns the actual app instead of a JSON 404. Any path
// that isn't a real file in dist/ falls back to index.html so client-side
// routing (React Router, etc.) still works on refresh/deep links.
const DIST_DIR = join(process.cwd(), 'dist')
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function serveStatic(req, res, pathname) {
  // Prevent path traversal outside of dist/
  const safePath = join(DIST_DIR, pathname).startsWith(DIST_DIR)
    ? join(DIST_DIR, pathname)
    : DIST_DIR

  let filePath = pathname === '/' ? join(DIST_DIR, 'index.html') : safePath
  if (!existsSync(filePath) || !filePath.startsWith(DIST_DIR)) {
    filePath = join(DIST_DIR, 'index.html') // SPA fallback for client-side routes
  }

  if (!existsSync(filePath)) {
    return json(res, { error: 'Frontend build not found. Did the build step run (npm run build)?' }, 500)
  }

  const ext = extname(filePath)
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
  res.end(readFileSync(filePath))
}

// ===== STRIPE WEBHOOK =====
// Reads the exact raw request bytes (not JSON-parsed) because Stripe's
// signature is computed over the raw payload — re-serializing a parsed
// JSON object would not reliably reproduce the same bytes and would break
// verification.
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

// Verifies a Stripe webhook signature per Stripe's documented scheme:
// https://docs.stripe.com/webhooks#verify-manually
// Header looks like: "t=1614556800,v1=5257a869e7ecebeda32affa62cdca3fa..."
function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret) return false
  const parts = Object.fromEntries(
    sigHeader.split(',').map(kv => kv.split('=')).filter(kv => kv.length === 2)
  )
  const timestamp = parts.t
  const signatures = sigHeader.split(',').filter(kv => kv.startsWith('v1=')).map(kv => kv.slice(3))
  if (!timestamp || signatures.length === 0) return false

  // Reject events older than 5 minutes to guard against replay attacks
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!isFinite(age) || age > 300) return false

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex')

  return signatures.some(sig => {
    try {
      return sig.length === expected.length &&
        timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'))
    } catch {
      return false
    }
  })
}

async function handleStripeWebhook(req, res) {
  const rawBody = await readRawBody(req)
  const signature = req.headers['stripe-signature']
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!verifyStripeSignature(rawBody, signature, secret)) {
    console.warn('Stripe webhook: signature verification failed')
    return json(res, { error: 'Invalid signature' }, 400)
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return json(res, { error: 'Invalid payload' }, 400)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.client_reference_id
        const customerId = session.customer
        if (userId && isValidUUID(userId)) {
          await teamDb(`UPDATE users SET is_premium = 1, stripe_customer_id = ${escapeStr(customerId)} WHERE id = ${escapeStr(userId)}`)
          console.log(`Stripe webhook: marked user ${userId} as premium`)
        } else {
          console.warn('Stripe webhook: checkout.session.completed missing a valid client_reference_id; could not mark a user premium')
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await teamDb(`UPDATE users SET is_premium = 0 WHERE stripe_customer_id = ${escapeStr(subscription.customer)}`)
        console.log(`Stripe webhook: revoked premium for customer ${subscription.customer} (subscription canceled)`)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const active = ['active', 'trialing'].includes(subscription.status)
        await teamDb(`UPDATE users SET is_premium = ${active ? 1 : 0} WHERE stripe_customer_id = ${escapeStr(subscription.customer)}`)
        break
      }
      default:
        // Other event types are ignored on purpose
        break
    }
    json(res, { received: true })
  } catch (err) {
    console.error('Stripe webhook handling error:', err.message)
    json(res, { error: 'Webhook handler error' }, 500)
  }
}

// Wraps a route handler so a thrown/rejected error inside it results in a
// 500 response to that one request, instead of an unhandled promise
// rejection that can crash the entire Node process (taking down every
// other in-flight and future request too).
function safeHandle(handler) {
  return (req, res, params) => {
    Promise.resolve()
      .then(() => handler(req, res, params))
      .catch((err) => {
        console.error('Unhandled route error:', err.message)
        if (!res.headersSent) {
          try {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Internal server error' }))
          } catch (e) {
            // response already in a bad state; nothing more we can do
          }
        }
      })
  }
}

// Catch-all safety net: log and continue instead of letting the process die.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection (process kept alive):', err)
})
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (process kept alive):', err)
})

try { await teamDb(`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT)`) } catch (e) {}

const router = {
  // Health check
  'GET /api/health': (req, res) => {
    json(res, { status: 'ok', timestamp: new Date().toISOString() })
  },

  // Stripe calls this directly (not from the browser) when a checkout
  // completes or a subscription changes. Verified via signature, not auth
  // headers — see verifyStripeSignature above.
  'POST /api/webhooks/stripe': handleStripeWebhook,

  // Creates a Stripe-hosted Billing Portal session so a premium user can
  // view invoices, update their card, or cancel their subscription
  // themselves — without us building any of that UI. Calls Stripe's REST
  // API directly (no SDK) since the rest of this server already talks to
  // Stripe that way (see verifyStripeSignature above).
  'POST /api/users/:id/billing-portal': async (req, res, params) => {
    if (!isValidUUID(params.id)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!(await verifyUserAuth(req, res, params.id))) return

    if (!process.env.STRIPE_SECRET_KEY) {
      return json(res, { error: 'Billing management is not configured yet. Please contact support.' }, 503)
    }

    const rows = await teamDb(`SELECT stripe_customer_id FROM users WHERE id = ${escapeStr(params.id)}`)
    if (rows.length === 0) return json(res, { error: 'User not found' }, 404)
    const customerId = rows[0].stripe_customer_id
    if (!customerId) return json(res, { error: 'No active subscription found for this account' }, 400)

    const body = await parseBody(req)
    const returnUrl = typeof body.returnUrl === 'string' && body.returnUrl.startsWith('https://')
      ? body.returnUrl
      : 'https://myendobuddy.com/'

    try {
      const stripeRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ customer: customerId, return_url: returnUrl }),
      })
      const data = await stripeRes.json()
      if (!stripeRes.ok) {
        console.error('Stripe billing portal error:', data.error?.message)
        return json(res, { error: 'Could not open billing portal. Please try again shortly.' }, 502)
      }
      json(res, { url: data.url })
    } catch (err) {
      console.error('Stripe billing portal request failed:', err.message)
      json(res, { error: 'Could not reach Stripe. Please try again shortly.' }, 502)
    }
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
    
    await teamDb(`INSERT INTO users (id, display_name, date_of_birth, timezone, cycle_length_avg, last_period_start, onboarding_complete, created_at, updated_at, role, clinic_name, specialty) VALUES (${escapeStr(id)}, ${safeName}, ${safeDob}, ${safeTz}, ${safeCycle}, ${safeLps}, 1, ${escapeStr(now)}, ${escapeStr(now)}, ${safeRole}, ${safeClinic}, ${safeSpecialty})`)
    json(res, { id, ...body }, 201)
  },

  'GET /api/users/:id': async (req, res, params) => {
    if (!isValidUUID(params.id)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!(await verifyUserAuth(req, res, params.id))) return
    
    const rows = await teamDb(`SELECT * FROM users WHERE id = ${escapeStr(params.id)}`)
    if (rows.length === 0) return json(res, { error: 'User not found' }, 404)
    // Never send the password hash itself to the client — expose only
    // whether one is set, so the UI can decide which password form to show.
    const { password_hash, ...safeUser } = rows[0]
    json(res, { ...safeUser, has_password: !!password_hash })
  },

  'PUT /api/users/:id': async (req, res, params) => {
    if (!isValidUUID(params.id)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!(await verifyUserAuth(req, res, params.id))) return
    
    const body = await parseBody(req)
    const now = new Date().toISOString()
    
    // Strict allowlist of updatable fields with DB column mapping
    const ALLOWED_FIELDS = {
      displayName: 'display_name',
      dateOfBirth: 'date_of_birth',
      timezone: 'timezone',
      cycleLength: 'cycle_length_avg',
      periodLength: 'period_length_avg',
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
        } else if (field === 'cycleLength' || field === 'periodLength' || field === 'onboardingComplete') {
          val = isValidNumber(val) ? Number(val) : 'NULL'
        } else {
          val = 'NULL'
        }
        updates.push(`${dbCol} = ${val}`)
      }
    }
    
    if (updates.length === 0) return json(res, { error: 'No valid fields to update' }, 400)
    await teamDb(`UPDATE users SET ${updates.join(', ')}, updated_at = ${escapeStr(now)} WHERE id = ${escapeStr(params.id)}`)
    json(res, { id: params.id, updated: true })
  },

  // Set or change a user's password from the Profile tab. If the account
  // doesn't have a password yet (a quick anonymous signup), currentPassword
  // isn't required — but an email must already be on file, since a
  // password only makes sense paired with a way to log back in with it.
  // If a password already exists, the current one must be verified first.
  'POST /api/users/:id/password': async (req, res, params) => {
    if (!isValidUUID(params.id)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!(await verifyUserAuth(req, res, params.id))) return

    const body = await parseBody(req)
    const { currentPassword, newPassword } = body
    if (!newPassword || newPassword.length < 6) {
      return json(res, { error: 'New password must be at least 6 characters' }, 400)
    }

    const rows = await teamDb(`SELECT email, password_hash FROM users WHERE id = ${escapeStr(params.id)}`)
    if (rows.length === 0) return json(res, { error: 'User not found' }, 404)
    const user = rows[0]

    if (user.password_hash) {
      if (!currentPassword || !verifyPassword(currentPassword, user.password_hash)) {
        return json(res, { error: 'Current password is incorrect' }, 401)
      }
    } else if (!user.email) {
      return json(res, { error: 'Add an email to your profile before setting a password' }, 400)
    }

    const now = new Date().toISOString()
    const newHash = hashPassword(newPassword)
    await teamDb(`UPDATE users SET password_hash = ${escapeStr(newHash)}, updated_at = ${escapeStr(now)} WHERE id = ${escapeStr(params.id)}`)

    // Setting a password now makes this account subject to the Bearer-token
    // check in verifyUserAuth, so hand back a session token immediately —
    // mirroring what /register and /login do — instead of leaving the
    // client to make a request it can no longer pass.
    const token = generateToken()
    await teamDb(`INSERT INTO sessions (token, user_id, created_at) VALUES (${escapeStr(token)}, ${escapeStr(params.id)}, ${escapeStr(now)})`)
    json(res, { success: true, token })
  },

  // Permanently deletes a user's account and all associated data. If the
  // account has a password set, it must be confirmed in the request body
  // as an extra safety check before anything is deleted.
  'DELETE /api/users/:id': async (req, res, params) => {
    if (!isValidUUID(params.id)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!(await verifyUserAuth(req, res, params.id))) return

    const rows = await teamDb(`SELECT password_hash FROM users WHERE id = ${escapeStr(params.id)}`)
    if (rows.length === 0) return json(res, { error: 'User not found' }, 404)
    const user = rows[0]

    if (user.password_hash) {
      const body = await parseBody(req)
      if (!body.password || !verifyPassword(body.password, user.password_hash)) {
        return json(res, { error: 'Password is incorrect' }, 401)
      }
    }

    const logRows = await teamDb(`SELECT id FROM daily_logs WHERE user_id = ${escapeStr(params.id)}`)
    const logIds = logRows.map(r => escapeStr(r.id))
    if (logIds.length > 0) {
      const inClause = `(${logIds.join(',')})`
      await teamDb(`DELETE FROM symptom_entries WHERE daily_log_id IN ${inClause}`)
      await teamDb(`DELETE FROM pain_entries WHERE daily_log_id IN ${inClause}`)
      await teamDb(`DELETE FROM food_entries WHERE daily_log_id IN ${inClause}`)
      await teamDb(`DELETE FROM stress_mood_entries WHERE daily_log_id IN ${inClause}`)
      await teamDb(`DELETE FROM medication_entries WHERE daily_log_id IN ${inClause}`)
    }
    await teamDb(`DELETE FROM daily_logs WHERE user_id = ${escapeStr(params.id)}`)
    await teamDb(`DELETE FROM cycles WHERE user_id = ${escapeStr(params.id)}`)
    await teamDb(`DELETE FROM pattern_insights WHERE user_id = ${escapeStr(params.id)}`)
    await teamDb(`DELETE FROM doctor_reports WHERE user_id = ${escapeStr(params.id)}`)
    await teamDb(`DELETE FROM sessions WHERE user_id = ${escapeStr(params.id)}`)
    await teamDb(`DELETE FROM users WHERE id = ${escapeStr(params.id)}`)

    json(res, { success: true, deleted: true })
  },

  // ===== DAILY LOGS =====
  'POST /api/logs': async (req, res) => {
    const body = await parseBody(req)
    if (!isValidUUID(body.userId)) return json(res, { error: 'Invalid or missing user ID' }, 400)
    if (!(await verifyUserAuth(req, res, body.userId))) return
    
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
    
    await teamDb(`INSERT INTO daily_logs (id, user_id, log_date, cycle_day, cycle_phase, is_period_day, flow_level, pain_level, overall_wellness, notes, created_at, updated_at) VALUES (${escapeStr(id)}, ${escapeStr(body.userId)}, ${escapeStr(body.logDate)}, ${cycleDay}, ${cyclePhase}, ${isPeriodDay}, ${flowLevel}, ${painLevel}, ${overallWellness}, ${notes}, ${escapeStr(now)}, ${escapeStr(now)})`)
    
    // Save symptoms
    if (body.symptoms && Array.isArray(body.symptoms) && body.symptoms.length > 0) {
      for (const symptom of body.symptoms) {
        if (!symptom.name) continue
        const sid = randomUUID()
        const safeSymName = escapeStr(symptom.name)
        const safeSymIcon = escapeStr(symptom.icon || '')
        const safeSeverity = (isValidNumber(symptom.severity) && symptom.severity >= 1 && symptom.severity <= 10) ? Number(symptom.severity) : 5
        
        await teamDb(`INSERT INTO symptom_entries (id, daily_log_id, symptom_name, symptom_icon, severity, created_at) VALUES (${escapeStr(sid)}, ${escapeStr(id)}, ${safeSymName}, ${safeSymIcon}, ${safeSeverity}, ${escapeStr(now)})`)
      }
    }
    
    json(res, { id, ...body }, 201)
  },

  'GET /api/logs/:userId': async (req, res, params) => {
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!(await verifyUserAuth(req, res, params.userId))) return
    
    const rows = await teamDb(`SELECT * FROM daily_logs WHERE user_id = ${escapeStr(params.userId)} ORDER BY log_date DESC LIMIT 90`)
    json(res, rows)
  },

  'GET /api/logs/:userId/:date': async (req, res, params) => {
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!(await verifyUserAuth(req, res, params.userId))) return
    if (!isValidDate(params.date)) return json(res, { error: 'Invalid date format (must be YYYY-MM-DD)' }, 400)
    
    const rows = await teamDb(`SELECT * FROM daily_logs WHERE user_id = ${escapeStr(params.userId)} AND log_date = ${escapeStr(params.date)}`)
    if (rows.length === 0) return json(res, null)
    const log = rows[0]
    const symptoms = await teamDb(`SELECT * FROM symptom_entries WHERE daily_log_id = ${escapeStr(log.id)}`)
    json(res, { ...log, symptoms })
  },

  // ===== SYMPTOMS FOR A LOG =====
  'GET /api/symptoms/:logId': async (req, res, params) => {
    if (!isValidUUID(params.logId)) return json(res, { error: 'Invalid log ID format' }, 400)
    
    // Resolve log first to check authorization
    const logRows = await teamDb(`SELECT user_id FROM daily_logs WHERE id = ${escapeStr(params.logId)}`)
    if (logRows.length === 0) return json(res, { error: 'Log entry not found' }, 404)
    if (!(await verifyUserAuth(req, res, logRows[0].user_id))) return
    
    const rows = await teamDb(`SELECT * FROM symptom_entries WHERE daily_log_id = ${escapeStr(params.logId)} ORDER BY severity DESC`)
    json(res, rows)
  },

  // ===== CYCLES =====
  'POST /api/cycles': async (req, res) => {
    const body = await parseBody(req)
    if (!isValidUUID(body.userId)) return json(res, { error: 'Invalid or missing user ID' }, 400)
    if (!(await verifyUserAuth(req, res, body.userId))) return
    
    if (!isValidDate(body.periodStart)) return json(res, { error: 'Invalid or missing period start date' }, 400)
    
    const id = randomUUID()
    const now = new Date().toISOString()
    const safeStart = escapeStr(body.periodStart)
    const safeEnd = isValidDate(body.periodEnd) ? escapeStr(body.periodEnd) : 'NULL'
    const safeNotes = body.notes ? escapeStr(String(body.notes)) : 'NULL'
    
    await teamDb(`INSERT INTO cycles (id, user_id, period_start, period_end, notes, created_at) VALUES (${escapeStr(id)}, ${escapeStr(body.userId)}, ${safeStart}, ${safeEnd}, ${safeNotes}, ${escapeStr(now)})`)
    json(res, { id, ...body }, 201)
  },

  'GET /api/cycles/:userId': async (req, res, params) => {
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!(await verifyUserAuth(req, res, params.userId))) return
    
    const rows = await teamDb(`SELECT * FROM cycles WHERE user_id = ${escapeStr(params.userId)} ORDER BY period_start DESC`)
    json(res, rows)
  },

  // ===== INSIGHTS =====
  'GET /api/insights/:userId': async (req, res, params) => {
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!(await verifyUserAuth(req, res, params.userId))) return
    
    // Calculate pain-by-phase from logged data
    const logRows = await teamDb(`SELECT dl.cycle_phase, dl.pain_level, dl.log_date FROM daily_logs dl WHERE dl.user_id = ${escapeStr(params.userId)} AND dl.pain_level IS NOT NULL ORDER BY dl.log_date`)
    
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
  'GET /api/patterns/:userId': async (req, res, params) => {
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!(await verifyUserAuth(req, res, params.userId))) return
    
    const userId = params.userId
    const patterns = []

    // 1. Fetch all logs with symptoms
    const logRows = await teamDb(`SELECT dl.id, dl.log_date, dl.cycle_phase, dl.pain_level, dl.cycle_day 
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
    const symptomRows = await teamDb(`SELECT se.daily_log_id, se.symptom_name, se.severity, se.symptom_icon 
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
    
    await teamDb(`INSERT INTO clinical_feedback (id, user_id, feedback_type, target_id, target_label, rating, comment, created_at) VALUES (${escapeStr(id)}, ${safeUserId}, ${safeType}, ${safeTargetId}, ${safeTargetLabel}, ${safeRating}, ${safeComment}, ${escapeStr(now)})`)
    json(res, { id, submitted: true }, 201)
  },

  'GET /api/feedback/stats': async (req, res) => {
    const rows = await teamDb(`SELECT feedback_type, AVG(rating) as avg_rating, COUNT(*) as count FROM clinical_feedback GROUP BY feedback_type ORDER BY count DESC`)
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
    
    await teamDb(`INSERT INTO feedback_logs (id, report_id, user_role, rating, comments, lesion_mappings, created_at) VALUES (${escapeStr(id)}, ${safeReportId}, ${safeRole}, ${safeRating}, ${safeComments}, ${safeLesionMappings}, ${escapeStr(now)})`)
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
    const existing = await teamDb(`SELECT id FROM users WHERE email = ${escapeStr(safeEmail)}`)
    if (existing.length > 0) {
      return json(res, { error: 'Email already registered' }, 409)
    }
    
    const id = randomUUID()
    const now = new Date().toISOString()
    const passwordHash = hashPassword(password)
    const userRole = role === 'clinician' ? 'clinician' : 'patient' // Clinicians may self-register; admin is never client-assignable
    
    const safeName = escapeStr(displayName || '')
    const safeClinic = clinicName ? escapeStr(clinicName) : 'NULL'
    const safeSpecialty = specialty ? escapeStr(specialty) : 'NULL'
    
    // Insert new user
    await teamDb(`INSERT INTO users (id, display_name, email, password_hash, role, clinic_name, specialty, onboarding_complete, created_at, updated_at) VALUES (${escapeStr(id)}, ${safeName}, ${escapeStr(safeEmail)}, ${escapeStr(passwordHash)}, ${escapeStr(userRole)}, ${safeClinic}, ${safeSpecialty}, 0, ${escapeStr(now)}, ${escapeStr(now)})`)
    
    // Create and save session token
    const token = generateToken()
    await teamDb(`INSERT INTO sessions (token, user_id, created_at) VALUES (${escapeStr(token)}, ${escapeStr(id)}, ${escapeStr(now)})`)
    
    json(res, { id, email: safeEmail, displayName: displayName || '', role: userRole, token }, 201)
  },

  'POST /api/login': async (req, res) => {
    const body = await parseBody(req)
    const { email, password } = body
    
    if (!email || !password) {
      return json(res, { error: 'Email and password are required' }, 400)
    }
    
    const safeEmail = email.toLowerCase()
    const rows = await teamDb(`SELECT id, display_name, email, password_hash, role, clinic_name, specialty, onboarding_complete FROM users WHERE email = ${escapeStr(safeEmail)}`)
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
    await teamDb(`INSERT INTO sessions (token, user_id, created_at) VALUES (${escapeStr(token)}, ${escapeStr(user.id)}, ${escapeStr(now)})`)
    
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

  'GET /api/me/:userId': async (req, res, params) => {
    if (!isValidUUID(params.userId)) return json(res, { error: 'Invalid user ID format' }, 400)
    if (!(await verifyUserAuth(req, res, params.userId))) return
    
    const rows = await teamDb(`SELECT id, display_name, email, role, clinic_name, specialty, onboarding_complete, cycle_length_avg, last_period_start, created_at FROM users WHERE id = ${escapeStr(params.userId)}`)
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
  const isStrict = ['/api/register', '/api/login'].some(route => path.startsWith(route))
  if (!checkRateLimit(req, res, isStrict)) return

  // Try exact match first
  if (router[key]) {
    return safeHandle(router[key])(req, res, {})
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
      return safeHandle(handler)(req, res, params)
    }
  }

  // Anything that isn't a recognized API route: serve the built React app
  // (with an SPA fallback to index.html) instead of a JSON 404. Unmatched
  // /api/* requests still correctly fall through to a JSON 404 below.
  if (req.method === 'GET' && !path.startsWith('/api/')) {
    return serveStatic(req, res, path)
  }

  json(res, { error: 'Not found' }, 404)
})

server.listen(PORT, () => {
  console.log(`EndoBuddy API server running on port ${PORT}`)
})
