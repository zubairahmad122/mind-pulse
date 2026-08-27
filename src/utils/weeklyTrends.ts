import type { DailyAggregate } from '@/services/screenBalanceHistoryPersistence';
import type { ScreenTimeHistory } from '@/types/screenUsage.types';
import { formatScreenTimeMs, formatSpokenDurationMs } from './screenUsageFormat';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface WeekDayTrend extends DailyAggregate {
  date: string;
  label: string;
  isToday: boolean;
  /** `null` = Usage Access wasn't available for this day, never a fabricated zero. */
  screenTimeMs: number | null;
}

export interface WeeklyTrendsTotals {
  screenTimeMs: number;
  focusMinutes: number;
  offlineMinutes: number;
  resetsCompleted: number;
}

export interface WeeklyTrends {
  hasScreenTimePermission: boolean;
  days: WeekDayTrend[];
  totals: WeeklyTrendsTotals;
}

/** Local "YYYY-MM-DD" for [date] — matches every other Screen Balance date key. */
function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Combines the native screen-time history and the local MindPulse-recorded
 * daily aggregates into one ordered week (oldest → newest, last = today).
 * Both inputs are merged by date key rather than assumed to already be the
 * same length/order — each source builds its own list of "last N days"
 * independently.
 */
export function buildWeeklyTrends(
  screenTimeHistory: ScreenTimeHistory,
  dailyHistory: ({ date: string } & DailyAggregate)[],
  now: Date = new Date(),
  days = 7,
): WeeklyTrends {
  const screenTimeByDate = new Map(screenTimeHistory.days.map(d => [d.date, d.screenTimeMs]));
  const aggregateByDate = new Map(dailyHistory.map(d => [d.date, d]));

  const todayKey = localDateKey(now);
  const weekDays: WeekDayTrend[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const date = localDateKey(d);
    const aggregate = aggregateByDate.get(date);
    weekDays.push({
      date,
      label: WEEKDAY_SHORT[d.getDay()],
      isToday: date === todayKey,
      screenTimeMs: screenTimeByDate.has(date) ? screenTimeByDate.get(date) ?? null : null,
      focusMinutes: aggregate?.focusMinutes ?? 0,
      offlineMinutes: aggregate?.offlineMinutes ?? 0,
      resetsCompleted: aggregate?.resetsCompleted ?? 0,
    });
  }

  const totals = weekDays.reduce<WeeklyTrendsTotals>(
    (acc, day) => ({
      screenTimeMs: acc.screenTimeMs + (day.screenTimeMs ?? 0),
      focusMinutes: acc.focusMinutes + day.focusMinutes,
      offlineMinutes: acc.offlineMinutes + day.offlineMinutes,
      resetsCompleted: acc.resetsCompleted + day.resetsCompleted,
    }),
    { screenTimeMs: 0, focusMinutes: 0, offlineMinutes: 0, resetsCompleted: 0 },
  );

  return { hasScreenTimePermission: screenTimeHistory.hasPermission, days: weekDays, totals };
}

/**
 * The best (highest screen-time) day this week, or `null` if every day is
 * either zero or unavailable — used by the chart to scale bar heights.
 * Never an arbitrary fixed scale (a 30-minute day would look identical to
 * a 6-hour day on a fixed axis).
 */
export function chartMaxScreenTimeMs(days: WeekDayTrend[]): number | null {
  const max = days.reduce((acc, day) => Math.max(acc, day.screenTimeMs ?? 0), 0);
  return max > 0 ? max : null;
}

/** The day with the most focus minutes this week, or `null` if no focus time was recorded on any day. */
export function bestFocusDay(days: WeekDayTrend[]): WeekDayTrend | null {
  let best: WeekDayTrend | null = null;
  for (const day of days) {
    if (day.focusMinutes > 0 && (best === null || day.focusMinutes > best.focusMinutes)) best = day;
  }
  return best;
}

/**
 * Full accessible sentence for one chart bar — "Tuesday, 2 hours 14
 * minutes screen time" or "Tuesday, screen time unavailable" when Usage
 * Access wasn't granted. Uses the full weekday name, not the chart's
 * 3-letter label.
 */
export function weekDayAccessibilityLabel(day: WeekDayTrend): string {
  const date = new Date(`${day.date}T00:00:00`);
  const weekday = day.isToday ? 'Today' : WEEKDAY_FULL[date.getDay()];
  if (day.screenTimeMs === null) return `${weekday}, screen time unavailable`;
  if (day.screenTimeMs === 0) return `${weekday}, no screen time`;
  return `${weekday}, ${formatSpokenDurationMs(day.screenTimeMs)} screen time`;
}

/**
 * Compact daily-detail row text — e.g. "2h 14m screen · 25m focus · 1
 * reset". Zero-valued metrics are omitted (a day with no focus activity
 * doesn't need "0m focus" cluttering every row); the screen-time segment
 * always shows, reading "Screen time unavailable" when permission wasn't
 * granted that day.
 */
export function dayDetailText(day: WeekDayTrend): string {
  const parts: string[] = [];
  if (day.screenTimeMs === null) parts.push('Screen time unavailable');
  else parts.push(`${formatScreenTimeMs(day.screenTimeMs)} screen`);
  if (day.focusMinutes > 0) parts.push(`${day.focusMinutes}m focus`);
  if (day.offlineMinutes > 0) parts.push(`${day.offlineMinutes}m offline`);
  if (day.resetsCompleted > 0) parts.push(`${day.resetsCompleted} reset${day.resetsCompleted === 1 ? '' : 's'}`);
  return parts.join(' · ');
}
