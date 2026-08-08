import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';

type SoundType = 'hit' | 'wrong' | 'levelup';
type GameSoundOptions = { shortTapSounds?: boolean };

/**
 * Hook that pre-loads game sound effects and exposes play functions.
 * Sounds are bundled MP3 files in assets/sounds/effects/.
 * Uses expo-audio's useAudioPlayer for each sound.
 */
export function useGameSounds({ shortTapSounds = false }: GameSoundOptions = {}) {
  const hitSource = shortTapSounds
    ? require('@/assets/sounds/effects/schulte-correct.mp3')
    : require('@/assets/sounds/effects/hit.mp3');
  const wrongSource = shortTapSounds
    ? require('@/assets/sounds/effects/schulte-wrong.mp3')
    : require('@/assets/sounds/effects/wrong.mp3');
  // Pre-load all 3 sounds (players are stable references)
  const hitPlayerOne = useAudioPlayer(hitSource);
  const hitPlayerTwo = useAudioPlayer(hitSource);
  const hitPlayerThree = useAudioPlayer(hitSource);
  const wrongPlayer = useAudioPlayer(wrongSource);
  const levelupPlayer = useAudioPlayer(require('@/assets/sounds/effects/levelup.mp3'));
  const completePlayer = useAudioPlayer(require('@/assets/sounds/effects/schulte-complete.mp3'));
  const schulteLevelUpPlayer = useAudioPlayer(require('@/assets/sounds/effects/schulte-level-up.mp3'));
  const hitVoice = useRef(0);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
  }, []);

  // eslint-disable-next-line react-hooks/immutability -- this callback controls expo-audio's documented imperative player API.
  const play = useCallback((type: SoundType) => {
    const hitPlayers = [hitPlayerOne, hitPlayerTwo, hitPlayerThree] as const;
    const player = type === 'hit'
      ? hitPlayers[hitVoice.current++ % hitPlayers.length]
      : type === 'wrong'
        ? wrongPlayer
        : levelupPlayer;
    // Keep rapid gameplay feedback present but well below music/guide volume.
    // eslint-disable-next-line react-hooks/immutability -- expo-audio exposes volume as a documented imperative player property.
    player.volume = type === 'hit' ? 0.55 : type === 'wrong' ? 0.42 : 0.7;
    player.setPlaybackRate(1);
    void player.seekTo(0).then(() => player.play()).catch(() => {
      // Audio feedback is non-critical; keep gameplay running if unavailable.
    });
  }, [hitPlayerOne, hitPlayerThree, hitPlayerTwo, levelupPlayer, wrongPlayer]);

  const playHit = useCallback(() => play('hit'), [play]);
  const playWrong = useCallback(() => play('wrong'), [play]);
  const playLevelUp = useCallback(() => play('levelup'), [play]);

  // eslint-disable-next-line react-hooks/immutability -- this callback controls expo-audio's documented imperative player API.
  const playChallengeComplete = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability -- expo-audio exposes volume as a documented imperative player property.
    completePlayer.volume = 0.62;
    completePlayer.setPlaybackRate(1);
    void completePlayer.seekTo(0).then(() => completePlayer.play()).catch(() => {});
  }, [completePlayer]);

  // eslint-disable-next-line react-hooks/immutability -- this callback controls expo-audio's documented imperative player API.
  const playSchulteLevelUp = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability -- expo-audio exposes volume as a documented imperative player property.
    schulteLevelUpPlayer.volume = 0.66;
    void schulteLevelUpPlayer.seekTo(0).then(() => schulteLevelUpPlayer.play()).catch(() => {});
  }, [schulteLevelUpPlayer]);

  // eslint-disable-next-line react-hooks/immutability -- this callback controls expo-audio's documented imperative player API.
  const playPersonalBest = useCallback(() => {
    completePlayer.setPlaybackRate(1.12);
    // eslint-disable-next-line react-hooks/immutability -- expo-audio exposes volume as a documented imperative player property.
    completePlayer.volume = 0.52;
    void completePlayer.seekTo(0).then(() => completePlayer.play()).catch(() => {});
  }, [completePlayer]);

  const playFailure = useCallback(() => play('wrong'), [play]);

  // eslint-disable-next-line react-hooks/immutability -- this callback controls expo-audio's documented imperative player API.
  const playTimeout = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability -- expo-audio exposes volume as a documented imperative player property.
    wrongPlayer.volume = 0.38;
    wrongPlayer.setPlaybackRate(0.78);
    void wrongPlayer.seekTo(0).then(() => wrongPlayer.play()).catch(() => {});
  }, [wrongPlayer]);

  const playCountdownPulse = useCallback((step: 3 | 2 | 1) => {
    const player = step === 3 ? hitPlayerOne : step === 2 ? hitPlayerTwo : hitPlayerThree;
    // eslint-disable-next-line react-hooks/immutability -- expo-audio's AudioPlayer only exposes volume via property assignment (no setter method); this is the documented imperative API, not React state.
    player.volume = 1;
    player.setPlaybackRate(step === 3 ? 0.82 : step === 2 ? 1.04 : 1.3);
    void player.seekTo(0).then(() => player.play()).catch(() => {});
  }, [hitPlayerOne, hitPlayerThree, hitPlayerTwo]);

  /** Restrained per-second tick for the last-10-seconds pressure window (10s-4s) — quieter and lower-pitched than `playCountdownPulse`'s final-3-seconds escalation. */
  const playSoftTick = useCallback(() => {
    const hitPlayers = [hitPlayerOne, hitPlayerTwo, hitPlayerThree] as const;
    const player = hitPlayers[hitVoice.current++ % hitPlayers.length];
    player.volume = 0.45;
    player.setPlaybackRate(0.7);
    void player.seekTo(0).then(() => player.play()).catch(() => {});
  }, [hitPlayerOne, hitPlayerThree, hitPlayerTwo]);

  const playLaunchWhoosh = useCallback(() => {
    levelupPlayer.setPlaybackRate(1.18);
    void levelupPlayer.seekTo(0).then(() => levelupPlayer.play()).catch(() => {});
  }, [levelupPlayer]);

  /** Stops short-lived game cues before terminal/reset states so priorities cannot stack. */
  const stopTransientSounds = useCallback(() => {
    hitPlayerOne.pause();
    hitPlayerTwo.pause();
    hitPlayerThree.pause();
    wrongPlayer.pause();
    completePlayer.pause();
    schulteLevelUpPlayer.pause();
    levelupPlayer.pause();
  }, [completePlayer, hitPlayerOne, hitPlayerThree, hitPlayerTwo, levelupPlayer, schulteLevelUpPlayer, wrongPlayer]);

  return {
    playHit,
    playWrong,
    playLevelUp,
    playChallengeComplete,
    playSchulteLevelUp,
    playPersonalBest,
    playFailure,
    playTimeout,
    playCountdownPulse,
    playSoftTick,
    playLaunchWhoosh,
    stopTransientSounds,
  };
}
