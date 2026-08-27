import { useEffect, useState } from 'react';
import { loadJournalDateKeys } from '@/services/journalPersistence';
import { loadStressSettings } from '@/services/mindScorePersistence';
import { loadRecoverySessionsToday } from '@/services/recoveryPersistence';
import { calculateMindScore, consecutiveDayStreak, ScoreResult } from '@/utils/scoring';

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}
function isToday(ts: number): boolean {
  return new Date(ts).toLocaleDateString('sv') === todayKey();
}
function isStressLevelToday(loggedAt: number): boolean {
  return loggedAt > 0 && isToday(loggedAt);
}

const LOADING_RESULT: ScoreResult = {
  score: 0,
  breakdown: [],
  theme: { label: 'Calculating…', emoji: '…', color: '#8a8fa3' },
};

export function useMindScore(uid?: string) {
  const [result, setResult] = useState<ScoreResult>(LOADING_RESULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let stressLevel: number | null = null;
      let recoveryToday = 0;
      let journalToday = 0;
      let journalStreakDays = 0;

      try {
        const settings = await loadStressSettings(uid);
        stressLevel = settings && isStressLevelToday(settings.lastStressLoggedAt)
          ? settings.lastStressLevel
          : null;

        const [recoveryCount, dateKeys] = await Promise.all([
          loadRecoverySessionsToday(uid),
          loadJournalDateKeys(uid),
        ]);
        recoveryToday = recoveryCount;
        journalToday = dateKeys.filter(d => d === todayKey()).length;
        journalStreakDays = consecutiveDayStreak(dateKeys);
      } catch {
        // data unavailable — fall through with "no activity yet" defaults
      }

      if (cancelled) return;
      setResult(calculateMindScore({
        recoverySessionsToday: recoveryToday,
        journalEntriesToday: journalToday,
        journalStreakDays,
        stressLevel,
      }));
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [uid]);

  return { ...result, loading };
}
