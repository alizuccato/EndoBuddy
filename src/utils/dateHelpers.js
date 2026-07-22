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
