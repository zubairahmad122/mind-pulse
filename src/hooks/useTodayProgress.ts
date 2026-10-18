import { useDailyActivityProgress, useActivityHistory } from '@/hooks/useActivity';
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
 * Eye (Eye Reset / Eye Break / Focus Switch), Mind (Mind game, Relax session
 * or Focus block), Sleep (a saved sleep session) — for the Home "Today's
 * Journey" hero. Every step except check-in comes from the unified activity
 * log; checking in alone does not count toward the streak.
 */
export function useTodayProgress(): TodayProgress {
  const checkedInDate = useProgressStore((s) => s.checkedInDate);
  // Counters written before the unified log existed — read only so returning
  // users aren't treated as brand new; nothing increments them any more.
  const legacyCompletedAny = useProgressStore((s) =>
    s.eyeExercisesCompleted > 0 ||
    s.eyeGamesPlayed > 0 ||
    s.relaxSessionsCompleted > 0 ||
    s.mindSessionsCompleted > 0 ||
    s.sleepSessionsTracked > 0,
  );
  const { events } = useActivityHistory();
  const { pillars } = useDailyActivityProgress();

  const checkedIn = checkedInDate === todayISO();
  const eyeDone = pillars.includes('eye');
  const mindDone = pillars.includes('mind') || pillars.includes('relax') || pillars.includes('focus');
  const sleepDone = pillars.includes('sleep');
  const doneCount = [checkedIn, eyeDone, mindDone, sleepDone].filter(Boolean).length;

  return {
    percent: Math.round((doneCount / 4) * 100),
    doneCount,
    totalCount: 4,
    checkedIn,
    eyeDone,
    mindDone,
    sleepDone,
    everCompletedAny: events.length > 0 || legacyCompletedAny,
  };
}
