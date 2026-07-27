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
