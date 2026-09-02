/**
 * lifestyleFactors
 *
 * Single source of truth for the 8 lifestyle factors tracked for the
 * Correlation Map (Premium > Visualizations). Shared between:
 *  - LifestyleFactorsStep.jsx (the logging UI — quick toggle chips)
 *  - server.js (validating incoming log data, and computing the
 *    per-factor pain correlation in GET /api/patterns)
 *
 * Each factor is a same-day present/not-logged toggle, not a severity
 * scale — `key` is the daily_logs column name (INTEGER, NULL = not
 * logged, 1 = present that day). Kept in one file so the toggle UI and
 * the correlation math can never disagree about what a factor is called
 * or what it means.
 */

export const LIFESTYLE_FACTORS = [
  { key: 'poor_sleep', bodyKey: 'poorSleep', label: 'Poor sleep', icon: '😴' },
  { key: 'high_stress', bodyKey: 'highStress', label: 'High stress', icon: '😰' },
  { key: 'had_alcohol', bodyKey: 'hadAlcohol', label: 'Alcohol', icon: '🍷' },
  { key: 'had_caffeine', bodyKey: 'hadCaffeine', label: 'Caffeine', icon: '☕' },
  { key: 'low_hydration', bodyKey: 'lowHydration', label: 'Low water intake', icon: '🚱' },
  { key: 'exercised', bodyKey: 'exercised', label: 'Exercised', icon: '🏃' },
  { key: 'ate_gluten', bodyKey: 'ateGluten', label: 'Ate gluten', icon: '🌾' },
  { key: 'ate_dairy', bodyKey: 'ateDairy', label: 'Ate dairy', icon: '🧀' },
]

export const LIFESTYLE_FACTOR_KEYS = LIFESTYLE_FACTORS.map(f => f.key)

// factors is the client's lifestyleFactors object for one log (e.g.
// { poorSleep: true, hadAlcohol: false }), or undefined/null if the
// person skipped the whole lifestyle step for that log entirely.
//
// Two different kinds of "no" have to stay distinguishable here:
//  - The person opened the step and left a toggle off ("no, that didn't
//    happen") -> stored as 0, a real data point.
//  - The person skipped the step altogether -> stored as NULL for every
//    factor, meaning "not logged," not "no."
// Collapsing those together would silently bias the correlation math in
// GET /api/patterns toward "no" for every day someone just didn't open
// the step, which would understate real correlations. So: `factors`
// present (even as {}) means the step was engaged and every factor not
// explicitly set to true is a real "no" (0); `factors` absent means
// none of it was logged (NULL, excluded from the correlation entirely).
export function toLifestyleColumns(factors) {
  const cols = {}
  for (const f of LIFESTYLE_FACTORS) {
    cols[f.key] = factors ? (factors[f.bodyKey] ? 1 : 0) : null
  }
  return cols
}
