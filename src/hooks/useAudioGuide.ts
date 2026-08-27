import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useCallback, useContext, useEffect, useRef } from 'react';
import { AUDIO_GUIDE, resolveGuideLang, type AudioClipId } from '@/constants/audioGuide';
import { LanguageContext } from '@/context/LanguageContext';

export interface PlayOptions {
  /**
   * When false, the clip is skipped instead of cutting off a PROTECTED clip
   * (intro / closing narration). It still replaces an unprotected clip — a
   * lingering 2s "Hold" cue must never swallow the next "Breathe out".
   * Defaults to true (replace whatever is playing).
   */
  interrupt?: boolean;
  /** Mark this clip as protected: non-interrupting cues won't cut it off. */
  protect?: boolean;
  /** Called once when this clip finishes (also when it can't play, so flows never stall). */
  onDone?: () => void;
}

export interface AudioGuideOptions {
  /**
   * Fires whenever the guide voice starts/stops speaking. Wire this to music
   * ducking so ambient sound drops while the voice is active.
   */
  onActivity?: (speaking: boolean) => void;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Module-level singleton player.
 *
 * The player deliberately OUTLIVES screens: a closing narration keeps playing
 * across navigation (session player → completion screen) instead of being cut
 * off by unmount. Playback only stops when a screen calls stop() explicitly —
 * exits, resets, and the completion screen's own unmount do that.
 * ──────────────────────────────────────────────────────────────────────────── */

let sharedPlayer: ReturnType<typeof createAudioPlayer> | null = null;
let speaking = false;
let pausedByUs = false;
// True once the CURRENT clip has actually reported `playing`. Guards against
// stale didJustFinish events re-emitted from a previously finished source
// right after replace() — those must never consume the new clip's onDone.
let clipStarted = false;
// True while the current clip is a long, protected narration (intro/closing).
let currentProtected = false;
let currentOnDone: (() => void) | null = null;
let pendingTimeouts: ReturnType<typeof setTimeout>[] = [];
let audioModeReady = false;
const activityListeners = new Set<(speaking: boolean) => void>();

function emitSpeaking(next: boolean) {
  if (speaking === next) return;
  speaking = next;
  for (const listener of activityListeners) listener(next);
}

// Lazy creation — avoids native-module-not-ready crashes on cold start.
function getPlayer() {
  if (!sharedPlayer) {
    try {
      const player = createAudioPlayer(null);
      player.addListener('playbackStatusUpdate', status => {
        // A clip counts as finished on didJustFinish OR when playback stopped
        // at the end of the source. Long clips (the ~2.5 min Calm Flow intro)
        // sometimes end without a didJustFinish — relying on the event alone
        // left `currentProtected` stuck true, silently skipping every phase
        // cue for the rest of the session.
        const reachedEnd =
          status.didJustFinish ||
          (!status.playing &&
            !pausedByUs &&
            status.duration > 0 &&
            status.currentTime >= status.duration - 0.35);
        if (reachedEnd) {
          // Only honor a finish for a clip we actually heard start — otherwise
          // it's a stale event from the previous source, not this clip.
          if (!clipStarted) return;
          clipStarted = false;
          currentProtected = false;
          emitSpeaking(false);
          const done = currentOnDone;
          currentOnDone = null;
          done?.();
        } else if (status.playing) {
          clipStarted = true;
          if (!pausedByUs) emitSpeaking(true);
        }
      });
      sharedPlayer = player;
    } catch {
      return null;
    }
  }
  return sharedPlayer;
}

function guideStop() {
  for (const t of pendingTimeouts) clearTimeout(t);
  pendingTimeouts = [];
  currentOnDone = null;
  currentProtected = false;
  clipStarted = false;
  pausedByUs = false;
  if (sharedPlayer) {
    try { sharedPlayer.pause(); } catch {}
  }
  emitSpeaking(false);
}

function guidePause() {
  if (!sharedPlayer || !speaking) return;
  pausedByUs = true;
  try { sharedPlayer.pause(); } catch {}
  emitSpeaking(false);
}

// Applies to the clip currently playing — used for live mute/volume changes
// mid-clip (play() still sets the volume for each new clip).
function guideSetVolume(v: number) {
  if (!sharedPlayer) return;
  try { sharedPlayer.volume = Math.max(0, Math.min(1, v)); } catch {}
}

function guideResume() {
  if (!sharedPlayer || !pausedByUs) return;
  pausedByUs = false;
  try {
    void sharedPlayer.play();
    emitSpeaking(true);
  } catch {}
}

/**
 * Plays pre-recorded MP3 voice-guide clips (replaces the old TTS voiceGuide).
 *
 *   const { play, stop, pause, resume } = useAudioGuide({ onActivity: setVoiceActive });
 *   play('breathing/breathe-in');                              // immediate, replaces current
 *   play('bodyscan/intro', 200, 1, { onDone: startFirstZone }); // chain on completion
 *   play('breathing/hold', 100, 0.8, { interrupt: false });    // skip if voice is busy
 *
 * Clips are bundled per language; the current app language is resolved to one
 * of the recorded languages (Urdu/Pashto → Hindi). One shared player app-wide,
 * so at most one voice clip plays at a time and playback survives navigation.
 */
export function useAudioGuide(options?: AudioGuideOptions) {
  const { langCode } = useContext(LanguageContext);
  const activityRef = useRef(options?.onActivity);
  useEffect(() => {
    activityRef.current = options?.onActivity;
  });

  useEffect(() => {
    if (!audioModeReady) {
      audioModeReady = true;
      // Voice must be audible in silent mode and duck other apps' audio.
      void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
    }
    const listener = (s: boolean) => activityRef.current?.(s);
    activityListeners.add(listener);
    // Sync immediately so ducking reflects a voice that is already speaking.
    listener(speaking);
    return () => {
      activityListeners.delete(listener);
    };
  }, []);

  const play = useCallback(
    (clipId: AudioClipId, delayMs = 0, volume = 1.0, opts?: PlayOptions) => {
      const run = () => {
        // Non-interrupting cues silently skip only while PROTECTED guidance
        // (intro/closing) is speaking — they may replace a lingering cue tail.
        if (opts?.interrupt === false && speaking && currentProtected) return;
        const source = AUDIO_GUIDE[clipId]?.[resolveGuideLang(langCode)];
        const player = source != null ? getPlayer() : null;
        if (!player) {
          opts?.onDone?.();
          return;
        }
        try {
          currentOnDone = opts?.onDone ?? null;
          currentProtected = opts?.protect === true;
          pausedByUs = false;
          clipStarted = false;
          player.replace(source);
          // If the previous source had finished, position can sit at its end —
          // rewind so a clip played after a long idle doesn't start finished.
          try { void player.seekTo(0); } catch {}
          player.volume = Math.max(0, Math.min(1, volume));
          void player.play();
          emitSpeaking(true);
        } catch {
          // A missing/locked clip should never crash or stall a session.
          currentOnDone = null;
          emitSpeaking(false);
          opts?.onDone?.();
        }
      };

      if (delayMs > 0) {
        pendingTimeouts.push(setTimeout(run, delayMs));
      } else {
        run();
      }
    },
    [langCode],
  );

  /** Pause the current clip in place (session pause). */
  const pause = useCallback(() => guidePause(), []);

  /** Resume a clip previously stopped with pause(). */
  const resume = useCallback(() => guideResume(), []);

  /** Stop playback and cancel any scheduled clips and completion callbacks. */
  const stop = useCallback(() => guideStop(), []);

  /** Change the volume of the clip that is playing RIGHT NOW (live mute/slider). */
  const setVolume = useCallback((v: number) => guideSetVolume(v), []);

  return { play, stop, pause, resume, setVolume };
}
