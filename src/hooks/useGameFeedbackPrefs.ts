import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = '@mindpulse/game-feedback-prefs';

interface GameFeedbackPrefs {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

const DEFAULT_PREFS: GameFeedbackPrefs = { soundEnabled: true, hapticsEnabled: true };

/** Sound/haptics toggles for in-game feedback — shared across eye games, persisted locally. */
export function useGameFeedbackPrefs() {
  const [prefs, setPrefs] = useState<GameFeedbackPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<GameFeedbackPrefs>;
        setPrefs(prev => ({ ...prev, ...parsed }));
      })
      .catch(() => {});
  }, []);

  const update = useCallback((next: Partial<GameFeedbackPrefs>) => {
    setPrefs(prev => {
      const merged = { ...prev, ...next };
      void AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => {});
      return merged;
    });
  }, []);

  return {
    soundEnabled: prefs.soundEnabled,
    hapticsEnabled: prefs.hapticsEnabled,
    setSoundEnabled: (v: boolean) => update({ soundEnabled: v }),
    setHapticsEnabled: (v: boolean) => update({ hapticsEnabled: v }),
  };
}
