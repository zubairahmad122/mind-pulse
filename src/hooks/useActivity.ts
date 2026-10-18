import { useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { activityOwnerKey } from '@/services/activityPersistence';
import { hydrateActivityLog, useActivityStore } from '@/stores/useActivityStore';
import type { ActivityEvent, ActivityType } from '@/types/activity.types';
import {
  getActiveDates,
  getDailyProgress,
  getLatestActivity,
  getWeeklySummary,
  hasCompletedOnDate,
  type DailyActivityProgress,
  type WeeklyActivitySummary,
} from '@/utils/activityQueries';
import { todayISO } from '@/utils/dateUtils';

const EMPTY: ActivityEvent[] = [];

/**
 * Keeps the activity store loaded for whoever is signed in. Mount once, in the
 * (app) layout, alongside the other global syncs.
 */
export function useActivitySync(): void {
  const { user } = useAuth();
  const uid = user?.uid;
  useEffect(() => {
    void hydrateActivityLog(uid);
  }, [uid]);
}

/**
 * The current account's completed activities (oldest → newest). `ready` is
 * false until that account's log has loaded — callers that act on "nothing
 * done today" (streak, reminders) must wait for it, so a still-loading log
 * is never mistaken for an inactive day.
 */
export function useActivityHistory(): { events: ActivityEvent[]; ready: boolean } {
  const { user } = useAuth();
  const ownerKey = activityOwnerKey(user?.uid);
  const storeOwner = useActivityStore(s => s.ownerKey);
  const hydrated = useActivityStore(s => s.hydrated);
  const events = useActivityStore(s => s.events);
  const isCurrent = storeOwner === ownerKey;
  return { events: isCurrent ? events : EMPTY, ready: isCurrent && hydrated };
}

/** Today's progress: active?, count, which types/pillars, latest. */
export function useDailyActivityProgress(): DailyActivityProgress & { ready: boolean } {
  const { events, ready } = useActivityHistory();
  const today = todayISO();
  return useMemo(() => ({ ...getDailyProgress(events, today), ready }), [events, ready, today]);
}

/** Current local week (Monday → today): activities, active days, counts by type. */
export function useWeeklyActivity(): WeeklyActivitySummary & { ready: boolean } {
  const { events, ready } = useActivityHistory();
  const today = todayISO();
  return useMemo(() => ({ ...getWeeklySummary(events, today), ready }), [events, ready, today]);
}

/** Most recent completed activity, any type. */
export function useLatestActivity(): ActivityEvent | null {
  const { events } = useActivityHistory();
  return useMemo(() => getLatestActivity(events), [events]);
}

/** Every local day with at least one completed activity, ascending. */
export function useActiveDates(): string[] {
  const { events } = useActivityHistory();
  return useMemo(() => getActiveDates(events), [events]);
}

/** Whether `type` (optionally narrowed by `predicate`) was completed today. */
export function useHasCompletedToday(
  type: ActivityType,
  predicate?: (event: ActivityEvent) => boolean,
): boolean {
  const { events } = useActivityHistory();
  return hasCompletedOnDate(events, type, todayISO(), predicate);
}
