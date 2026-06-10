import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useCallback, useContext, useEffect, useRef } from 'react';
import type { SessionLang } from '@/constants/sessionScripts';
import { LanguageContext } from '@/context/LanguageContext';
import { getCachedTTSUri } from '@/services/azureTTS';
import { speak, stopSpeaking } from '@/services/voiceGuide';

export function useVoiceGuide() {
  const { ttsLang, langCode, scripts } = useContext(LanguageContext);

  // Lazy-initialized — not created until first guide() call to avoid native-module
  // not-ready crashes on Android cold-start.
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  // Queue for voice segments to prevent cutting
  const queueRef = useRef<Array<{ text: string; volume: number }>>([]);
  const isPlayingRef = useRef(false);

  // Cache which language prefixes have an installed TTS voice on this device.
  // Defaults to English-only until the async check resolves.
  const availLangsRef = useRef<Set<string>>(new Set(['en']));

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });

    void Speech.getAvailableVoicesAsync()
      .then(voices => {
        if (voices.length === 0) return; // TTS engine not responding — keep 'en' default
        const prefixes = new Set(voices.map(v => v.language.split('-')[0]));
        availLangsRef.current = prefixes;
      })
      .catch(() => {});

    return () => {
      if (playerRef.current) {
        try { playerRef.current.pause(); } catch {}
        try { playerRef.current.remove(); } catch {}
        playerRef.current = null;
      }
      stopSpeaking();
    };
  }, []);

  function getPlayer(): ReturnType<typeof createAudioPlayer> | null {
    if (!playerRef.current) {
      try { playerRef.current = createAudioPlayer(null); } catch { return null; }
    }
    return playerRef.current;
  }

  const playNextInQueue = useCallback(async () => {
    if (queueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    const { text, volume } = queueRef.current.shift()!;
    const sessLang: SessionLang = langCode === 'ps' ? 'ur' : (langCode as SessionLang);
    const uri = await getCachedTTSUri(text, sessLang);

    if (uri) {
      const player = getPlayer();
      if (player) {
        try {
          player.replace({ uri });
          player.volume = Math.max(0, Math.min(1, volume));
          await player.play();

          // Wait for audio to finish by monitoring duration
          // Poll every 200ms to check if playback has finished
          let checkCount = 0;
          const checkInterval = setInterval(() => {
            checkCount++;
            // Max 15 seconds of polling (150 * 200ms) to avoid hanging
            if (checkCount > 150) {
              clearInterval(checkInterval);
              playNextInQueue();
              return;
            }

            try {
              // If duration is set and currentTime >= duration, playback finished
              if (player.duration && player.currentTime >= player.duration) {
                clearInterval(checkInterval);
                // Small delay to ensure audio fully finished
                setTimeout(() => {
                  playNextInQueue();
                }, 100);
                return;
              }
            } catch {
              // If we can't access properties, skip to next
              clearInterval(checkInterval);
              playNextInQueue();
            }
          }, 200);
        } catch (e) {
          console.warn('Azure TTS playback error:', e);
          playNextInQueue(); // Continue queue on error
        }
      }
    } else {
      playNextInQueue(); // Continue queue if no URI
    }
  }, [langCode]);

  const guide = useCallback(
    (text: string, delayMs = 0, volume = 1.0) => {
      const run = () => {
        // Add to queue instead of playing immediately
        queueRef.current.push({ text, volume });

        // Start playing if not already playing
        if (!isPlayingRef.current) {
          isPlayingRef.current = true;
          playNextInQueue();
        }
      };

      if (delayMs > 0) setTimeout(run, delayMs);
      else run();
    },
    [playNextInQueue],
  );

  const guideHint = useCallback(
    (text: string, delayMs = 0) => guide(text, delayMs),
    [guide],
  );

  const stop = useCallback(() => {
    if (playerRef.current) {
      try { playerRef.current.pause(); } catch {}
    }
    stopSpeaking();
  }, []);

  return { guide, guideHint, stop, scripts };
}
