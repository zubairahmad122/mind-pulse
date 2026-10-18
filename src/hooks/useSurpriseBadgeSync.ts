import { useEffect } from 'react';
import { useDailyActivityProgress } from '@/hooks/useActivity';
import { useWellnessStore } from '@/stores/useWellnessStore';

/** A completion only counts as "just happened" for Night Owl within this window. */
const JUST_COMPLETED_MS = 60_000;

/**
 * Detects two "surprise" achievements that can't be computed from live state
 * alone, and records them into useWellnessStore the moment they happen:
 *
 *  - Perfect Day: Eye, Relax, Mind and Sleep activities all completed today.
 *  - Night Owl: an activity was just completed between local midnight and 4am.
 *
 * Both read the unified activity log. Mounted once, globally, alongside useStreakSync.
 */
export function useSurpriseBadgeSync(): void {
  const { pillars, latest, ready } = useDailyActivityProgress();
  const recordPerfectDayIfApplicable = useWellnessStore((s) => s.recordPerfectDayIfApplicable);
  const recordNightOwlIfApplicable = useWellnessStore((s) => s.recordNightOwlIfApplicable);

  const perfectDay =
    pillars.includes('eye') &&
    pillars.includes('relax') &&
    pillars.includes('mind') &&
    pillars.includes('sleep');

  useEffect(() => {
    if (ready && perfectDay) recordPerfectDayIfApplicable();
  }, [ready, perfectDay, recordPerfectDayIfApplicable]);

  // Only a genuinely fresh completion — not merely opening the app at 2am
  // while an earlier-today activity happens to be the latest one.
  const latestTimestamp = latest?.timestamp ?? null;
  useEffect(() => {
    if (latestTimestamp == null || Date.now() - latestTimestamp > JUST_COMPLETED_MS) return;
    const hour = new Date(latestTimestamp).getHours();
    if (hour >= 0 && hour < 4) recordNightOwlIfApplicable();
  }, [latestTimestamp, recordNightOwlIfApplicable]);
}
