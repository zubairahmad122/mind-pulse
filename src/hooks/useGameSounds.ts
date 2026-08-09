import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

type SoundType = 'hit' | 'wrong' | 'levelup';
type GameSoundOptions = { shortTapSounds?: boolean };

interface PlayerSet {
  readonly hitPlayerOne: AudioPlayer;
  readonly hitPlayerTwo: AudioPlayer;
  readonly hitPlayerThree: AudioPlayer;
  readonly wrongPlayer: AudioPlayer;
  readonly levelupPlayer: AudioPlayer;
  readonly completePlayer: AudioPlayer;
  readonly schulteLevelUpPlayer: AudioPlayer;
}

/**
 * Audio players created by `useAudioPlayer` are released automatically during
 * unmount. A clock/navigation callback can race that cleanup on Android, where
 * calling an imperative method on the released shared object throws
 * synchronously. Sound effects are best-effort, so stopping an already released
 * player should be treated as a no-op.
 */
function pauseIfAvailable(player: AudioPlayer | undefined) {
  if (!player) return;
  try {
    player.pause();
  } catch {
    // The native player has already been released.
  }
}

/**
 * `volume =` / `setPlaybackRate()` / `seekTo()` are all imperative calls onto
 * the native shared object a player exposes. The same release race described
 * above applies to every one of them, not just `pause()` — and
 * `volume`/`setPlaybackRate` throw synchronously (a trailing `.catch()` on
 * `seekTo().then(...)` never sees that). Route every player interaction
 * through here so a released (or not-yet-created) player is a silent no-op
 * instead of an uncaught throw that can crash the JS instance.
 */
function playSafely(player: AudioPlayer | undefined, { volume, rate }: { volume?: number; rate?: number }) {
  if (!player) return;
  try {
    if (volume !== undefined) player.volume = volume;
    if (rate !== undefined) player.setPlaybackRate(rate);
    void player.seekTo(0).then(() => player.play()).catch(() => {});
  } catch {
    // The native player has already been released.
  }
}

/**
 * Hook that pre-loads game sound effects and exposes play functions.
 * Sounds are bundled MP3 files in assets/sounds/effects/.
 *
 * Players are created imperatively via `createAudioPlayer` (not the eager
 * `useAudioPlayer` hook) and deferred to after the screen's first paint via
 * `InteractionManager`. Constructing 7 native players is real, measurable
 * native-bridge work; doing it synchronously on mount means it directly
 * competes with everything else a cold app start is already doing (fonts,
 * Firebase, Sentry, RevenueCat init) plus this screen's own entrance
 * animation — which is exactly the kind of contention that can leave a
 * Reanimated-driven fade-in stuck. Deferring construction until interactions
 * have settled removes that contention without changing playback behavior
 * (every play function already no-ops safely on an unset player via the
 * guards above, so sounds simply become available a beat after mount).
 */
export function useGameSounds({ shortTapSounds = false }: GameSoundOptions = {}) {
  const [players, setPlayers] = useState<PlayerSet | null>(null);
  const hitVoice = useRef(0);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
  }, []);

  useEffect(() => {
    const hitSource = shortTapSounds
      ? require('@/assets/sounds/effects/schulte-correct.mp3')
      : require('@/assets/sounds/effects/hit.mp3');
    const wrongSource = shortTapSounds
      ? require('@/assets/sounds/effects/schulte-wrong.mp3')
      : require('@/assets/sounds/effects/wrong.mp3');

    let cancelled = false;
    let created: PlayerSet | null = null;

    const handle = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      created = {
        hitPlayerOne: createAudioPlayer(hitSource),
        hitPlayerTwo: createAudioPlayer(hitSource),
        hitPlayerThree: createAudioPlayer(hitSource),
        wrongPlayer: createAudioPlayer(wrongSource),
        levelupPlayer: createAudioPlayer(require('@/assets/sounds/effects/levelup.mp3')),
        completePlayer: createAudioPlayer(require('@/assets/sounds/effects/schulte-complete.mp3')),
        schulteLevelUpPlayer: createAudioPlayer(require('@/assets/sounds/effects/schulte-level-up.mp3')),
      };
      setPlayers(created);
    });

    return () => {
      cancelled = true;
      handle.cancel();
      if (created) {
        for (const player of Object.values(created)) {
          try {
            player.release();
          } catch {
            // Already released.
          }
        }
      }
    };
    // shortTapSounds is passed once at mount and never changes in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = useCallback((type: SoundType) => {
    if (!players) return;
    const hitPlayers = [players.hitPlayerOne, players.hitPlayerTwo, players.hitPlayerThree] as const;
    const player = type === 'hit'
      ? hitPlayers[hitVoice.current++ % hitPlayers.length]
      : type === 'wrong'
        ? players.wrongPlayer
        : players.levelupPlayer;
    // Keep rapid gameplay feedback present but well below music/guide volume.
    playSafely(player, { volume: type === 'hit' ? 0.55 : type === 'wrong' ? 0.42 : 0.7, rate: 1 });
  }, [players]);

  const playHit = useCallback(() => play('hit'), [play]);
  const playWrong = useCallback(() => play('wrong'), [play]);
  const playLevelUp = useCallback(() => play('levelup'), [play]);

  const playChallengeComplete = useCallback(() => {
    playSafely(players?.completePlayer, { volume: 0.62, rate: 1 });
  }, [players]);

  const playSchulteLevelUp = useCallback(() => {
    playSafely(players?.schulteLevelUpPlayer, { volume: 0.66 });
  }, [players]);

  const playPersonalBest = useCallback(() => {
    playSafely(players?.completePlayer, { volume: 0.52, rate: 1.12 });
  }, [players]);

  const playFailure = useCallback(() => play('wrong'), [play]);

  const playTimeout = useCallback(() => {
    playSafely(players?.wrongPlayer, { volume: 0.38, rate: 0.78 });
  }, [players]);

  const playCountdownPulse = useCallback((step: 3 | 2 | 1) => {
    if (!players) return;
    const player = step === 3 ? players.hitPlayerOne : step === 2 ? players.hitPlayerTwo : players.hitPlayerThree;
    playSafely(player, { volume: 1, rate: step === 3 ? 0.82 : step === 2 ? 1.04 : 1.3 });
  }, [players]);

  /** Restrained per-second tick for the last-10-seconds pressure window (10s-4s) — quieter and lower-pitched than `playCountdownPulse`'s final-3-seconds escalation. */
  const playSoftTick = useCallback(() => {
    if (!players) return;
    const hitPlayers = [players.hitPlayerOne, players.hitPlayerTwo, players.hitPlayerThree] as const;
    const player = hitPlayers[hitVoice.current++ % hitPlayers.length];
    playSafely(player, { volume: 0.45, rate: 0.7 });
  }, [players]);

  const playLaunchWhoosh = useCallback(() => {
    playSafely(players?.levelupPlayer, { rate: 1.18 });
  }, [players]);

  /** Stops short-lived game cues before terminal/reset states so priorities cannot stack. */
  const stopTransientSounds = useCallback(() => {
    if (!players) return;
    pauseIfAvailable(players.hitPlayerOne);
    pauseIfAvailable(players.hitPlayerTwo);
    pauseIfAvailable(players.hitPlayerThree);
    pauseIfAvailable(players.wrongPlayer);
    pauseIfAvailable(players.completePlayer);
    pauseIfAvailable(players.schulteLevelUpPlayer);
    pauseIfAvailable(players.levelupPlayer);
  }, [players]);

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
