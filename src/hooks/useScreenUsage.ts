import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  getScreenUsageSnapshot,
  isScreenUsageSupported,
  openUsageAccessSettings,
} from '@/services/screenUsageService';
import type { ScreenUsageSnapshot } from '@/types/screenUsage.types';

export interface UseScreenUsageResult {
  /** Android with the native module linked — false everywhere else (never crashes, just stays unsupported). */
  supported: boolean;
  loading: boolean;
  snapshot: ScreenUsageSnapshot | null;
  /** Re-fetches the snapshot. Consumers should also call this after `requestAccess()` returns. */
  refresh: () => Promise<void>;
  /** Opens Android's Usage Access settings. Does not assume access was granted — call `refresh()` on the next app-active transition. */
  requestAccess: () => Promise<void>;
}

/**
 * Loads a `ScreenUsageSnapshot` on mount and re-fetches whenever the app
 * returns to the foreground (the user may have just granted/revoked Usage
 * Access in Settings). `fetchingRef` guards against overlapping fetches
 * from rapid AppState churn.
 */
export function useScreenUsage(): UseScreenUsageResult {
  // Cheap and stable for the process lifetime (platform check + a cached
  // native-module lookup) — safe to call directly on every render.
  const supported = isScreenUsageSupported();
  const [loading, setLoading] = useState(supported);
  const [snapshot, setSnapshot] = useState<ScreenUsageSnapshot | null>(null);
  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!supported || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      setSnapshot(await getScreenUsageSnapshot());
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [supported]);

  useEffect(() => {
    void refresh();
    // Only ever runs once on mount — `refresh` is stable for the lifetime
    // of a given `supported` value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const requestAccess = useCallback(async () => {
    await openUsageAccessSettings();
  }, []);

  return { supported, loading, snapshot, refresh, requestAccess };
}
