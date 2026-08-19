-- EndoBuddy Migration 004: Add cycle tracking mode
-- Supports patients without a menstrual cycle to track against (e.g.
-- post-hysterectomy, menopausal) so the app stops fabricating a fake
-- period date for them and instead tracks symptoms day-to-day.

-- 'menstrual' (default): cycle day/phase computed from last_period_start
-- and cycle_length_avg, as before.
-- 'acyclic': no menstrual cycle. Phase/cycle-day displays are turned off
-- app-wide unless hormone_cycle_tracking is also set.
ALTER TABLE users ADD COLUMN cycle_tracking_mode TEXT NOT NULL DEFAULT 'menstrual';

-- Only meaningful when cycle_tracking_mode = 'acyclic'. Lets a patient on
-- cyclical hormone therapy (e.g. cyclic HRT patches/pills) still track that
-- pattern. When set, last_period_start/cycle_length_avg are repurposed to
-- represent the hormone therapy cycle rather than a menstrual one, and the
-- app labels it as such instead of using menstrual-phase language.
ALTER TABLE users ADD COLUMN hormone_cycle_tracking INTEGER NOT NULL DEFAULT 0;
