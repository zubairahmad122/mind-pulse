import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { ensureSmartResetReminderSchedule } from '@/services/smartResetReminders';

export function useSmartResetReminderSync(): void {
  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    void ensureSmartResetReminderSchedule(uid);
  }, [uid]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void ensureSmartResetReminderSchedule(uid);
    });
    return () => sub.remove();
  }, [uid]);
}
