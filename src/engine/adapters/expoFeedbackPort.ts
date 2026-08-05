import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import type { FeedbackCue, FeedbackPort } from '../core/ports/feedbackPort';
import { useGameFeedbackPrefs } from '@/hooks/useGameFeedbackPrefs';
import { useGameSounds } from '@/hooks/useGameSounds';

/**
 * The Expo implementation of the engine's `FeedbackPort`.
 *
 * `engine/core` asks for a *cue* ("hit", "warning", "stage-clear") and never
 * learns what it sounds or feels like. This is where that decision is made,
 * and it is also where the player's existing sound/haptic preferences are
 * honoured — so a game never has to check a setting, and a muted player and
 * a loud one run byte-identical simulations.
 *
 * Both toggles fail soft: a missing audio file or an unsupported haptic
 * engine must never interrupt a live mission, so every call is fire and
 * forget.
 */
export function useExpoFeedbackPort(): FeedbackPort {
  const { soundEnabled, hapticsEnabled } = useGameFeedbackPrefs();
  const { playHit, playWrong, playLevelUp } = useGameSounds();

  return useMemo<FeedbackPort>(
    () => ({
      sound(cue: FeedbackCue) {
        if (!soundEnabled) return;
        switch (cue) {
          case 'hit':
          case 'countdown':
          case 'stage-start':
            playHit();
            break;
          case 'miss':
          case 'warning':
            playWrong();
            break;
          case 'combo':
          case 'stage-clear':
          case 'end':
            playLevelUp();
            break;
        }
      },

      haptic(cue: FeedbackCue) {
        if (!hapticsEnabled) return;
        // Impact weight tracks consequence: locking a gate is a tick, taking
        // a hit on the core is an error notification you feel in your palm.
        switch (cue) {
          case 'hit':
          case 'countdown':
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            break;
          case 'stage-start':
          case 'warning':
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            break;
          case 'combo':
          case 'stage-clear':
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            break;
          case 'miss':
          case 'end':
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            break;
        }
      },
    }),
    [soundEnabled, hapticsEnabled, playHit, playWrong, playLevelUp],
  );
}
