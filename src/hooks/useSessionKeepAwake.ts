import { useEffect } from 'react';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';

/**
 * Prevents auto-dim/auto-lock only while a guided session is active.
 * Tagged locks allow multiple session features to coexist safely and guarantee
 * that normal device sleep behavior returns on completion or unmount.
 */
export function useSessionKeepAwake(active: boolean, tag: string): void {
  useEffect(() => {
    if (!active) return;

    void activateKeepAwakeAsync(tag).catch(() => undefined);
    return () => {
      void deactivateKeepAwake(tag).catch(() => undefined);
    };
  }, [active, tag]);
}
