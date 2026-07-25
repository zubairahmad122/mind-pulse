import type { WellnessSnapshot } from '@/services/streakSync';
import { daysBetween } from '@/utils/dateUtils';

/** Keep in sync with useWellnessStore's ACTIVITY_LOG_LIMIT. */
const ACTIVITY_LOG_LIMIT = 370;

/**
 * Merges the local (AsyncStorage) and remote (Firestore) wellness snapshots
 * after a reinstall / new-device sign-in. Policy:
 *  - streak/lastActiveDate: whichever side is more recently active wins; a
 *    tie takes the higher streak (both sides credited the same day).
 *  - longestStreak: always the max of both — never regress a lifetime best.
 *  - activityLog: set-union of both logs, sorted, capped.
 *  - freeze bookkeeping travels with whichever side won the streak/date,
 *    since it's only meaningful paired with that day.
 */
export function mergeWellnessSnapshots(
  local: WellnessSnapshot,
  remote: WellnessSnapshot,
): WellnessSnapshot {
  const winner = pickMoreRecent(local, remote);

  const activityLog = [...new Set([...local.activityLog, ...remote.activityLog])]
    .sort()
    .slice(-ACTIVITY_LOG_LIMIT);

  return {
    streak: winner.streak,
    longestStreak: Math.max(local.longestStreak, remote.longestStreak),
    lastActiveDate: winner.lastActiveDate,
    streakFreezeAvailable: winner.streakFreezeAvailable,
    freezeWeekStart: winner.freezeWeekStart,
    activityLog,
  };
}

function pickMoreRecent(local: WellnessSnapshot, remote: WellnessSnapshot): WellnessSnapshot {
  if (!local.lastActiveDate) return remote;
  if (!remote.lastActiveDate) return local;

  const diff = daysBetween(local.lastActiveDate, remote.lastActiveDate); // remote - local, in days
  if (diff > 0) return remote;
  if (diff < 0) return local;
  // Same day on both sides (dates are equal) — take the higher streak.
  return remote.streak > local.streak ? remote : local;
}
