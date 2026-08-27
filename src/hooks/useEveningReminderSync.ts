import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { cancelEveningReminder, ensureEveningReminderScheduled } from '@/services/eveningReminder';
import { useProgressStore } from '@/stores/useProgressStore';
import { todayISO } from '@/utils/dateUtils';

/**
 * Keeps the evening reminder in sync with today's completion state: cancels
 * it the moment any pillar is completed today, and (re-)arms it for today on
 * mount and on every app-foreground otherwise. Entirely a no-op if the user
 * hasn't enabled the reminder or hasn't granted notification permission —
 * see eveningReminder.ts.
 */
export function useEveningReminderSync(): void {
  const { user } = useAuth();
  const uid = user?.uid;

  const completedToday = useProgressStore((s) => {
    if (s.todayDate !== todayISO()) return false;
    return Object.values(s.todaySessions).some(Boolean);
  });

  const sync = () => {
    if (completedToday) {
      void cancelEveningReminder(uid);
    } else {
      void ensureEveningReminderScheduled(uid);
    }
  };

  useEffect(sync, [completedToday, uid]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedToday, uid]);
}
