import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';

// Fallback URL used when "Silent" is selected (hook always needs a source).
const FALLBACK_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3';

/**
 * Plays a looping ambient track during breathing sessions.
 * Pass `url = null` for silent mode; pass `isPlaying = false` to pause without changing selection.
 * Volume defaults to 0.35 (soft background); pass custom volume to override.
 */
export function useBreathingMusic(url: string | null, isPlaying: boolean, volume = 0.35) {
  const player = useAudioPlayer(url ?? FALLBACK_URL);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  useEffect(() => {
    if (url && isPlaying) {
      try {
        player.loop = true;
        player.volume = Math.max(0, Math.min(1, volume));
        player.play();
      } catch { /* ignore on unmount race */ }
    } else {
      try { player.pause(); } catch { /* ignore */ }
    }
    return () => { try { player.pause(); } catch { /* ignore */ } };
  }, [url, isPlaying, volume, player]);

  return player;
}
