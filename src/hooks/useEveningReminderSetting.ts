import { useCallback, useEffect, useState } from 'react';
import {
  ensureEveningReminderScheduled,
  getEveningReminderEnabled,
  getEveningReminderPreference,
  requestEveningReminderPermission,
  setEveningReminderEnabled,
  setEveningReminderPreference,
} from '@/services/eveningReminder';

/** Settings-screen toggle for the evening loss-aversion reminder. Mirrors
 * useEyeBreakEnforcer's shape/conventions: permission is only ever requested
 * here, from an explicit user action — never from a background sync. */
export function useEveningReminderSetting(uid?: string) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preferredHour, setPreferredHour] = useState(19);
  const [preferredMinute, setPreferredMinute] = useState(30);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [val, pref] = await Promise.all([
        getEveningReminderEnabled(uid),
        getEveningReminderPreference(uid),
      ]);
      if (cancelled) return;
      setEnabled(val);
      setPreferredHour(pref.preferredHour);
      setPreferredMinute(pref.preferredMinute);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const toggle = useCallback(
    async (next: boolean) => {
      if (next) {
        const granted = await requestEveningReminderPermission();
        if (!granted) return; // permission denied — leave the switch off
        setEnabled(true);
        await setEveningReminderEnabled(uid, true);
        await ensureEveningReminderScheduled(uid);
      } else {
        setEnabled(false);
        await setEveningReminderEnabled(uid, false);
      }
    },
    [uid],
  );

  const setPreference = useCallback(
    async (hour: number, minute: number, customHoursEnabled: boolean) => {
      setPreferredHour(hour);
      setPreferredMinute(minute);
      await setEveningReminderPreference(uid, hour, minute, customHoursEnabled);
    },
    [uid],
  );

  return {
    enabled,
    loading,
    toggle,
    preferredHour,
    preferredMinute,
    setPreference,
  };
}
