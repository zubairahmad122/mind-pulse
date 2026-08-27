import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';

// Fallback URL used when "Silent" is selected (hook always needs a source).
const FALLBACK_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3';

// How far the music drops while the voice guide is speaking (premium "ducking").
const DUCK_FACTOR = 0.3;
const FADE_MS = 700;
const FADE_STEP_MS = 50;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Plays a looping ambient track during breathing sessions.
 *
 * - `url = null` → silent mode; `isPlaying = false` → fade out + pause.
 * - `duck = true` (voice guide speaking) → smoothly fades the music down to
 *   ~30% of its set volume, then back up when the voice ends. Volume never
 *   jumps — every change (start, stop, duck, slider) is a short fade.
 */
export function useBreathingMusic(
  url: string | null,
  isPlaying: boolean,
  volume = 0.35,
  duck = false,
) {
  const player = useAudioPlayer(url ?? FALLBACK_URL);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  // Start/stop playback. Volume is owned by the fade effect below.
  useEffect(() => {
    if (url && isPlaying) {
      try {
        player.loop = true;
        // Start silent and let the fade effect ramp up — no volume jump on start.
        if (!player.playing) player.volume = 0;
        player.play();
      } catch { /* ignore on unmount race */ }
    }
    return () => { try { player.pause(); } catch { /* ignore */ } };
  }, [url, isPlaying, player]);

  // Smoothly fade toward the current target volume (0 when stopping).
  useEffect(() => {
    const target = !url || !isPlaying ? 0 : clamp01(volume) * (duck ? DUCK_FACTOR : 1);

    if (fadeRef.current) clearInterval(fadeRef.current);

    let start = target;
    try { start = player.volume; } catch { /* keep target */ }

    if (Math.abs(start - target) < 0.01) {
      try {
        player.volume = target;
        if (target === 0 && !isPlaying) player.pause();
      } catch { /* ignore */ }
      return;
    }

    const steps = Math.max(1, Math.round(FADE_MS / FADE_STEP_MS));
    let i = 0;
    fadeRef.current = setInterval(() => {
      i++;
      const v = start + (target - start) * (i / steps);
      try { player.volume = clamp01(v); } catch { /* ignore */ }
      if (i >= steps) {
        if (fadeRef.current) clearInterval(fadeRef.current);
        fadeRef.current = null;
        // Fade-to-zero on stop: pause once silent so the loop doesn't burn battery.
        if (target === 0 && !isPlaying) {
          try { player.pause(); } catch { /* ignore */ }
        }
      }
    }, FADE_STEP_MS);

    return () => {
      if (fadeRef.current) {
        clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
    };
  }, [url, isPlaying, volume, duck, player]);

  return player;
}
