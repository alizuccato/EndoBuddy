-- EndoBuddy Migration 002: Add role column to users
-- Supports Patient and Clinician role-based access control

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'patient';

-- Add clinic_name for clinician accounts
ALTER TABLE users ADD COLUMN clinic_name TEXT;

-- Add specialty for clinician accounts
ALTER TABLE users ADD COLUMN specialty TEXT;