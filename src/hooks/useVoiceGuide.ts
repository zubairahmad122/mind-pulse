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
  const queueRef = useRef<{ text: string; volume: number }[]>([]);
  const isPlayingRef = useRef(false);
  const stoppedRef = useRef(false);

  // Track pending timeouts so they can be cancelled on stop/unmount
  const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Cancel all tracked timeouts. */
  function clearPendingTimeouts() {
    for (const t of pendingTimeoutsRef.current) clearTimeout(t);
    pendingTimeoutsRef.current = [];
  }

  /** Guard: do not start new queue processing if stopped. */
  function canProceed(): boolean {
    return !stoppedRef.current;
  }

  /** Track a timeout so it can be cancelled later. */
  function trackTimeout(t: ReturnType<typeof setTimeout>): void {
    pendingTimeoutsRef.current.push(t);
  }

  // Cache which language prefixes have an installed TTS voice on this device.
  // Defaults to English-only until the async check resolves.
  const availLangsRef = useRef<Set<string>>(new Set(['en']));

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });

    void Speech.getAvailableVoicesAsync()
      .then(voices => {
        if (voices.length === 0) return;
        const prefixes = new Set(voices.map(v => v.language.split('-')[0]));
        availLangsRef.current = prefixes;
      })
      .catch(() => {});

    return () => {
      stoppedRef.current = true;
      clearPendingTimeouts();
      queueRef.current = [];
      isPlayingRef.current = false;
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
    if (!canProceed() || queueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    const { text, volume } = queueRef.current.shift()!;
    const sessLang: SessionLang = langCode === 'ps' ? 'ur' : (langCode as SessionLang);
    const uri = await getCachedTTSUri(text, sessLang);

    if (!canProceed()) {
      isPlayingRef.current = false;
      return;
    }

    if (uri) {
      const player = getPlayer();
      if (player) {
        try {
          player.replace({ uri });
          player.volume = Math.max(0, Math.min(1, volume));
          await player.play();

          if (!canProceed()) {
            try { player.pause(); } catch {}
            isPlayingRef.current = false;
            return;
          }

          let checkCount = 0;
          const checkInterval = setInterval(() => {
            checkCount++;
            if (!canProceed()) {
              clearInterval(checkInterval);
              isPlayingRef.current = false;
              return;
            }
            if (checkCount > 150) {
              clearInterval(checkInterval);
              playNextInQueue();
              return;
            }
            try {
              if (player.duration && player.currentTime >= player.duration) {
                clearInterval(checkInterval);
                const t = setTimeout(() => { playNextInQueue(); }, 100);
                trackTimeout(t);
                return;
              }
            } catch {
              clearInterval(checkInterval);
              playNextInQueue();
            }
          }, 200);
        } catch (e) {
          console.warn('Azure TTS playback error:', e);
          playNextInQueue();
        }
      }
    } else {
      // Fallback to device TTS when Azure is unavailable
      const bcp47 = langCode === 'hi' ? 'hi-IN' : langCode === 'ur' ? 'ur-PK' : langCode === 'ps' ? 'ur-PK' : 'en-US';
      if (availLangsRef.current.has(langCode === 'ps' ? 'ur' : langCode)) {
        Speech.speak(text, { language: bcp47, rate: 0.55, pitch: 0.78 });
        const estimatedMs = Math.max(2000, text.length * 100);
        const t = setTimeout(() => playNextInQueue(), estimatedMs);
        trackTimeout(t);
      } else {
        playNextInQueue();
      }
    }
  }, [langCode]);

  const guide = useCallback(
    (text: string, delayMs = 0, volume = 1.0) => {
      if (stoppedRef.current) return;

      const run = () => {
        if (stoppedRef.current) return;
        queueRef.current.push({ text, volume });
        if (!isPlayingRef.current) {
          isPlayingRef.current = true;
          playNextInQueue();
        }
      };

      if (delayMs > 0) {
        const t = setTimeout(run, delayMs);
        trackTimeout(t);
      } else {
        run();
      }
    },
    [playNextInQueue],
  );

  const guideHint = useCallback(
    (text: string, delayMs = 0) => guide(text, delayMs),
    [guide],
  );

  const stop = useCallback(() => {
    stoppedRef.current = true;
    clearPendingTimeouts();
    queueRef.current = [];
    isPlayingRef.current = false;
    if (playerRef.current) {
      try { playerRef.current.pause(); } catch {}
    }
    stopSpeaking();
  }, []);

  return { guide, guideHint, stop, scripts };
}
