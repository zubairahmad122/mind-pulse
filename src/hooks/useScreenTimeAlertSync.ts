import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { checkAndNotifyScreenTimeTrend } from '@/services/screenTimeTrendAlerts';

/**
 * Runs the weekly screen-time trend check on mount and on every
 * app-foreground — the check itself needs a fresh read of Android's Usage
 * Access data, so (unlike the evening reminder) this is a live check, not a
 * scheduled-ahead notification. Entirely a no-op if the user hasn't enabled
 * the alert, hasn't granted Usage Access, or was already notified today —
 * see screenTimeTrendAlerts.ts.
 */
export function useScreenTimeAlertSync(): void {
  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    void checkAndNotifyScreenTimeTrend(uid);
  }, [uid]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkAndNotifyScreenTimeTrend(uid);
    });
    return () => sub.remove();
  }, [uid]);
}
