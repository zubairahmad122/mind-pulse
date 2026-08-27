export type SleepSession = {
  id: string;
  date: string;          // YYYY-MM-DD
  startTime: number;     // epoch ms
  endTime: number;       // epoch ms
  durationMinutes: number;
  quality: number;       // 1–5
};

export function calculateStreak(sessions: SleepSession[]): number {
  if (sessions.length === 0) return 0;
  const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
  const today = new Date().toLocaleDateString('sv');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('sv');
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  return streak;
}

export function avgDuration(sessions: SleepSession[]): number {
  if (sessions.length === 0) return 0;
  return Math.round(sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / sessions.length);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * The next Date matching a "HH:MM" wall-clock time — today if that time
 * hasn't passed yet, otherwise tomorrow. Used so a fixed wake-time alarm
 * always fires at the same clock time regardless of when sleep tracking
 * actually started (a duration-based `now + plannedHours` calculation would
 * push the alarm later on a late start, contradicting the fixed time the
 * Tonight/Routine tabs display).
 */
export function nextOccurrenceOfTime(hhmm: string, from: Date = new Date()): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const candidate = new Date(from);
  candidate.setHours(h, m, 0, 0);
  if (candidate.getTime() <= from.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}
