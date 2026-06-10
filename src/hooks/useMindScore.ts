import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { loadStressSettings } from '@/services/mindScorePersistence';
import { calculateMindScore, mindScoreTheme } from '@/utils/mindScoreCalculator';

const DEFAULT_STRESS_LEVEL = 3;

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}
function isToday(ts: number): boolean {
  const d = new Date(ts);
  return d.toLocaleDateString('sv') === todayKey();
}

interface MindScoreResult {
  score: number;
  theme: ReturnType<typeof mindScoreTheme>;
  loading: boolean;
  reasons: string[];
}

export function useMindScore(uid?: string): MindScoreResult {
  const [result, setResult] = useState<MindScoreResult>({
    score: 55,
    theme: mindScoreTheme(55),
    loading: true,
    reasons: ['Loading…'],
  });

  useEffect(() => {
    let cancelled = false;

    // Load all data sources in parallel
    loadStressSettings(uid).then(settings => {
      if (cancelled) return;

      const stressLevel = settings?.lastStressLevel ?? DEFAULT_STRESS_LEVEL;
      const lastLoggedAt = settings?.lastStressLoggedAt ?? 0;
      const hoursAgo = lastLoggedAt > 0 ? (Date.now() - lastLoggedAt) / (1000 * 60 * 60) : 48;

      // Count today's stress relief sessions from local storage
      const recoveryKey = `@mindpulse/recovery:${uid ?? 'guest'}`;

      Promise.all([
        AsyncStorage.getItem(recoveryKey),
        AsyncStorage.getItem(`@mindpulse/journal:${uid ?? 'guest'}`),
      ]).then(([recoveryRaw, journalRaw]) => {
        if (cancelled) return;

        // Count recovery sessions done today
        let recoveryToday = 0;
        let audioToday = 0;
        if (recoveryRaw) {
          try {
            const sessions: Array<{ completedAt: number; type?: string }> = JSON.parse(recoveryRaw);
            recoveryToday = sessions.filter(s => isToday(s.completedAt)).length;
          } catch { /* ignore */ }
        }

        // Count journal entries
        let journalToday = 0;
        let hasJournalStreak3 = false;
        if (journalRaw) {
          try {
            const entries: Array<{ date: string }> = JSON.parse(journalRaw);
            journalToday = entries.filter(e => {
              const d = new Date(e.date);
              return d.toLocaleDateString('sv') === todayKey();
            }).length;
            // Check for 3+ day journal streak
            if (entries.length >= 3) {
              const dates = [...new Set(entries.map(e => {
                const d = new Date(e.date);
                return d.toLocaleDateString('sv');
              }))].sort().reverse();
              hasJournalStreak3 = dates.length >= 3 && dates[0] === todayKey();
            }
          } catch { /* ignore */ }
        }

        const score = calculateMindScore({
          stressLevel,
          recoverySessionsToday: recoveryToday,
          lastRelaxSessionHoursAgo: hoursAgo,
          journalEntriesToday: journalToday,
          audioSessionsToday: audioToday,
          hasJournalStreak3,
        });

        const reasons: string[] = [];
        if (stressLevel >= 4) reasons.push('High stress reported');
        if (hoursAgo > 12) reasons.push('Last relaxation was >12h ago');
        if (recoveryToday > 0) reasons.push(`${recoveryToday} session${recoveryToday > 1 ? 's' : ''} done today`);
        if (journalToday > 0) reasons.push(`${journalToday} journal entr${journalToday > 1 ? 'ies' : 'y'} today`);
        if (hasJournalStreak3) reasons.push('Journal streak ≥3 days');
        if (reasons.length === 0) reasons.push('No recent activity — use stress relief to improve');

        setResult({
          score,
          theme: mindScoreTheme(score),
          loading: false,
          reasons,
        });
      });
    });

    return () => { cancelled = true; };
  }, [uid]);

  return result;
}
