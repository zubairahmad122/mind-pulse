import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = '@mindpulse/eye-game-accessibility-prefs';

export interface EyeGameAccessibilityPrefs {
  /** Forces the Gentle-tier target/symbol size regardless of difficulty. */
  largeTarget: boolean;
  highContrast: boolean;
  /** In-app override, additive with the OS-level `useReducedMotion` signal —
   *  callers should treat "effective reduced motion" as this OR the OS
   *  setting, never this alone. */
  reducedMotion: boolean;
}

const DEFAULT_PREFS: EyeGameAccessibilityPrefs = {
  largeTarget: false,
  highContrast: false,
  reducedMotion: false,
};

/**
 * Shared accessibility preferences for eye games — deliberately separate
 * storage from `useGameFeedbackPrefs` (sound/haptics) and from any
 * per-activity skill-difficulty profile. Enabling any of these must never
 * change a game's scoring output; that contract is enforced by tests in
 * each game's engine, not by this hook.
 */
export function useEyeGameAccessibility() {
  const [prefs, setPrefs] = useState<EyeGameAccessibilityPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<EyeGameAccessibilityPrefs>;
        setPrefs(prev => ({ ...prev, ...parsed }));
      })
      .catch(() => {});
  }, []);

  const update = useCallback((next: Partial<EyeGameAccessibilityPrefs>) => {
    setPrefs(prev => {
      const merged = { ...prev, ...next };
      void AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => {});
      return merged;
    });
  }, []);

  return {
    largeTarget: prefs.largeTarget,
    highContrast: prefs.highContrast,
    reducedMotion: prefs.reducedMotion,
    setLargeTarget: (v: boolean) => update({ largeTarget: v }),
    setHighContrast: (v: boolean) => update({ highContrast: v }),
    setReducedMotion: (v: boolean) => update({ reducedMotion: v }),
  };
}
