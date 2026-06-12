import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { loadStressSettings } from '@/services/mindScorePersistence';
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

        const recoveryKey = `@mindpulse/recovery:${uid ?? 'guest'}`;
        const journalKey = `@mindpulse/journal:${uid ?? 'guest'}`;
        const [recoveryRaw, journalRaw] = await Promise.all([
          AsyncStorage.getItem(recoveryKey),
          AsyncStorage.getItem(journalKey),
        ]);

        if (recoveryRaw) {
          try {
            const sessions: { completedAt: number }[] = JSON.parse(recoveryRaw);
            recoveryToday = sessions.filter(s => isToday(s.completedAt)).length;
          } catch { /* ignore */ }
        }

        if (journalRaw) {
          try {
            const entries: { date: string }[] = JSON.parse(journalRaw);
            const dateKeys = entries.map(e => new Date(e.date).toLocaleDateString('sv'));
            journalToday = dateKeys.filter(d => d === todayKey()).length;
            journalStreakDays = consecutiveDayStreak(dateKeys);
          } catch { /* ignore */ }
        }
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
