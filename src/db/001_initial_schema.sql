-- EndoBuddy Initial Schema
-- Migration 001: Core tables for symptom and cycle tracking
-- Designed for SQLite (via Turso/libSQL)

-- ============================================================
-- USERS
-- Minimal PII stored locally — auth handled externally
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,          -- UUID
    display_name    TEXT,                      -- Optional preferred name
    date_of_birth   TEXT,                      -- Optional, YYYY-MM-DD
    timezone        TEXT DEFAULT 'UTC',
    cycle_length_avg INTEGER,                  -- Calculated average
    period_length_avg INTEGER,                 -- Calculated average
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- CYCLE PHASES (Reference/Lookup)
-- ============================================================
CREATE TABLE IF NOT EXISTS cycle_phases (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,      -- menstrual, follicular, ovulatory, luteal
    typical_day_range TEXT,                    -- e.g., "1-5"
    description     TEXT
);

INSERT OR IGNORE INTO cycle_phases (name, typical_day_range, description) VALUES
    ('menstrual',   '1-5',   'Period bleeding — low estrogen and progesterone'),
    ('follicular',  '6-14',  'Follicles develop — estrogen rises'),
    ('ovulatory',   '14',    'Egg released — estrogen peak'),
    ('luteal',      '15-28', 'Progesterone rises — PMS symptoms common');

