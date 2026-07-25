import { useEffect, useMemo, useState } from 'react';
import { ACHIEVEMENT_DEFINITIONS } from '@/constants';
import type { AchievementDefinition, AchievementExtras } from '@/constants/achievements';
import { useAuth } from '@/context/AuthContext';
import { useSleep } from '@/context/SleepContext';
import { useEyeProgress } from '@/hooks/useEyeProgress';
import { loadJournalDateKeys } from '@/services/journalPersistence';
import { loadRecoverySessionsToday } from '@/services/recoveryPersistence';
import { useWellnessStore } from '@/stores/useWellnessStore';
import { computeHasPerfectWeek } from '@/utils/achievementUtils';

/**
 * Real unlocked/locked achievement counts against ACHIEVEMENT_DEFINITIONS —
 * shared by AchievementsScreen and ChallengesScreen so both show the same
 * true count instead of two hand-rolled computations drifting apart.
 */
export function useUnlockedAchievements() {
  const { user } = useAuth();
  const { sessions } = useSleep();
  const { streak: eyeStreak } = useEyeProgress(user?.uid ?? undefined);
  const [extras, setExtras] = useState<AchievementExtras>({ eyeStreak: 0, recoveryToday: 0, totalJournalEntries: 0 });

  const everPerfectDay = useWellnessStore((s) => s.everPerfectDay);
  const everNightOwlSession = useWellnessStore((s) => s.everNightOwlSession);
  const everComeback = useWellnessStore((s) => s.everComeback);
  const activityLog = useWellnessStore((s) => s.activityLog);
  const hasPerfectWeek = useMemo(() => computeHasPerfectWeek(activityLog), [activityLog]);

  useEffect(() => {
    void Promise.all([
      loadRecoverySessionsToday(user?.uid),
      loadJournalDateKeys(user?.uid),
    ]).then(([recoveryToday, dateKeys]) => {
      setExtras(prev => ({ ...prev, recoveryToday, totalJournalEntries: dateKeys.length }));
    });
  }, [user?.uid]);

  const extrasWithEye: AchievementExtras = {
    ...extras,
    eyeStreak,
    everPerfectDay,
    everNightOwlSession,
    everComeback,
    hasPerfectWeek,
  };
  const earned: AchievementDefinition[] = ACHIEVEMENT_DEFINITIONS.filter(a => a.check(sessions, extrasWithEye));
  const locked: AchievementDefinition[] = ACHIEVEMENT_DEFINITIONS.filter(a => !a.check(sessions, extrasWithEye));
  const totalCount = ACHIEVEMENT_DEFINITIONS.length;
  const percent = totalCount > 0 ? (earned.length / totalCount) * 100 : 0;

  return { earned, locked, unlockedCount: earned.length, totalCount, percent };
}
