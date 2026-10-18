import { useEffect } from 'react';
import { useDailyActivityProgress } from '@/hooks/useActivity';
import { useWellnessStore } from '@/stores/useWellnessStore';

/**
 * Keeps the unified app-wide streak (useWellnessStore) in sync with the
 * unified activity log: a local calendar day with ONE OR MORE completed
 * activities of any type is one streak day (checkAndUpdateStreak credits each
 * day at most once, so extra activities never double-count). Runs on mount —
 * so a missed day is resolved (or grace-frozen) as soon as the app opens —
 * and again when the first activity of the day is recorded.
 *
 * Waits for the current account's log to load: a still-loading log must never
 * be read as "nothing done today".
 */
export function useStreakSync(): void {
  const { isActive, ready } = useDailyActivityProgress();
  const checkAndUpdateStreak = useWellnessStore((s) => s.checkAndUpdateStreak);

  useEffect(() => {
    if (!ready) return;
    checkAndUpdateStreak(isActive);
  }, [ready, isActive, checkAndUpdateStreak]);
}
