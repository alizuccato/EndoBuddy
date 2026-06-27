/**
 * EndoBuddy Database Migration Runner
 * 
 * Reads and executes SQL migration files in order.
 * Supports both local SQLite and Turso/libSQL.
 * 
 * Usage:
 *   import { runMigrations } from './db/migrate'
 *   await runMigrations(db)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Get all migration files sorted numerically
 */
export function getMigrations() {
  const migrationsDir = __dirname
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.match(/^\d+.*\.sql$/))
    .sort()
  
  return files.map(file => ({
    filename: file,
    path: path.join(migrationsDir, file),
    content: fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
  }))
}

/**
 * Run all pending migrations
 * @param {object} db - Database instance (better-sqlite3 or @libsql/client)
 */
export async function runMigrations(db) {
  const migrations = getMigrations()
  
  // Create migration tracking table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  
  // Get already executed migrations
  const executed = new Set(
    (db.all(`SELECT filename FROM _migrations`) || []).map(r => r.filename)
  )
  
  for (const migration of migrations) {
    if (executed.has(migration.filename)) {
      console.log(`  ✓ ${migration.filename} (already executed)`)
      continue
    }
    
    console.log(`  → Running ${migration.filename}...`)
    
    // Split by semicolons and execute each statement
    const statements = migration.content
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const stmt of statements) {
      try {
        db.run(stmt)
      } catch (err) {
        // Ignore "already exists" errors for idempotency
        if (!err.message?.includes('already exists')) {
          console.error(`    Error in ${migration.filename}: ${err.message}`)
          console.error(`    Statement: ${stmt.substring(0, 100)}...`)
          throw err
        }
      }
    }
    
    // Record migration
    db.run(`INSERT INTO _migrations (filename) VALUES (?)`, [migration.filename])
    console.log(`  ✓ ${migration.filename} complete`)
  }
  
  console.log(`\nAll migrations complete.`)
}

/**
 * Run seed data
 */
export async function runSeed(db) {
  const seedPath = path.join(__dirname, 'seed.sql')
  if (!fs.existsSync(seedPath)) {
    console.log('No seed file found.')
    return
  }
  
  const seedContent = fs.readFileSync(seedPath, 'utf-8')
  const statements = seedContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  for (const stmt of statements) {
    try {
      db.run(stmt)
    } catch (err) {
      console.error(`Seed error: ${err.message}`)
    }
  }
  
  console.log('Seed data loaded.')
}

// Run migrations directly if called as script
if (process.argv[1] && process.argv[1].includes('migrate')) {
  console.log('EndoBuddy Database Migration')
  console.log('===========================')
  console.log('Run this module programmatically with your database instance.')
  console.log('Example:')
  console.log('  import { runMigrations, runSeed } from "./src/db/migrate"')
  console.log('  const db = new Database("endobuddy.db")')
  console.log('  runMigrations(db)')
  console.log('  runSeed(db)')
}