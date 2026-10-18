import { useCallback, useEffect, useState } from 'react';
import {
  checkAndNotifyScreenTimeTrend,
  getScreenTimeAlertEnabled,
  requestScreenTimeAlertPermission,
  setScreenTimeAlertEnabled,
} from '@/services/screenTimeTrendAlerts';

/** Settings-screen toggle for the weekly screen-time trend alert. Mirrors
 * useEveningReminderSetting's shape/conventions: permission is only ever
 * requested here, from an explicit user action — never from a background sync. */
export function useScreenTimeAlertSetting(uid?: string) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getScreenTimeAlertEnabled(uid).then((val) => {
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
        const granted = await requestScreenTimeAlertPermission();
        if (!granted) return; // permission denied — leave the switch off
        setEnabled(true);
        await setScreenTimeAlertEnabled(uid, true);
        void checkAndNotifyScreenTimeTrend(uid); // today's data may already qualify
      } else {
        setEnabled(false);
        await setScreenTimeAlertEnabled(uid, false);
      }
    },
    [uid],
  );

  return { enabled, loading, toggle };
}
