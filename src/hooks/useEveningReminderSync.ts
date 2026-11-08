import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import {
  cancelEveningReminderForDate,
  ensureEveningReminderScheduled,
} from '@/services/eveningReminder';
import { useDailyActivityProgress } from '@/hooks/useActivity';
import { todayISO } from '@/utils/dateUtils';

/**
 * Keeps the evening reminder rolling window filled, and cancels *only today's*
 * reminder once the user completes any real activity. Upcoming days stay
 * scheduled so the habit loop survives days without opening the app.
 */
export function useEveningReminderSync(): void {
  const { user } = useAuth();
  const uid = user?.uid;
  const { isActive: completedToday, ready } = useDailyActivityProgress();

  const sync = () => {
    if (!ready) return;
    if (completedToday) {
      void cancelEveningReminderForDate(uid, todayISO()).then(() =>
        ensureEveningReminderScheduled(uid),
      );
    } else {
      void ensureEveningReminderScheduled(uid);
    }
  };

  useEffect(sync, [completedToday, ready, uid]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') sync();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedToday, ready, uid]);
}
