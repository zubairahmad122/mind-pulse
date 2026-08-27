import { useEffect } from 'react';
import { useProgressStore } from '@/stores/useProgressStore';
import { useWellnessStore } from '@/stores/useWellnessStore';
import { todayISO } from '@/utils/dateUtils';

/**
 * Keeps the unified app-wide streak (useWellnessStore) in sync with today's
 * completed sessions (useProgressStore). Runs on mount — so a missed day is
 * resolved (or grace-frozen) as soon as the app opens — and re-runs whenever
 * the user completes their first session of the day while the app stays open.
 */
export function useStreakSync(): void {
  const completedToday = useProgressStore((s) => {
    if (s.todayDate !== todayISO()) return false; // stale — not yet reset for today
    return Object.values(s.todaySessions).some(Boolean);
  });
  const checkAndUpdateStreak = useWellnessStore((s) => s.checkAndUpdateStreak);

  useEffect(() => {
    checkAndUpdateStreak(completedToday);
  }, [completedToday, checkAndUpdateStreak]);
}
