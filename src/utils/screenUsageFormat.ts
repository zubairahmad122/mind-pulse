/**
 * Formats a duration in milliseconds as "42 min", "1h 18m", "3h 07m" — never
 * seconds. Used for both "Screen Time Today" and session durations (same
 * rounding rules apply to either).
 */
export function formatScreenTimeMs(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Top Apps row duration — rounding a real 8s/42s visit down to "0 min"
 * would read as no usage at all, so anything under a minute (but above
 * zero) reads "<1 min" instead of going through `formatScreenTimeMs`'s
 * round-to-nearest-minute behavior.
 */
export function formatTopAppDurationMs(ms: number): string {
  if (ms <= 0) return '0 min';
  if (ms < 60_000) return '<1 min';
  return formatScreenTimeMs(ms);
}
