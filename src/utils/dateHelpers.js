/**
 * dateHelpers
 *
 * Utilities for converting a JS Date to a YYYY-MM-DD string using the
 * browser's LOCAL calendar date, not UTC.
 *
 * Date.prototype.toISOString() always returns the UTC date/time. For any
 * user west of UTC (e.g. Toronto, UTC-4/UTC-5), once local time passes
 * 20:00-21:00, the UTC calendar date has already rolled over to the next
 * day. That mismatch was causing date pickers and "today" checks to be
 * off by one day in the evening. Use getLocalDateString() instead of
 * date.toISOString().split('T')[0] anywhere a *local* calendar date
 * (as opposed to a UTC instant) is intended.
 */
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Computes which day of the cycle "today" (or a given reference date) falls
 * on, given a period start date stored as a "YYYY-MM-DD" string.
 *
 * IMPORTANT: `new Date("YYYY-MM-DD")` parses the string as UTC midnight, not
 * local midnight. Subtracting that from `new Date()` (a local instant) means
 * the day count silently increments a few hours early for anyone west of
 * UTC (e.g. ~8pm in Toronto), regardless of whether it's still the same
 * calendar day locally. To avoid that, both dates are converted to local
 * midnight before diffing, so the count only changes at local midnight.
 */
export function getDayOfCycle(lastPeriodStart, cycleLength = 28, referenceDate = new Date()) {
  if (!lastPeriodStart) return null
  const [year, month, day] = String(lastPeriodStart).split('-').map(Number)
  if (!year || !month || !day) return null

  const startLocalMidnight = new Date(year, month - 1, day)
  const todayLocalMidnight = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  const dayDiff = Math.round((todayLocalMidnight.getTime() - startLocalMidnight.getTime()) / 86400000)

  return ((dayDiff % cycleLength) + cycleLength) % cycleLength + 1
}

/**
 * Same idea as getDayOfCycle, but for computing the cycle day of a
 * *specific past log entry* (a "YYYY-MM-DD" string) rather than "today".
 * Both dates are parsed into local-midnight Date objects the same way
 * getDayOfCycle does, so whichever timezone the code happens to run in
 * (a user's browser, or a server process with its own system timezone)
 * cancels out of the diff instead of skewing it — this is what makes it
 * safe to call from server.js as well as from client components.
 */
export function getCycleDayForDateString(lastPeriodStart, cycleLength = 28, logDateString) {
  if (!lastPeriodStart || !logDateString) return null
  const [sy, sm, sd] = String(lastPeriodStart).split('-').map(Number)
  const [ly, lm, ld] = String(logDateString).split('-').map(Number)
  if (!sy || !sm || !sd || !ly || !lm || !ld) return null

  const startLocalMidnight = new Date(sy, sm - 1, sd)
  const logLocalMidnight = new Date(ly, lm - 1, ld)
  const dayDiff = Math.round((logLocalMidnight.getTime() - startLocalMidnight.getTime()) / 86400000)

  return ((dayDiff % cycleLength) + cycleLength) % cycleLength + 1
}

/**
 * Maps a cycle day number to a phase label. Extracted from App.jsx's
 * "current phase" calculation so the exact same rule (ovulation ~14 days
 * before the *next* period, so it's anchored off cycleLength rather than
 * a hardcoded day 15) can be reused anywhere a day-of-cycle needs a phase
 * — including server-side, when computing/backfilling cycle_phase for a
 * saved log rather than just for "today".
 */
export function getCyclePhaseForDay(dayNum, cycleLength = 28, { isAcyclic = false, hormoneCycleTracking = false } = {}) {
  if (dayNum == null) return null
  // Hormone-therapy pattern, not ovarian biology — a neutral day count/
  // label rather than menstrual-phase language.
  if (isAcyclic && hormoneCycleTracking) return 'hormoneCycle'
  if (isAcyclic) return null

  const ovulationDay = Math.max(1, cycleLength - 14)
  if (dayNum <= 5) return 'menstrual'
  if (dayNum < ovulationDay) return 'follicular'
  if (dayNum === ovulationDay) return 'ovulatory'
  return 'luteal'
}

