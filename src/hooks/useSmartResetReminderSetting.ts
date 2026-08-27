import { useCallback, useEffect, useState } from 'react';
import {
  getSmartResetRemindersSetting,
  setSmartResetRemindersSetting,
} from '@/services/smartResetReminders';

export function useSmartResetReminderSetting(uid?: string) {
  const [enabled, setEnabled] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [usageAccessGranted, setUsageAccessGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const status = await getSmartResetRemindersSetting();
    setEnabled(Boolean(status?.enabled && status.notificationsGranted));
    setNotificationsGranted(Boolean(status?.notificationsGranted));
    setUsageAccessGranted(Boolean(status?.usageAccessGranted));
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getSmartResetRemindersSetting().then(status => {
      if (cancelled) return;
      setEnabled(Boolean(status?.enabled && status.notificationsGranted));
      setNotificationsGranted(Boolean(status?.notificationsGranted));
      setUsageAccessGranted(Boolean(status?.usageAccessGranted));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(
    async (next: boolean) => {
      setLoading(true);
      const active = await setSmartResetRemindersSetting(uid, next);
      await refresh();
      setEnabled(active);
      setLoading(false);
    },
    [refresh, uid],
  );

  return { enabled, loading, notificationsGranted, usageAccessGranted, refresh, toggle };
}
