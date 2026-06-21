import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { generateHomeInsight, generateTagline } from '@/services/gemini';
import { getHomeInsight, getInsightMessage, type FocusArea, type ScoreResult } from '@/utils/scoring';

const CACHE_KEY_INSIGHT = '@mindpulse/home-insight-cache';
const CACHE_KEY_TAGLINE = '@mindpulse/home-tagline-cache';

export interface HomeInsightResult {
  /** The narrative insight shown on the score card. */
  insight: string;
  /** The short tagline shown below the breakdown. */
  tagline: string;
  /** True while Gemini is loading (fallback rule-based text shown). */
  loading: boolean;
}

/**
 * Returns the weakest breakdown detail for a given score result,
 * so Gemini gets the full context about what's dragging the score down.
 */
function weakestDetail(result: ScoreResult): string {
  if (result.breakdown.length === 0) return 'no data';
  const sorted = [...result.breakdown].sort(
    (a, b) => a.points / a.maxPoints - b.points / b.maxPoints,
  );
  return sorted[0].detail;
}

/** Fallback tagline when Gemini is unavailable. */
function fallbackTagline(focusArea: string, score: number, hour: number): string {
  if (score >= 75) return 'Your numbers are looking great — keep up the momentum';
  if (score >= 50) {
    if (focusArea === 'Eyes') return 'A little eye care would go a long way today';
    if (focusArea === 'Sleep') return 'A bit more rest would help you feel sharper';
    return 'A moment of calm could help your mind today';
  }
  if (hour >= 22 || hour < 5) return 'Late night — your body is craving rest';
  if (hour < 12) return "Fresh start — let's build healthy momentum today";
  if (hour < 17) return 'Midday check — small breaks keep your numbers stable';
  return 'Winding down — prepare for quality rest tonight';
}

/**
 * Hook that provides home-screen insights powered by Gemini.
 *
 * Shows rule-based fallback text immediately on first load, then fires
 * Gemini in the background. Once Gemini responds, the insight & tagline
 * update. Results are cached in AsyncStorage so returning users see
 * their last Gemini response immediately while a fresh one loads.
 */
export function useHomeInsight(params: {
  eye: ScoreResult;
  sleep: ScoreResult;
  mind: ScoreResult;
  focusArea: FocusArea;
  mindPulseScore: number;
  anyLoading: boolean;
}): HomeInsightResult {
  const { eye, sleep, mind, focusArea, mindPulseScore, anyLoading } = params;

  // Rule-based fallbacks computed synchronously
  const fallbackInsight = getHomeInsight({ eye, sleep, mind });
  const fallbackTag = fallbackTagline(focusArea, mindPulseScore, new Date().getHours());

  const [insight, setInsight] = useState(fallbackInsight);
  const [tagline, setTagline] = useState(fallbackTag);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const prevFingerprintRef = useRef('');

  // Grab cached values on mount (fast render)
  useEffect(() => {
    async function loadCache() {
      const [cachedInsight, cachedTagline] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY_INSIGHT),
        AsyncStorage.getItem(CACHE_KEY_TAGLINE),
      ]);
      if (cachedInsight) setInsight(cachedInsight);
      if (cachedTagline) setTagline(cachedTagline);
    }
    loadCache();
  }, []);

  // Fire Gemini whenever scores change meaningfully
  useEffect(() => {
    // Build a fingerprint of the current scores to detect meaningful changes
    const fingerprint = `${mindPulseScore}-${eye.score}-${sleep.score}-${mind.score}-${focusArea}`;
    if (anyLoading || fingerprint === prevFingerprintRef.current) return;
    prevFingerprintRef.current = fingerprint;

    const hour = new Date().getHours();
    setGeminiLoading(true);

    void Promise.all([
      generateHomeInsight({
        mindPulseScore,
        eyeScore: eye.score,
        sleepScore: sleep.score,
        mindScore: mind.score,
        focusArea,
        eyeDetail: weakestDetail(eye),
        sleepDetail: weakestDetail(sleep),
        mindDetail: weakestDetail(mind),
        hour,
      }),
      generateTagline({
        mindPulseScore,
        focusArea,
        hour,
      }),
    ]).then(([geminiInsight, geminiTagline]) => {
      if (geminiInsight) {
        setInsight(geminiInsight);
        AsyncStorage.setItem(CACHE_KEY_INSIGHT, geminiInsight).catch(() => {});
      }
      if (geminiTagline) {
        setTagline(geminiTagline);
        AsyncStorage.setItem(CACHE_KEY_TAGLINE, geminiTagline).catch(() => {});
      }
    }).finally(() => {
      setGeminiLoading(false);
    });
  }, [mindPulseScore, eye.score, sleep.score, mind.score, focusArea, anyLoading]);

  return {
    insight,
    tagline,
    loading: geminiLoading || anyLoading,
  };
}