/**
 * Computes { cycleDay, cyclePhase } for a single log date, given the
 * user's cycle profile. This is the piece that was previously missing
 * entirely for saved logs — App.jsx only ever computed a phase for
 * "today" (for the home-screen display), so every daily_logs row was
 * saved with cycle_day/cycle_phase left null regardless of how much a
 * user had logged. Used both when saving/updating a log and when
 * backfilling existing null rows.
 */
export function computeCyclePhaseForLog({
  lastPeriodStart,
  cycleLength = 28,
  cycleTrackingMode = 'menstrual',
  hormoneCycleTracking = false,
  logDate,
}) {
  const isAcyclic = cycleTrackingMode === 'acyclic'
  // Acyclic users without hormone-cycle tracking never have a real cycle
  // start date to compute against, regardless of what's stored.
  const effectiveLastPeriodStart = (isAcyclic && !hormoneCycleTracking) ? null : lastPeriodStart
  if (!effectiveLastPeriodStart) return { cycleDay: null, cyclePhase: null }

  const cycleDay = getCycleDayForDateString(effectiveLastPeriodStart, cycleLength, logDate)
  if (cycleDay == null) return { cycleDay: null, cyclePhase: null }

  const cyclePhase = getCyclePhaseForDay(cycleDay, cycleLength, { isAcyclic, hormoneCycleTracking })
  return { cycleDay, cyclePhase }
}

/**
 * Predicts the next period start date and how many days away it is, given
 * the most recent period start and the user's average cycle length.
 *
 * Two bugs this fixes vs. the previous inline version in
 * InsightsDashboard.jsx:
 *
 * 1. Timezone: the old code did `new Date(lastPeriodStart)`, which parses
 *    a "YYYY-MM-DD" string as UTC midnight rather than local midnight —
 *    the same class of bug documented above for getDayOfCycle. Both dates
 *    here are built the same local-midnight way instead, so the result
 *    doesn't skew by several hours for anyone west of UTC.
 *
 * 2. Staleness: the old code lived inside a `useMemo` keyed on
 *    lastPeriodStart/cycleLength, but its actual math depended on
 *    `Date.now()` — which isn't (and can't be) a dependency. So the
 *    "days until" count only ever got recalculated when the period start
 *    date or cycle length changed, not as days actually passed, and could
 *    freeze on a stale answer (e.g. still showing "In 0 days" / a past
 *    date long after that date had come and gone) even while other,
 *    correctly-recomputed parts of the UI (like the current cycle day)
 *    kept advancing. This function takes referenceDate as a plain
 *    argument rather than reaching for Date.now() internally, so the
 *    caller is expected to call it fresh on each render (not memoize it)
 *    — see InsightsDashboard.jsx.
 */
export function getNextPeriodPrediction(lastPeriodStart, cycleLength = 28, referenceDate = new Date()) {
  if (!lastPeriodStart) return null
  const [sy, sm, sd] = String(lastPeriodStart).split('-').map(Number)
  if (!sy || !sm || !sd) return null

  const startLocalMidnight = new Date(sy, sm - 1, sd)
  const todayLocalMidnight = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())

  // Land on the next occurrence of "period start" that is today or in the
  // future, rather than always adding exactly one cycleLength — otherwise
  // a period that's overdue (the person hasn't logged a new one yet, past
  // the predicted date) would show a negative/clamped-to-zero countdown
  // pointing at a date that's already passed, instead of correctly
  // rolling forward to the next predicted occurrence. Repeatedly adding
  // whole cycles (rather than a single division) keeps the exact-boundary
  // case correct too: if today falls precisely on a predicted date, that
  // date IS "next" (0 days away), not the one after it.
  let nextPeriod = new Date(startLocalMidnight.getTime() + cycleLength * 86400000)
  while (nextPeriod.getTime() < todayLocalMidnight.getTime()) {
    nextPeriod = new Date(nextPeriod.getTime() + cycleLength * 86400000)
  }
  const daysUntil = Math.round((nextPeriod.getTime() - todayLocalMidnight.getTime()) / 86400000)

  return {
    nextPeriodDate: nextPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    daysUntil,
    isImminent: daysUntil <= 3 && daysUntil >= 0,
  }
}
