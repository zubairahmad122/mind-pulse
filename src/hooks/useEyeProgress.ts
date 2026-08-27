import { useCallback, useEffect, useState } from 'react';
import {
  EyeSessionType,
  loadEyeSessions,
  recordEyeCompletion,
} from '@/services/eyeProgressPersistence';

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}

function getWeekDots(completedKeys: Set<string>): boolean[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return completedKeys.has(d.toLocaleDateString('sv'));
  });
}

function calcStreak(sortedKeys: string[]): number {
  if (sortedKeys.length === 0) return 0;
  const today = todayKey();
  let streak = 0;
  let cursor = new Date();

  for (let i = 0; i < 365; i++) {
    const key = cursor.toLocaleDateString('sv');
    if (sortedKeys.includes(key)) {
      streak++;
    } else if (i === 0 && key !== today) {
      break;
    } else if (i === 0) {
      // today not done yet, streak still counts yesterday
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export interface EyeProgressState {
  todayDone: boolean;
  streak: number;
  weekDots: boolean[];
  loading: boolean;
  recordCompletion: (type: EyeSessionType) => Promise<void>;
}

export function useEyeProgress(uid?: string): EyeProgressState {
  const [todayDone, setTodayDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [weekDots, setWeekDots] = useState<boolean[]>(Array(7).fill(false));
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sessions = await loadEyeSessions(uid);
      const uniqueDays = [...new Set(sessions.map(s => s.dateKey))].sort().reverse();
      const keySet = new Set(uniqueDays);

      setTodayDone(keySet.has(todayKey()));
      setStreak(calcStreak(uniqueDays));
      setWeekDots(getWeekDots(keySet));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const recordCompletion = useCallback(
    async (type: EyeSessionType) => {
      await recordEyeCompletion(uid, type);
      await load();
    },
    [uid, load],
  );

  return { todayDone, streak, weekDots, loading, recordCompletion };
}
