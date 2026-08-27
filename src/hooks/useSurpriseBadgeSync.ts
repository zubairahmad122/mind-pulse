import { useEffect, useRef } from 'react';
import { useProgressStore } from '@/stores/useProgressStore';
import { useWellnessStore } from '@/stores/useWellnessStore';
import { todayISO } from '@/utils/dateUtils';

/**
 * Detects two "surprise" achievements that can't be computed from live state
 * alone, since their trigger (today's session flags, time-of-completion)
 * doesn't persist past its own day — so this records them into
 * useWellnessStore the moment they happen:
 *
 *  - Perfect Day: all 4 pillars (eye, sleep, mind, relax) completed today.
 *  - Night Owl: a session was just completed between local midnight and 4am.
 *
 * Mounted once, globally, alongside useStreakSync.
 */
export function useSurpriseBadgeSync(): void {
  const todayDate = useProgressStore((s) => s.todayDate);
  const todaySessions = useProgressStore((s) => s.todaySessions);
  const totalCompleted = useProgressStore(
    (s) =>
      s.eyeExercisesCompleted +
      s.eyeGamesPlayed +
      s.relaxSessionsCompleted +
      s.mindSessionsCompleted +
      s.sleepSessionsTracked,
  );
  const recordPerfectDayIfApplicable = useWellnessStore((s) => s.recordPerfectDayIfApplicable);
  const recordNightOwlIfApplicable = useWellnessStore((s) => s.recordNightOwlIfApplicable);

  const prevTotalRef = useRef(totalCompleted);

  useEffect(() => {
    if (todayDate === todayISO()) {
      const eyeDone = todaySessions.eye || todaySessions.eyeGames;
      if (eyeDone && todaySessions.relax && todaySessions.mind && todaySessions.sleep) {
        recordPerfectDayIfApplicable();
      }
    }

    // Only treat this as a genuine "just completed a session" event — not
    // merely opening the app while totalCompleted happens to already be
    // whatever it was from a prior day's session.
    if (totalCompleted > prevTotalRef.current) {
      const hour = new Date().getHours();
      if (hour >= 0 && hour < 4) recordNightOwlIfApplicable();
    }
    prevTotalRef.current = totalCompleted;
  }, [todayDate, todaySessions, totalCompleted, recordPerfectDayIfApplicable, recordNightOwlIfApplicable]);
}
