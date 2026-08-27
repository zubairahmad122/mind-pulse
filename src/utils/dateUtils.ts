/**
 * YYYY-MM-DD for a Date, using its LOCAL calendar day.
 * Never use `toISOString().slice(0, 10)` for this — it reads the UTC day,
 * which is already "tomorrow" for the evening hours in any positive-offset
 * timezone (e.g. PKT, UTC+5: local 20:00 is already the next UTC day for
 * the first few hours after each local midnight... the reverse case, UTC
 * has rolled over while local hasn't yet — either direction silently mis-buckets
 * streaks/challenges/activity-log entries near midnight).
 */
export function getLocalDateISO(d: Date = new Date()): string {
  return d.toLocaleDateString('sv'); // sv-SE formats as YYYY-MM-DD
}

/** Today's date as a YYYY-MM-DD string, local time. */
export function todayISO(): string {
  return getLocalDateISO();
}

/**
 * Parses a YYYY-MM-DD string into a local Date at local midnight — the safe
 * alternative to `new Date(isoString)`, which the JS spec parses as UTC
 * midnight (and so round-trips incorrectly through local getters/setters in
 * negative-offset timezones).
 */
export function parseLocalISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Adds `days` (may be negative) to a YYYY-MM-DD string, returning a
 * YYYY-MM-DD string. Parses the input via local Date components so it never
 * round-trips through UTC, and is safe across month/year boundaries and DST.
 */
export function addDaysISO(iso: string, days: number): string {
  const date = parseLocalISO(iso);
  date.setDate(date.getDate() + days);
  return getLocalDateISO(date);
}

/** The most recent Monday (start of week) as a YYYY-MM-DD string, local time. */
export function getMondayISO(d: Date = new Date()): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysISO(getLocalDateISO(d), diff);
}

/**
 * Whole-day difference between two YYYY-MM-DD strings (b - a). Both sides are
 * parsed as UTC calendar dates (the `T00:00:00Z` suffix makes this explicit),
 * so the day-count is exact regardless of the device's timezone or DST — this
 * is pure calendar arithmetic, not a wall-clock comparison, so it does NOT
 * need `getLocalDateISO`/local parsing the way display or bucketing logic does.
 */
export function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / msPerDay);
}
