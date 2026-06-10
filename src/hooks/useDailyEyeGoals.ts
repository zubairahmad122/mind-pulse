import { useCallback, useEffect, useState } from 'react';
import {
  getBreaksTaken,
  getGamePlayedToday,
} from '@/services/dailyEyeGoalsPersistence';
import { loadEyeSessions } from '@/services/eyeProgressPersistence';

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}

export interface DailyEyeGoals {
  protocolDone: boolean;
  breaksTaken: number;
  gamePlayed: boolean;
  completedCount: number;
  recoveryPct: number;
  loading: boolean;
  reload: () => void;
}

export function useDailyEyeGoals(uid?: string): DailyEyeGoals {
  const [protocolDone, setProtocolDone] = useState(false);
  const [breaksTaken, setBreaksTaken] = useState(0);
  const [gamePlayed, setGamePlayed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [sessions, breaks, game] = await Promise.all([
      loadEyeSessions(uid),
      getBreaksTaken(uid),
      getGamePlayedToday(uid),
    ]);
    const today = todayKey();
    const hasProtocol = sessions.some(
      s =>
        s.dateKey === today &&
        (s.type === 'cvs-protocol' || s.type === 'eye-reset'),
    );
    setProtocolDone(hasProtocol);
    setBreaksTaken(breaks);
    setGamePlayed(game);
    setLoading(false);
  }, [uid]);

  useEffect(() => { void load(); }, [load]);

  const completedCount =
    (protocolDone ? 1 : 0) + (breaksTaken >= 3 ? 1 : 0) + (gamePlayed ? 1 : 0);
  const recoveryPct = Math.round((completedCount / 3) * 100);

  return {
    protocolDone,
    breaksTaken,
    gamePlayed,
    completedCount,
    recoveryPct,
    loading,
    reload: () => void load(),
  };
}
