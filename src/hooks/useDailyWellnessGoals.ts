import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useActivityHistory } from '@/hooks/useActivity';
import { useWellnessStore } from '@/stores/useWellnessStore';
import { loadScreenBalanceStats } from '@/services/screenBalancePersistence';
import { todayISO, addDaysISO } from '@/utils/dateUtils';
import { getActivitiesOnDate, getActiveDates } from '@/utils/activityQueries';
import { trackDailyGoalCompleted } from '@/services/analytics';

export type DailyGoalId = 'eye_breaks' | 'screen_free' | 'eye_relax';

export type DailyGoal = {
  id: DailyGoalId;
  label: string;
  detail: string;
  current: number;
  target: number;
  done: boolean;
  routeHint: 'eye-break' | 'offline-reset' | 'eye-relax';
};

export type DailyWellnessGoals = {
  goals: DailyGoal[];
  completedCount: number;
  totalCount: number;
  percent: number;
  allDone: boolean;
  /** Consecutive local calendar days with ≥1 real activity, ending today or yesterday. */
  consecutiveActiveDays: number;
  /** Last 7 days ending today, oldest first. */
  weekDays: WeekDay[];
  ready: boolean;
};

export type WeekDay = {
  date: string;
  /** Single-letter weekday name for this date. */
  label: string;
  /** True if that day had any completed activity. */
  active: boolean;
};

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Sends `daily_goal_completed` once per goal per day, across app restarts. */
async function trackNewlyCompletedGoals(
  uid: string | undefined,
  date: string,
  doneIds: string[],
): Promise<void> {
  const key = `@mindpulse/daily-goals-tracked:${uid ?? 'guest'}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    const stored = raw ? (JSON.parse(raw) as { date: string; ids: string[] }) : null;
    const alreadyTracked = stored?.date === date ? stored.ids : [];
    const fresh = doneIds.filter(id => !alreadyTracked.includes(id));
    if (fresh.length === 0) return;
    await AsyncStorage.setItem(key, JSON.stringify({ date, ids: [...alreadyTracked, ...fresh] }));
    fresh.forEach(trackDailyGoalCompleted);
  } catch {
    // Analytics only — never affects the goals themselves.
  }
}

/**
 * Real daily goals from the unified activity log — never invents completions.
 * Screen-free uses offline/move resets recorded via Screen Balance.
 */
export function useDailyWellnessGoals(): DailyWellnessGoals {
  const { user } = useAuth();
  const { events, ready } = useActivityHistory();
  const streak = useWellnessStore(s => s.streak);
  const today = todayISO();
  const [screenFreeResets, setScreenFreeResets] = useState(0);

  // Offline and move resets aren't in the activity log, so re-read the stats
  // whenever Home regains focus after one of those screens.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadScreenBalanceStats(user?.uid).then(stats => {
        if (!cancelled) setScreenFreeResets(stats.screenFreeResetsToday);
      });
      return () => {
        cancelled = true;
      };
    }, [user?.uid]),
  );

  const todayEvents = useMemo(
    () => getActivitiesOnDate(events, today),
    [events, today],
  );

  const eyeBreaks = todayEvents.filter(e => e.type === 'EYE_BREAK_COMPLETED').length;
  const eyeRelax = todayEvents.filter(e => e.type === 'EYE_RESET_COMPLETED').length;
  const focusBlocks = todayEvents.filter(e => e.type === 'FOCUS_SESSION_COMPLETED').length;
  const screenFree = screenFreeResets + focusBlocks;

  const goals: DailyGoal[] = [
    {
      id: 'eye_breaks',
      label: 'Eye breaks',
      detail: 'Complete 3 quick 20-20-20 breaks',
      current: Math.min(eyeBreaks, 3),
      target: 3,
      done: eyeBreaks >= 3,
      routeHint: 'eye-break',
    },
    {
      id: 'screen_free',
      label: 'Screen-free break',
      detail: 'One Focus block or offline reset',
      current: Math.min(screenFree, 1),
      target: 1,
      done: screenFree >= 1,
      routeHint: 'offline-reset',
    },
    {
      id: 'eye_relax',
      label: 'Guided eye session',
      detail: 'Finish one Eye Reset / guided relax',
      current: Math.min(eyeRelax, 1),
      target: 1,
      done: eyeRelax >= 1,
      routeHint: 'eye-relax',
    },
  ];

  const completedCount = goals.filter(g => g.done).length;
  const totalCount = goals.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  const doneGoalIds = goals.filter(g => g.done).map(g => g.id).join(',');

  useEffect(() => {
    if (!ready || !doneGoalIds) return;
    void trackNewlyCompletedGoals(user?.uid, today, doneGoalIds.split(','));
  }, [ready, doneGoalIds, today, user?.uid]);

  const consecutiveActiveDays = useMemo(() => {
    const active = getActiveDates(events);
    if (active.length === 0) return 0;
    // Prefer wellness streak when it's already computed from the same log.
    if (streak > 0) return streak;
    let count = 0;
    let cursor = today;
    const set = new Set(active);
    // Allow streak to still count if yesterday was last active (today empty).
    if (!set.has(today)) {
      cursor = addDaysISO(today, -1);
      if (!set.has(cursor)) return 0;
    }
    while (set.has(cursor)) {
      count += 1;
      cursor = addDaysISO(cursor, -1);
    }
    return count;
  }, [events, streak, today]);

  const weekDays = useMemo(() => {
    const set = new Set(getActiveDates(events));
    const days: WeekDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = addDaysISO(today, -i);
      const weekday = new Date(`${date}T12:00:00`).getDay();
      days.push({ date, label: WEEKDAY_LETTERS[weekday], active: set.has(date) });
    }
    return days;
  }, [events, today]);

  return {
    goals,
    completedCount,
    totalCount,
    percent,
    allDone: completedCount === totalCount,
    consecutiveActiveDays,
    weekDays,
    ready,
  };
}
