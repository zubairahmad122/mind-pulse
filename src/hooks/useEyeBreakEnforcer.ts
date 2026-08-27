import { useCallback, useEffect, useState } from 'react';
import {
  cancelEyeBreakReminders,
  ensureEyeBreakRemindersScheduled,
  scheduleEyeBreakReminders,
} from '@/services/eyeBreakNotification';
import {
  getEyeBreakEnforcerEnabled,
  setEyeBreakEnforcerEnabled,
} from '@/services/eyeProgressPersistence';
import {
  DEFAULT_EYE_BREAK_INTERVAL,
  DEFAULT_EYE_BREAK_SCHEDULE,
  loadEyeBreakInterval,
  loadEyeBreakSchedule,
  saveEyeBreakInterval,
  saveEyeBreakSchedule,
  type EyeBreakIntervalMinutes,
  type EyeBreakSchedule,
  type EyeBreakScheduleMode,
} from '@/services/eyeBreakReminderPreferences';

export function useEyeBreakEnforcer(uid?: string) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [intervalMinutes, setIntervalMinutes] = useState<EyeBreakIntervalMinutes>(
    DEFAULT_EYE_BREAK_INTERVAL,
  );
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [schedule, setSchedule] = useState<EyeBreakSchedule>(
    DEFAULT_EYE_BREAK_SCHEDULE,
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getEyeBreakEnforcerEnabled(uid),
      loadEyeBreakInterval(uid),
      loadEyeBreakSchedule(uid),
    ]).then(async ([storedEnabled, storedInterval, storedSchedule]) => {
      if (cancelled) return;
      setIntervalMinutes(storedInterval);
      setSchedule(storedSchedule);

      if (storedEnabled) {
        const scheduled = await ensureEyeBreakRemindersScheduled(
          uid,
          storedInterval,
          storedSchedule,
        );
        if (cancelled) return;
        setEnabled(scheduled);
        if (!scheduled) await setEyeBreakEnforcerEnabled(uid, false);
      } else {
        setEnabled(false);
      }
      if (!cancelled) {
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const toggle = useCallback(
    async (next: boolean) => {
      if (next) {
        const scheduled = await scheduleEyeBreakReminders(
          uid,
          intervalMinutes,
          true,
          schedule,
        );
        setEnabled(scheduled);
        setPermissionDenied(!scheduled);
        await setEyeBreakEnforcerEnabled(uid, scheduled);
      } else {
        setEnabled(false);
        setPermissionDenied(false);
        await setEyeBreakEnforcerEnabled(uid, false);
        await cancelEyeBreakReminders(uid);
      }
    },
    [uid, intervalMinutes, schedule],
  );

  const changeInterval = useCallback(
    async (minutes: EyeBreakIntervalMinutes) => {
      setIntervalMinutes(minutes);
      await saveEyeBreakInterval(uid, minutes);
      if (!enabled) return;

      const scheduled = await scheduleEyeBreakReminders(
        uid,
        minutes,
        false,
        schedule,
      );
      setEnabled(scheduled);
      if (!scheduled) await setEyeBreakEnforcerEnabled(uid, false);
    },
    [uid, enabled, schedule],
  );

  const changeScheduleMode = useCallback(
    async (mode: EyeBreakScheduleMode) => {
      const next: EyeBreakSchedule = mode === 'custom'
        ? { ...schedule, mode }
        : {
            ...schedule,
            mode,
            startHour: 9,
            endHour: 17,
            activeDays: mode === 'daily'
              ? [0, 1, 2, 3, 4, 5, 6]
              : [1, 2, 3, 4, 5],
          };
      setSchedule(next);
      await saveEyeBreakSchedule(uid, next);
      if (!enabled) return;

      const scheduled = await scheduleEyeBreakReminders(
        uid,
        intervalMinutes,
        false,
        next,
      );
      setEnabled(scheduled);
      if (!scheduled) await setEyeBreakEnforcerEnabled(uid, false);
    },
    [uid, enabled, intervalMinutes, schedule],
  );

  const changeSchedule = useCallback(
    async (next: EyeBreakSchedule) => {
      setSchedule(next);
      await saveEyeBreakSchedule(uid, next);
      if (!enabled) return;

      const scheduled = await scheduleEyeBreakReminders(
        uid,
        intervalMinutes,
        false,
        next,
      );
      setEnabled(scheduled);
      if (!scheduled) await setEyeBreakEnforcerEnabled(uid, false);
    },
    [uid, enabled, intervalMinutes],
  );

  return {
    enabled,
    loading,
    intervalMinutes,
    permissionDenied,
    schedule,
    toggle,
    changeInterval,
    changeScheduleMode,
    changeSchedule,
  };
}
