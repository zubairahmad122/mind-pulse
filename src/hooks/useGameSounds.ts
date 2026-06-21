import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';

type SoundType = 'hit' | 'wrong' | 'levelup';

/**
 * Hook that pre-loads game sound effects and exposes play functions.
 * Sounds are bundled MP3 files in assets/sounds/effects/.
 * Uses expo-audio's useAudioPlayer for each sound.
 */
export function useGameSounds() {
  // Pre-load all 3 sounds (players are stable references)
  const hitPlayer = useAudioPlayer(require('@/assets/sounds/effects/hit.mp3'));
  const wrongPlayer = useAudioPlayer(require('@/assets/sounds/effects/wrong.mp3'));
  const levelupPlayer = useAudioPlayer(require('@/assets/sounds/effects/levelup.mp3'));

  const play = useCallback((type: SoundType) => {
    const player = type === 'hit' ? hitPlayer
      : type === 'wrong' ? wrongPlayer
      : levelupPlayer;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Silently fail — audio is non-critical
    }
  }, [hitPlayer, wrongPlayer, levelupPlayer]);

  const playHit = useCallback(() => play('hit'), [play]);
  const playWrong = useCallback(() => play('wrong'), [play]);
  const playLevelUp = useCallback(() => play('levelup'), [play]);

  return { playHit, playWrong, playLevelUp };
}
