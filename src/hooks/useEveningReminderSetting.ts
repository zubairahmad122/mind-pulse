import { useCallback, useEffect, useState } from 'react';
import {
  ensureEveningReminderScheduled,
  getEveningReminderEnabled,
  requestEveningReminderPermission,
  setEveningReminderEnabled,
} from '@/services/eveningReminder';

/** Settings-screen toggle for the evening loss-aversion reminder. Mirrors
 * useEyeBreakEnforcer's shape/conventions: permission is only ever requested
 * here, from an explicit user action — never from a background sync. */
export function useEveningReminderSetting(uid?: string) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getEveningReminderEnabled(uid).then((val) => {
      if (!cancelled) {
        setEnabled(val);
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

  return { enabled, loading, toggle };
}
