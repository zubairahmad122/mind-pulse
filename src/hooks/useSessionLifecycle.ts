import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export interface SessionLifecycleCallbacks {
  /**
   * Fired the moment the app backgrounds or the phone locks while a session
   * is expected to be live. Consumers should freeze/pause the session here —
   * backgrounded time must never count toward a session.
   */
  onPause?: () => void;
  /**
   * Fired when the user returns to the app. Consumers should surface a
   * "resume" state here (e.g. a paused overlay) rather than auto-resuming,
   * so the user decides when the session continues.
   */
  onResume?: () => void;
}

/**
 * Tracks whether the app is in the background / phone is locked, pausing a
 * live session on background and reporting the return so a resume state can
 * be shown. `isBackgrounded` stays true the whole time the app is not
 * foregrounded, so scoring logic can gate on it.
 *
 * Callbacks are read through a ref, so passing inline closures is safe — the
 * AppState listener is registered once and never re-subscribed.
 */
export function useSessionLifecycle(
  callbacks: SessionLifecycleCallbacks = {},
): { isBackgrounded: boolean } {
  // Initialise from the current state so a screen that mounts while the app
  // is already backgrounded (e.g. opened from a notification) doesn't start
  // live until the next AppState change. Note: on iOS, 'inactive' fires
  // transiently for the app switcher / control center — pausing then is
  // intentional (the user is stepping away from the app).
  const [isBackgrounded, setIsBackgrounded] = useState(
    () => AppState.currentState !== 'active',
  );
  const callbacksRef = useRef(callbacks);

  // Keep the latest callbacks without re-subscribing the AppState listener.
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const bg = next !== 'active';
      setIsBackgrounded(bg);
      if (bg) callbacksRef.current.onPause?.();
      else callbacksRef.current.onResume?.();
    });
    return () => sub.remove();
  }, []);

  return { isBackgrounded };
}
