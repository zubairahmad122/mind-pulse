import { useSleep } from '@/context/SleepContext';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import { calculateSleepScore, ScoreResult } from '@/utils/scoring';

export function useSleepScore(uid?: string, isAnonymous = true): ScoreResult & { loading: boolean } {
  const { sessions } = useSleep();
  const { schedule, loading } = useSleepSchedule(uid, isAnonymous);

  const result = calculateSleepScore({
    sessions,
    targetDurationHours: schedule?.duration ?? 7.5,
    targetBedtime: schedule?.bedtime ?? '23:00',
  });

  return { ...result, loading };
}
