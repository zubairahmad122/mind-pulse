import { useCallback, useEffect, useRef, useState } from 'react';
import {
  bucketScreenMinutes,
  cancelCompanionReminders,
  companionIntervalMinutes,
  DEFAULT_COMPANION_PREFS,
  loadCompanionPrefs,
  saveCompanionPrefs,
  scheduleCompanionReminder,
  type DesktopCompanionPrefs,
} from '@/services/desktopCompanion';
import {
  saveScreenHabitRecord,
  type ScreenSessionContext,
} from '@/services/eyeScreenHabitPersistence';

/**
 * Owns the Desktop Eye Companion session: persisted preferences, the
 * timestamp-based session clock (freeze-safe), the reminder notification
 * lifecycle, and the screen-habit record saved when the session ends.
 */
export function useDesktopCompanion(uid?: string) {
  const [prefs, setPrefs] = useState<DesktopCompanionPrefs>(DEFAULT_COMPANION_PREFS);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState(0);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const [sessionNow, setSessionNow] = useState(0);
  const [notificationDenied, setNotificationDenied] = useState(false);
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);

  // Mirror of `prefs` for use inside callbacks without stale closures.
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const savedLabelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (savedLabelTimer.current) clearTimeout(savedLabelTimer.current);
  }, []);

  useEffect(() => {
    let active = true;
    void loadCompanionPrefs(uid).then(loaded => {
      if (!active) return;
      setPrefs(loaded);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const update = useCallback(
    (patch: Partial<DesktopCompanionPrefs>) => {
      setPrefs(current => {
        const next = { ...current, ...patch };
        void saveCompanionPrefs(uid, next);
        return next;
      });
    },
    [uid],
  );

  // Tick while a session is actively running (not paused).
  useEffect(() => {
    if (!sessionActive || paused) return;
    const timer = setInterval(() => setSessionNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sessionActive, paused]);

  const intervalSeconds = companionIntervalMinutes(prefs) * 60;
  const elapsedSeconds = sessionActive
    ? accumulatedSeconds +
      (paused ? 0 : Math.max(0, Math.floor((sessionNow - sessionStartedAt) / 1000)))
    : 0;
  const nextBreakInSeconds = intervalSeconds - (elapsedSeconds % intervalSeconds);

  const start = useCallback(
    async (activity: ScreenSessionContext) => {
      const fresh = Date.now();
      const nextPrefs = { ...prefsRef.current, lastActivity: activity };
      setPrefs(nextPrefs);
      void saveCompanionPrefs(uid, nextPrefs);

      setSessionStartedAt(fresh);
      setSessionNow(fresh);
      setAccumulatedSeconds(0);
      setPaused(false);
      setSessionActive(true);
      setLastSavedLabel(null);

      const granted = await scheduleCompanionReminder(uid, nextPrefs);
      setNotificationDenied(!granted);
    },
    [uid],
  );

  const pause = useCallback(async () => {
    if (!sessionActive || paused) return;
    const banked = Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000));
    setAccumulatedSeconds(current => current + banked);
    setPaused(true);
    await cancelCompanionReminders(uid);
  }, [sessionActive, paused, sessionStartedAt, uid]);

  const resume = useCallback(async () => {
    if (!sessionActive || !paused) return;
    const fresh = Date.now();
    setSessionStartedAt(fresh);
    setSessionNow(fresh);
    setPaused(false);
    // Remind again with only the remaining time to the next break.
    const remaining = intervalSeconds - (accumulatedSeconds % intervalSeconds);
    const granted = await scheduleCompanionReminder(uid, prefsRef.current, remaining);
    setNotificationDenied(!granted);
  }, [sessionActive, paused, accumulatedSeconds, intervalSeconds, uid]);

  const end = useCallback(async () => {
    const elapsedMin = Math.round(elapsedSeconds / 60);
    const context = prefsRef.current.lastActivity ?? 'work';
    void saveScreenHabitRecord(uid, {
      context,
      continuousMinutes: bucketScreenMinutes(elapsedMin),
    });
    await cancelCompanionReminders(uid);

    setSessionActive(false);
    setPaused(false);
    setSessionStartedAt(0);
    setAccumulatedSeconds(0);
    setSessionNow(0);
    setNotificationDenied(false);

    const label = `${bucketScreenMinutes(elapsedMin)} min screen session saved`;
    setLastSavedLabel(label);
    if (savedLabelTimer.current) clearTimeout(savedLabelTimer.current);
    savedLabelTimer.current = setTimeout(() => setLastSavedLabel(null), 3500);
  }, [elapsedSeconds, uid]);

  return {
    prefs,
    loading,
    update,
    intervalMinutes: companionIntervalMinutes(prefs),
    sessionActive,
    paused,
    elapsedSeconds,
    nextBreakInSeconds,
    notificationDenied,
    lastSavedLabel,
    start,
    pause,
    resume,
    end,
  };
}
