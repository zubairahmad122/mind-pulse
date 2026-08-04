import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';

type SoundType = 'hit' | 'wrong' | 'levelup';

/**
 * Hook that pre-loads game sound effects and exposes play functions.
 * Sounds are bundled MP3 files in assets/sounds/effects/.
 * Uses expo-audio's useAudioPlayer for each sound.
 */
export function useGameSounds() {
  // Pre-load all 3 sounds (players are stable references)
  const hitPlayerOne = useAudioPlayer(require('@/assets/sounds/effects/hit.mp3'));
  const hitPlayerTwo = useAudioPlayer(require('@/assets/sounds/effects/hit.mp3'));
  const hitPlayerThree = useAudioPlayer(require('@/assets/sounds/effects/hit.mp3'));
  const wrongPlayer = useAudioPlayer(require('@/assets/sounds/effects/wrong.mp3'));
  const levelupPlayer = useAudioPlayer(require('@/assets/sounds/effects/levelup.mp3'));
  const hitVoice = useRef(0);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
  }, []);

  const play = useCallback((type: SoundType) => {
    const hitPlayers = [hitPlayerOne, hitPlayerTwo, hitPlayerThree] as const;
    const player = type === 'hit'
      ? hitPlayers[hitVoice.current++ % hitPlayers.length]
      : type === 'wrong'
        ? wrongPlayer
        : levelupPlayer;
    player.setPlaybackRate(1);
    void player.seekTo(0).then(() => player.play()).catch(() => {
      // Audio feedback is non-critical; keep gameplay running if unavailable.
    });
  }, [hitPlayerOne, hitPlayerThree, hitPlayerTwo, levelupPlayer, wrongPlayer]);

  const playHit = useCallback(() => play('hit'), [play]);
  const playWrong = useCallback(() => play('wrong'), [play]);
  const playLevelUp = useCallback(() => play('levelup'), [play]);

  const playCountdownPulse = useCallback((step: 3 | 2 | 1) => {
    const player = step === 3 ? hitPlayerOne : step === 2 ? hitPlayerTwo : hitPlayerThree;
    player.setPlaybackRate(step === 3 ? 0.82 : step === 2 ? 1.04 : 1.3);
    void player.seekTo(0).then(() => player.play()).catch(() => {});
  }, [hitPlayerOne, hitPlayerThree, hitPlayerTwo]);

  const playLaunchWhoosh = useCallback(() => {
    levelupPlayer.setPlaybackRate(1.18);
    void levelupPlayer.seekTo(0).then(() => levelupPlayer.play()).catch(() => {});
  }, [levelupPlayer]);

  return { playHit, playWrong, playLevelUp, playCountdownPulse, playLaunchWhoosh };
}
