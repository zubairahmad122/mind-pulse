import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { generateDailyTip } from '@/services/gemini';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';

const CACHE_KEY_TIP = '@mindpulse/daily-tip';
const CACHE_KEY_DATE = '@mindpulse/daily-tip-date';
const FINGERPRINT_KEY = '@mindpulse/daily-tip-fingerprint';

/** Hardcoded fallbacks — cycled through based on the day of month so users see variety. */
const FALLBACK_TIPS = [
  'Dim screens 60 minutes before bed — your brain needs darkness to release melatonin naturally.',
  'A 5-minute box breathing session can calm your nervous system between stressful meetings.',
  'Try the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.',
  'Your body holds tension in your jaw and shoulders — a quick body scan can help you release it.',
  'Taking 3 deep breaths before answering a stressful message can change your whole response.',
  'A consistent wake time matters more than a consistent bedtime for regulating your sleep cycle.',
  'Journaling for just 2 minutes can help you process emotions you didn\'t even notice.',
  'Natural morning light within 30 minutes of waking helps set your circadian rhythm.',
  'Your eyes need a 15-second break every 10 minutes of screen time to reduce strain.',
  'Hydration affects your mood more than you think — aim for a glass of water every 2 hours.',
];

function pickFallback(focusArea: string): string {
  // Pick a fallback that's vaguely relevant to the focus area
  const eyeTips = [0, 2, 8];
  const sleepTips = [1, 5, 7];
  const mindTips = [3, 4, 6, 9];

  const pool = focusArea === 'Eyes' ? eyeTips
    : focusArea === 'Sleep' ? sleepTips
    : mindTips;

  const idx = new Date().getDate() % pool.length;
  return FALLBACK_TIPS[pool[idx]];
}

/**
 * Hook that provides a Gemini-generated daily wellness tip for the home screen.
 *
 * Shows a rule-based fallback immediately, then fires Gemini in the background
 * with the user's scores + recent journal entries. The tip is cached in AsyncStorage
 * so it persists across sessions and is refreshed only when the data fingerprint changes.
 */
export function useDailyTip(params: {
  mindPulseScore: number;
  eyeScore: number;
  sleepScore: number;
  mindScore: number;
  focusArea: string;
  anyLoading: boolean;
}): { tip: string; loading: boolean } {
  const { user, isGuestMode } = useAuth();
  const { entries: journalEntries } = useJournal(user?.uid, isGuestMode);

  const [tip, setTip] = useState(() => pickFallback(params.focusArea));
  const [geminiLoading, setGeminiLoading] = useState(false);
  const prevFingerprintRef = useRef('');

  // Recent journal entries for Gemini context
  const recentJournalEntries = journalEntries.slice(0, 5).map(e => ({
    mood: e.mood,
    triggers: e.triggers,
    text: e.text,
  }));

  // Build fingerprint
  const journalSummary = recentJournalEntries.map(e => `${e.mood}:${e.triggers.sort().join()}`).join('|');
  const currentFingerprint = `${params.mindPulseScore}-${params.eyeScore}-${params.sleepScore}-${params.mindScore}-${params.focusArea}-${journalSummary}`;

  // Load cached tip on mount (skip if cached today)
  const loadCached = useCallback(async () => {
    try {
      const [cachedTip, cachedDate] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY_TIP),
        AsyncStorage.getItem(CACHE_KEY_DATE),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      if (cachedTip && cachedDate === today) {
        setTip(cachedTip);
      }
    } catch {
      // fall through
    }
  }, []);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  // Fire Gemini when data is ready and fingerprint changes
  useEffect(() => {
    if (params.anyLoading) return;
    if (currentFingerprint === prevFingerprintRef.current) return;

    prevFingerprintRef.current = currentFingerprint;
    setGeminiLoading(true);

    generateDailyTip({
      mindPulseScore: params.mindPulseScore,
      eyeScore: params.eyeScore,
      sleepScore: params.sleepScore,
      mindScore: params.mindScore,
      focusArea: params.focusArea,
      recentJournalEntries,
    }).then(async (geminiTip) => {
      if (geminiTip) {
        setTip(geminiTip);
        const today = new Date().toISOString().slice(0, 10);
        await Promise.all([
          AsyncStorage.setItem(CACHE_KEY_TIP, geminiTip),
          AsyncStorage.setItem(CACHE_KEY_DATE, today),
          AsyncStorage.setItem(FINGERPRINT_KEY, currentFingerprint),
        ]);
      }
    }).finally(() => {
      setGeminiLoading(false);
    });
  }, [currentFingerprint, params.anyLoading, params.mindPulseScore, params.eyeScore, params.sleepScore, params.mindScore, params.focusArea, recentJournalEntries]);

  return { tip, loading: geminiLoading || params.anyLoading };
}
