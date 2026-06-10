import { useCallback, useEffect, useState } from 'react';
import {
  cancelEyeBreakReminders,
  scheduleEyeBreakReminders,
} from '@/services/eyeBreakNotification';
import {
  getEyeBreakEnforcerEnabled,
  setEyeBreakEnforcerEnabled,
} from '@/services/eyeProgressPersistence';

export function useEyeBreakEnforcer(uid?: string) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getEyeBreakEnforcerEnabled(uid).then(val => {
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
      setEnabled(next);
      await setEyeBreakEnforcerEnabled(uid, next);
      if (next) {
        await scheduleEyeBreakReminders(uid);
      } else {
        await cancelEyeBreakReminders(uid);
      }
    },
    [uid],
  );

  return { enabled, loading, toggle };
}
