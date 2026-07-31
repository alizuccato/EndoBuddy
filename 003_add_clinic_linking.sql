-- EndoBuddy Migration 003: Clinic <-> Patient linking
-- Lets a clinician generate an invite code, a patient redeem it, and the
-- clinician's dashboard query real linked patients instead of mock data.

-- Which clinician a patient account is linked to, once they redeem a code.
-- NULL for patients not connected to any clinic, and for clinician accounts.
ALTER TABLE users ADD COLUMN clinician_id TEXT REFERENCES users(id);

CREATE TABLE IF NOT EXISTS clinic_invitations (
    id              TEXT PRIMARY KEY,          -- UUID
    clinician_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code            TEXT NOT NULL UNIQUE,      -- e.g. EB-X7K9M2
    access_level    TEXT NOT NULL DEFAULT 'standard', -- standard, advanced
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending, accepted, revoked
    patient_id      TEXT REFERENCES users(id), -- set once accepted
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    accepted_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_clinic_invitations_clinician ON clinic_invitations(clinician_id);
CREATE INDEX IF NOT EXISTS idx_clinic_invitations_code ON clinic_invitations(code);
CREATE INDEX IF NOT EXISTS idx_users_clinician_id ON users(clinician_id);
