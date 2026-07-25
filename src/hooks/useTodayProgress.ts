import { useProgressStore } from '@/stores/useProgressStore';
import { todayISO } from '@/utils/dateUtils';

export interface TodayProgress {
  /** 0, 25, 50, 75, or 100 — how much of today's 4-step goal is done. */
  percent: number;
  doneCount: number;
  totalCount: 4;
  checkedIn: boolean;
  eyeDone: boolean;
  mindDone: boolean;
  sleepDone: boolean;
  /** True if the user has ever completed a single real session, any pillar, any day. */
  everCompletedAny: boolean;
}

/**
 * Today's completion across 4 steps — Checked in (real: opening the app),
 * Eye, Mind (relax or mind session), Sleep — for the Home "Today's Journey"
 * hero. Checking in alone does not count toward the streak, which still
 * requires a real pillar session.
 */
export function useTodayProgress(): TodayProgress {
  const todaySessions = useProgressStore((s) => s.todaySessions);
  const todayDate = useProgressStore((s) => s.todayDate);
  const checkedInDate = useProgressStore((s) => s.checkedInDate);
  const everCompletedAny = useProgressStore((s) =>
    s.eyeExercisesCompleted > 0 ||
    s.eyeGamesPlayed > 0 ||
    s.relaxSessionsCompleted > 0 ||
    s.mindSessionsCompleted > 0 ||
    s.sleepSessionsTracked > 0,
  );

  const today = todayISO();
  const isToday = todayDate === today;
  const checkedIn = checkedInDate === today;
  const eyeDone = isToday && (todaySessions.eye || todaySessions.eyeGames);
  const mindDone = isToday && (todaySessions.relax || todaySessions.mind);
  const sleepDone = isToday && todaySessions.sleep;
  const doneCount = [checkedIn, eyeDone, mindDone, sleepDone].filter(Boolean).length;

  return {
    percent: Math.round((doneCount / 4) * 100),
    doneCount,
    totalCount: 4,
    checkedIn,
    eyeDone,
    mindDone,
    sleepDone,
    everCompletedAny,
  };
}