-- ============================================================
-- CYCLES
-- Each tracked menstrual period cycle
-- ============================================================
CREATE TABLE IF NOT EXISTS cycles (
    id              TEXT PRIMARY KEY,          -- UUID
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start    TEXT NOT NULL,             -- DATE: YYYY-MM-DD
    period_end      TEXT,                      -- DATE: YYYY-MM-DD
    cycle_length_days INTEGER,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cycles_user_id ON cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_cycles_period_start ON cycles(period_start);

-- ============================================================
-- DAILY LOGS
-- Central journal — one per user per day
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_logs (
    id              TEXT PRIMARY KEY,          -- UUID
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date        TEXT NOT NULL,             -- DATE: YYYY-MM-DD
    cycle_day       INTEGER,                   -- Day of current cycle (1 = period start)
    cycle_phase     TEXT REFERENCES cycle_phases(name),
    is_period_day   INTEGER DEFAULT 0,         -- BOOL: 0 or 1
    flow_level      TEXT,                      -- 'light', 'medium', 'heavy', 'spotting'
    overall_wellness INTEGER,                  -- 1-10
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_cycle_phase ON daily_logs(cycle_phase);

-- ============================================================
-- SYMPTOMS (Reference/Lookup)
-- ============================================================
CREATE TABLE IF NOT EXISTS symptoms (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,
    category        TEXT NOT NULL,         -- pain, digestive, neurological, emotional, general, urinary
    icon            TEXT                   -- Emoji representation
);

INSERT OR IGNORE INTO symptoms (name, category, icon) VALUES
    ('Bloating',        'digestive',    '🫃'),
    ('Cramping',        'pain',         '⚡'),
    ('Fatigue',         'general',      '😴'),
    ('Nausea',          'digestive',    '🤢'),
    ('Headache',        'pain',         '🤕'),
    ('Back pain',       'pain',         '🔙'),
    ('Breast tenderness', 'pain',       '🎯'),
    ('Mood swings',     'emotional',    '🎢'),
    ('Anxiety',         'emotional',    '😰'),
    ('Depression',      'emotional',    '😢'),
    ('Insomnia',        'general',      '🌙'),
    ('Brain fog',       'neurological', '🌫️'),
    ('Dizziness',       'neurological', '💫'),
    ('Joint pain',      'pain',         '🦴'),
    ('Muscle aches',    'pain',         '💪'),
    ('Acne',            'general',      '🔴'),
    ('Constipation',    'digestive',    '🚫'),
    ('Diarrhea',        'digestive',    '💧'),
    ('Urinary urgency', 'urinary',      '🚽'),
    ('Painful urination', 'urinary',    '🔥');

-- ============================================================
-- SYMPTOM ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS symptom_entries (
    id              TEXT PRIMARY KEY,          -- UUID
    daily_log_id    TEXT NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    symptom_id      INTEGER NOT NULL REFERENCES symptoms(id),
    severity        INTEGER NOT NULL CHECK(severity >= 1 AND severity <= 10),
    time_of_day     TEXT,                      -- morning, afternoon, evening, night
    duration_minutes INTEGER,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_symptom_entries_log ON symptom_entries(daily_log_id);
CREATE INDEX IF NOT EXISTS idx_symptom_entries_symptom ON symptom_entries(symptom_id);

-- ============================================================
-- PAIN LOCATIONS (Reference)
-- ============================================================
CREATE TABLE IF NOT EXISTS pain_locations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,
    body_region     TEXT NOT NULL          -- abdomen, back, legs, pelvis, head, chest,全身
);

INSERT OR IGNORE INTO pain_locations (name, body_region) VALUES
    ('Lower abdomen',       'abdomen'),
    ('Upper abdomen',       'abdomen'),
    ('Lower back',          'back'),
    ('Upper back',          'back'),
    ('Pelvis',              'pelvis'),
    ('Legs',                'legs'),
    ('Hips',                'pelvis'),
    ('Head',                'head'),
    ('Chest',               'chest'),
    ('Shoulders',           'back'),
    ('Neck',                'back');

-- ============================================================
-- PAIN ENTRIES
-- Endometriosis-specific detailed pain logging
-- ============================================================
CREATE TABLE IF NOT EXISTS pain_entries (
    id              TEXT PRIMARY KEY,          -- UUID
    daily_log_id    TEXT NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    pain_location_id INTEGER NOT NULL REFERENCES pain_locations(id),
    pain_type       TEXT,                      -- cramping, sharp, stabbing, dull, burning, throbbing
    severity        INTEGER NOT NULL CHECK(severity >= 1 AND severity <= 10),
    time_of_day     TEXT,                      -- morning, afternoon, evening, night
    duration_minutes INTEGER,
    triggered_by    TEXT,                      -- activity, food, stress, etc.
    relief_method   TEXT,                      -- heat, medication, rest, etc.
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pain_entries_log ON pain_entries(daily_log_id);

-- ============================================================
-- FOOD ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS food_entries (
    id              TEXT PRIMARY KEY,          -- UUID
    daily_log_id    TEXT NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    meal_type       TEXT,                      -- breakfast, lunch, dinner, snack
    food_items      TEXT NOT NULL,             -- comma-separated or free text
    inflammatory_rating INTEGER CHECK(inflammatory_rating >= 1 AND inflammatory_rating <= 5),
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_food_entries_log ON food_entries(daily_log_id);

-- ============================================================
-- STRESS & MOOD ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS stress_mood_entries (
    id              TEXT PRIMARY KEY,          -- UUID
    daily_log_id    TEXT NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    stress_level    INTEGER CHECK(stress_level >= 1 AND stress_level <= 10),
    mood            TEXT,                      -- happy, anxious, depressed, irritable, neutral, calm, sad, angry
    sleep_hours     REAL,                      -- decimal hours
    sleep_quality   INTEGER CHECK(sleep_quality >= 1 AND sleep_quality <= 5),
    exercise_minutes INTEGER,
    exercise_type   TEXT,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stress_mood_log ON stress_mood_entries(daily_log_id);

-- ============================================================
-- MEDICATIONS (Reference)
-- ============================================================
CREATE TABLE IF NOT EXISTS medications (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,
    type            TEXT NOT NULL,         -- prescription, OTC, supplement, herbal
    category        TEXT                   -- pain_relief, hormonal, anti-inflammatory, supplement
);

INSERT OR IGNORE INTO medications (name, type, category) VALUES
    ('Ibuprofen',           'OTC',          'pain_relief'),
    ('Naproxen',            'OTC',          'pain_relief'),
    ('Tylenol',             'OTC',          'pain_relief'),
    ('Birth Control Pill',  'prescription', 'hormonal'),
    ('GnRH Agonist',        'prescription', 'hormonal'),
    ('Orilissa',            'prescription', 'hormonal'),
    ('Magnesium',           'supplement',   'supplement'),
    ('Vitamin B6',          'supplement',   'supplement'),
    ('Vitamin D',           'supplement',   'supplement'),
    ('Omega-3',            'supplement',   'supplement'),
    ('Turmeric',            'herbal',       'anti-inflammatory'),
    ('Ginger',              'herbal',       'anti-inflammatory'),
    ('CBD Oil',             'herbal',       'pain_relief'),
    ('Heat Pack',           'OTC',          'pain_relief'),
    ('TENS Unit',           'OTC',          'pain_relief');

-- ============================================================
-- MEDICATION ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_entries (
    id              TEXT PRIMARY KEY,          -- UUID
    daily_log_id    TEXT NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    medication_id   INTEGER REFERENCES medications(id),
    custom_name     TEXT,                      -- if medication not in reference list
    dosage          TEXT,                      -- e.g., "200mg"
    time_taken      TEXT,                      -- time of day
    effective       INTEGER DEFAULT 0,         -- BOOL: Did it help?
    side_effects    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_medication_entries_log ON medication_entries(daily_log_id);

-- ============================================================
-- AI PATTERN INSIGHTS
-- Discovered patterns and correlations
-- ============================================================
CREATE TABLE IF NOT EXISTS pattern_insights (
    id              TEXT PRIMARY KEY,          -- UUID
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_type    TEXT NOT NULL,             -- symptom_cycle_correlation, food_trigger, stress_impact, medication_effectiveness
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    confidence_score REAL CHECK(confidence_score >= 0 AND confidence_score <= 1),
    supporting_data TEXT,                      -- JSON
    detected_at     TEXT NOT NULL DEFAULT (datetime('now')),
    is_active       INTEGER DEFAULT 1,         -- BOOL
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pattern_insights_user ON pattern_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_pattern_insights_type ON pattern_insights(pattern_type);

-- ============================================================
-- DOCTOR REPORTS
-- Generated reports for medical consultations
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_reports (
    id              TEXT PRIMARY KEY,          -- UUID
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date      TEXT NOT NULL,             -- DATE
    end_date        TEXT NOT NULL,             -- DATE
    report_type     TEXT NOT NULL,             -- full, symptom_summary, cycle_summary
    report_data     TEXT NOT NULL,             -- JSON — full report content
    generated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    shared_count    INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_doctor_reports_user ON doctor_reports(user_id);