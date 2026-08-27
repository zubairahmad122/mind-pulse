import { useCallback, useEffect, useState } from 'react';
import type { SleepSchedule } from '@/types/sleep.types';
import {
  ensureDigitalSunsetScheduled,
  loadDigitalSunsetSummary,
  setDigitalSunsetEnabled,
  setDigitalSunsetOffset,
  type DigitalSunsetOffsetMinutes,
  type DigitalSunsetSummary,
} from '@/services/digitalSunset';

export function useDigitalSunsetSetting(uid?: string, sleepSchedule?: SleepSchedule | null) {
  const [summary, setSummary] = useState<DigitalSunsetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await loadDigitalSunsetSummary(uid, sleepSchedule);
    setSummary(next);
    setLoading(false);
  }, [sleepSchedule, uid]);

  useEffect(() => {
    let cancelled = false;
    void loadDigitalSunsetSummary(uid, sleepSchedule).then(next => {
      if (cancelled) return;
      setSummary(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sleepSchedule, uid]);

  useEffect(() => {
    if (!sleepSchedule) return;
    void ensureDigitalSunsetScheduled(uid, sleepSchedule);
  }, [sleepSchedule, uid]);

  const toggle = useCallback(
    async (next: boolean) => {
      setLoading(true);
      await setDigitalSunsetEnabled(uid, next, sleepSchedule);
      await refresh();
    },
    [refresh, sleepSchedule, uid],
  );

  const setOffset = useCallback(
    async (offsetMinutes: DigitalSunsetOffsetMinutes) => {
      setLoading(true);
      await setDigitalSunsetOffset(uid, offsetMinutes, sleepSchedule);
      await refresh();
    },
    [refresh, sleepSchedule, uid],
  );

  return { summary, loading, refresh, toggle, setOffset };
}
