import { useCallback, useEffect, useState } from 'react';
import {
  getBreaksTaken,
  getGamePlayedToday,
} from '@/services/dailyEyeGoalsPersistence';
import {
  getEyeBreakEnforcerEnabled,
  loadEyeSessions,
} from '@/services/eyeProgressPersistence';
import { calculateEyeScore, ScoreResult } from '@/utils/scoring';

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}

const LOADING_RESULT: ScoreResult = {
  score: 0,
  breakdown: [],
  theme: { label: 'Calculating…', emoji: '…', color: '#8a8fa3' },
};

export function useEyeScore(uid?: string) {
  const [result, setResult] = useState<ScoreResult>(LOADING_RESULT);
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    setLoading(true);
    try {
      const [sessions, breaksTaken, gamePlayedToday, breakEnforcerEnabled] = await Promise.all([
        loadEyeSessions(uid),
        getBreaksTaken(uid),
        getGamePlayedToday(uid),
        getEyeBreakEnforcerEnabled(uid),
      ]);

      const today = todayKey();
      const recoverySessionsToday = sessions.filter(s => s.dateKey === today).length;

      setResult(calculateEyeScore({
        breaksTaken,
        recoverySessionsToday,
        gamePlayedToday,
        breakEnforcerEnabled,
      }));
    } catch {
      // data unavailable — fall back to a real "no activity yet" score
      // instead of leaving the permanent "Calculating…" placeholder
      setResult(calculateEyeScore({
        breaksTaken: 0,
        recoverySessionsToday: 0,
        gamePlayedToday: false,
        breakEnforcerEnabled: false,
      }));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { void compute(); }, [compute]);

  return { ...result, loading, refresh: compute };
}
