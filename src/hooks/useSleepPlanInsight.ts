import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateSleepPlanInsight } from '@/services/gemini';
import { useSleep } from '@/context/SleepContext';
import { useSleepReadiness } from '@/hooks/useSleepReadiness';
import type { SleepSession } from '@/utils/sleepUtils';
import {
  buildPlanFingerprint,
  getCachedPlanFingerprint,
  getCachedPlanInsight,
  setCachedPlanFingerprint,
  setCachedPlanInsight,
} from '@/services/sleepPlanInsightCache';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "HH:MM" 24h → "6:30 AM". */
function formatTimeAmPm(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const hh24 = h % 24;
  const hour12 = hh24 === 0 ? 12 : hh24 > 12 ? hh24 - 12 : hh24;
  const ampm = hh24 < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Minutes between two "HH:MM" times, wrapping overnight. */
function diffMinutes(from: string, to: string): number {
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  let diff = th * 60 + tm - (fh * 60 + fm);
  if (diff <= 0) diff += 1440;
  return diff;
}

function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = avg(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}

/** Spec-style computed fallback, e.g.
 *  "If you sleep at 11:00 PM and wake at 6:30 AM, you'll get 7h 30m of sleep." */
function computeFallback(bedtime: string, wakeTime: string): string {
  const mins = diffMinutes(bedtime, wakeTime);
  return `If you sleep at ${formatTimeAmPm(bedtime)} and wake at ${formatTimeAmPm(
    wakeTime,
  )}, you'll get ${durationLabel(mins)} of sleep.`;
}

export interface SleepPlanInsight {
  /** The insight sentence (Gemini-generated or computed fallback). */
  text: string;
  /** True while a fresh Gemini insight is loading in the background. */
  loading: boolean;
  /** True when `text` came from Gemini (vs. the computed fallback). */
  isAi: boolean;
}

/**
 * Returns a short insight about the user's currently-planned bedtime/wake time.
 *
 * Shows the computed fallback immediately, then fires Gemini in the background
 * (debounced via fingerprint) for a personalized, history-aware version. The
 * result is cached so it appears instantly next time the plan is unchanged.
 */
export function useSleepPlanInsight(params: {
  bedtime: string;
  wakeTime: string;
  goalLabel: string;
}): SleepPlanInsight {
  const { bedtime, wakeTime, goalLabel } = params;

  const readiness = useSleepReadiness();
  const { sessions } = useSleep();

  // Cheap, local history metrics (last 30 days) for Gemini context — avoids
  // pulling in useSleepRecommendation, which would fire its own Gemini call.
  const history = useMemo(() => {
    const cutoff = Date.now() - 30 * 86_400_000;
    const recent: SleepSession[] = sessions.filter(
      s => s.startTime >= cutoff && s.durationMinutes > 0,
    );
    if (recent.length === 0) {
      return { avgDurationHours: null as number | null, consistencyScore: null as number | null, sessionCount: 0 };
    }
    const avgDur = Math.round(avg(recent.map(s => s.durationMinutes / 60)) * 10) / 10;
    const bedMinutes = recent.map(s => {
      const d = new Date(s.startTime);
      return d.getHours() * 60 + d.getMinutes();
    });
    const consistency = Math.round(Math.min(100, Math.max(0, 100 - stdDev(bedMinutes) * 1.5)));
    return { avgDurationHours: avgDur, consistencyScore: consistency, sessionCount: recent.length };
  }, [sessions]);

  const fallback = computeFallback(bedtime, wakeTime);
  const [text, setText] = useState(fallback);
  const [isAi, setIsAi] = useState(false);
  const [cacheChecked, setCacheChecked] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const prevFingerprintRef = useRef('');

  const currentFingerprint = buildPlanFingerprint({ bedtime, wakeTime, goalLabel });

  // Always keep the displayed fallback in sync with the plan until Gemini answers.
  useEffect(() => {
    if (!isAi) setText(fallback);
  }, [fallback, isAi]);

  // Load cached insight on mount, but only reuse it if the plan still matches.
  const loadCached = useCallback(async () => {
    const [cached, cachedFp] = await Promise.all([
      getCachedPlanInsight(),
      getCachedPlanFingerprint(),
    ]);
    if (cached && cachedFp === currentFingerprint) {
      setText(cached);
      setIsAi(true);
      prevFingerprintRef.current = currentFingerprint;
    }
    setCacheChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  // Fire Gemini when the plan changes (after cache check + recommendation data ready).
  useEffect(() => {
    if (!cacheChecked) return;
    if (currentFingerprint === prevFingerprintRef.current) return;

    prevFingerprintRef.current = currentFingerprint;
    setIsAi(false);
    setText(fallback);
    setGeminiLoading(true);

    const mins = diffMinutes(bedtime, wakeTime);

    generateSleepPlanInsight({
      bedtime: formatTimeAmPm(bedtime),
      wakeTime: formatTimeAmPm(wakeTime),
      durationLabel: durationLabel(mins),
      goalLabel,
      readinessScore: readiness.score,
      avgDurationHours: history.avgDurationHours,
      consistencyScore: history.consistencyScore,
      sessionCount: history.sessionCount,
    })
      .then(async (aiInsight) => {
        if (aiInsight && currentFingerprint === prevFingerprintRef.current) {
          setText(aiInsight);
          setIsAi(true);
          await setCachedPlanInsight(aiInsight);
          await setCachedPlanFingerprint(currentFingerprint);
        }
      })
      .catch(() => {
        /* keep fallback */
      })
      .finally(() => {
        setGeminiLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheChecked, currentFingerprint]);

  return { text, loading: geminiLoading, isAi };
}
