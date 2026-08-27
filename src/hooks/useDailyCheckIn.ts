import { useEffect } from 'react';
import { trackAppOpen } from '@/services/analytics';
import { useProgressStore } from '@/stores/useProgressStore';

/**
 * Credits today's "checked in" step the moment the app is opened — a real,
 * repeatable endowed-progress credit (not a fake number), separate from the
 * 3 wellness pillars and from the streak, which still requires real activity.
 */
export function useDailyCheckIn(): void {
  const checkIn = useProgressStore((s) => s.checkIn);

  useEffect(() => {
    checkIn();
    trackAppOpen();
  }, [checkIn]);
}
