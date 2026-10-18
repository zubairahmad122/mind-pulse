// Pure queries over the unified activity log — no I/O, no React, so every
// rule ("what counts as an active day", "this week") lives in one testable place.

import { ACTIVITY_TYPES, type ActivityEvent, type ActivityType } from '@/types/activity.types';
import { addDaysISO, getLocalDateISO, getMondayISO } from '@/utils/dateUtils';

/** The pillar each activity belongs to, for the Home journey / weekly dots. */
export type ActivityPillar = 'eye' | 'mind' | 'relax' | 'focus' | 'sleep';

export const ACTIVITY_PILLAR: Record<ActivityType, ActivityPillar> = {
  MIND_GAME_COMPLETED: 'mind',
  EYE_RESET_COMPLETED: 'eye',
  EYE_BREAK_COMPLETED: 'eye',
  EYE_GAME_COMPLETED: 'eye',
  FOCUS_SESSION_COMPLETED: 'focus',
  RELAX_SESSION_COMPLETED: 'relax',
  SLEEP_SESSION_COMPLETED: 'sleep',
};

export function isActivityType(value: unknown): value is ActivityType {
  return typeof value === 'string' && (ACTIVITY_TYPES as readonly string[]).includes(value);
}

/** Local calendar day for an epoch-ms timestamp. */
export function activityDateKey(timestamp: number): string {
  return getLocalDateISO(new Date(timestamp));
}

export function getActivitiesOnDate(events: readonly ActivityEvent[], date: string): ActivityEvent[] {
  return events.filter(e => e.date === date);
}

/** Inclusive YYYY-MM-DD range — string comparison is safe for this format. */
export function getActivitiesInRange(
  events: readonly ActivityEvent[],
  startDate: string,
  endDate: string,
): ActivityEvent[] {
  return events.filter(e => e.date >= startDate && e.date <= endDate);
}

export function hasCompletedOnDate(
  events: readonly ActivityEvent[],
  type: ActivityType,
  date: string,
  predicate?: (event: ActivityEvent) => boolean,
): boolean {
  return events.some(e => e.type === type && e.date === date && (!predicate || predicate(e)));
}

/** Every local day with at least one completed activity, ascending, no duplicates. */
export function getActiveDates(events: readonly ActivityEvent[]): string[] {
  return [...new Set(events.map(e => e.date))].sort();
}

export function getLatestActivity(events: readonly ActivityEvent[]): ActivityEvent | null {
  let latest: ActivityEvent | null = null;
  for (const e of events) if (!latest || e.timestamp > latest.timestamp) latest = e;
  return latest;
}

export interface DailyActivityProgress {
  date: string;
  /** At least one genuinely completed activity today. */
  isActive: boolean;
  count: number;
  activities: ActivityEvent[];
  /** Distinct types completed, in first-completed order. */
  types: ActivityType[];
  pillars: ActivityPillar[];
  latest: ActivityEvent | null;
}

export function getDailyProgress(events: readonly ActivityEvent[], date: string): DailyActivityProgress {
  const activities = getActivitiesOnDate(events, date).sort((a, b) => a.timestamp - b.timestamp);
  return {
    date,
    isActive: activities.length > 0,
    count: activities.length,
    activities,
    types: [...new Set(activities.map(a => a.type))],
    pillars: [...new Set(activities.map(a => ACTIVITY_PILLAR[a.type]))],
    latest: getLatestActivity(activities),
  };
}

export interface WeeklyActivitySummary {
  /** Monday of the current local week. */
  weekStart: string;
  activities: ActivityEvent[];
  activeDates: string[];
  activeDayCount: number;
  countsByType: Record<ActivityType, number>;
}

/** Monday→`date` of the week containing `date`. */
export function getWeeklySummary(events: readonly ActivityEvent[], date: string): WeeklyActivitySummary {
  const weekStart = getMondayISO(new Date(`${date}T12:00:00`));
  const weekEnd = addDaysISO(weekStart, 6);
  const activities = getActivitiesInRange(events, weekStart, weekEnd);
  const countsByType = Object.fromEntries(ACTIVITY_TYPES.map(t => [t, 0])) as Record<ActivityType, number>;
  for (const a of activities) countsByType[a.type] += 1;
  const activeDates = getActiveDates(activities);
  return { weekStart, activities, activeDates, activeDayCount: activeDates.length, countsByType };
}
