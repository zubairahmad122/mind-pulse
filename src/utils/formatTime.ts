// ──────────────────────────────────────────────────────────────────────────────
// Time utility functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Format "HH:MM" to "10:00 PM" style display.
 */
export function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Calculate sleep duration between bedtime and wake time.
 * Handles overnight ranges (e.g., 23:00 → 06:30 = 7.5h).
 */
export function calculateSleepDuration(bedtime: string, wakeTime: string): number {
  const bed = parseTimeToMinutes(bedtime);
  const wake = parseTimeToMinutes(wakeTime);
  let diff = wake - bed;
  if (diff <= 0) diff += 24 * 60;
  return Math.round((diff / 60) * 10) / 10;
}

/**
 * Parse "HH:MM" to total minutes since midnight.
 */
export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Adjust a time string by delta minutes. Returns new "HH:MM".
 */
export function adjustTime(time: string, deltaMinutes: number): string {
  let total = parseTimeToMinutes(time) + deltaMinutes;
  if (total < 0) total += 24 * 60;
  if (total >= 24 * 60) total -= 24 * 60;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Get greeting based on time of day.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good Night';
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
}

/**
 * Format duration in minutes to "Xh Ym" display.
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Alias used by existing code — same as calculateSleepDuration.
 */
export function calculateSleepDurationHours(bedtime: string, wakeTime: string): number {
  return calculateSleepDuration(bedtime, wakeTime);
}

/**
 * Format total seconds to "MM:SS" display.
 */
export function formatDurationSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Format a date string to "Mon, Jun 26" style.
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get relative time string ("Today", "Yesterday", "2 days ago").
 */
export function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDateShort(dateStr);
}
