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

/** Maps EyeSessionType to the recovery-session ID shown in the UI. */
const SESSION_TYPE_TO_ID: Record<string, string> = {
  'cvs-protocol': 'cvs-protocol',
  'eye-reset': 'comet-trace',
};

const LOADING_RESULT: ScoreResult = {
  score: 0,
  breakdown: [],
  theme: { label: 'Calculating…', emoji: '…', color: '#8a8fa3' },
};

export function useEyeScore(uid?: string) {
  const [result, setResult] = useState<ScoreResult>(LOADING_RESULT);
  const [loading, setLoading] = useState(true);
  const [hasSessions, setHasSessions] = useState(false);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [gamePlayedToday, setGamePlayedToday] = useState(false);

  const compute = useCallback(async () => {
    setLoading(true);
    try {
      const [sessions, breaksTaken, gameToday, breakEnforcerEnabled] = await Promise.all([
        loadEyeSessions(uid),
        getBreaksTaken(uid),
        getGamePlayedToday(uid),
        getEyeBreakEnforcerEnabled(uid),
      ]);

      const today = todayKey();
      const todaysSessions = sessions.filter(s => s.dateKey === today);
      const recoverySessionsToday = todaysSessions.length;
      const hasAnySessions = sessions.length > 0;

      // IDs of recovery sessions completed today (e.g. ['cvs-protocol', 'comet-trace'])
      const todayIds = [...new Set(todaysSessions.map(s => SESSION_TYPE_TO_ID[s.type] ?? s.type))];

      setResult(calculateEyeScore({
        breaksTaken,
        recoverySessionsToday,
        gamePlayedToday: gameToday,
        breakEnforcerEnabled,
      }));
      setHasSessions(hasAnySessions);
      setCompletedToday(todayIds);
      setGamePlayedToday(gameToday);
    } catch {
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

  return { ...result, loading, refresh: compute, hasAnySessions: hasSessions, completedToday, gamePlayedToday };
}
