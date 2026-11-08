import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { checkAndNotifyExcessiveUsage } from '@/services/excessiveUsageAlerts';

function runCheck(uid?: string): void {
  checkAndNotifyExcessiveUsage(uid).catch(err => {
    console.warn('[UsageAlerts] check failed', err);
  });
}

/** Runs excessive-usage checks on mount and every app foreground. */
export function useDailyUsageAlertSync(): void {
  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    runCheck(uid);
  }, [uid]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') runCheck(uid);
    });
    return () => sub.remove();
  }, [uid]);
}
