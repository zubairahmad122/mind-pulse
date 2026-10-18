import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { syncFocusDnd } from '@/services/focusDndSync';

/**
 * Safety net, not the primary trigger — `useFocusBlockSession` already
 * flips DND immediately on every start/pause/resume/end/complete while the
 * Focus screen is open. This re-checks on every app mount/foreground so
 * DND can never stay stuck on: the Focus screen's own auto-complete timer
 * only runs while that screen is mounted, so a session that finished while
 * the user was elsewhere in the app (or the app was closed) would
 * otherwise leave the phone silenced with nothing left to turn it back off.
 */
export function useFocusDndSync(): void {
  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    void syncFocusDnd(uid);
  }, [uid]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncFocusDnd(uid);
    });
    return () => sub.remove();
  }, [uid]);
}
