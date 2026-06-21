import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSleep } from '@/context/SleepContext';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { generateSleepTip } from '@/services/gemini';
import {
  getCachedSleepTip,
  setCachedSleepTip,
  buildSleepFingerprint,
  getCachedFingerprint,
  setCachedFingerprint,
} from '@/services/sleepTipCache';
import { circularMinuteDiff } from '@/utils/scoring';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Convert "HH:MM" to total minutes since midnight. */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Format a date's time portion as "HH:MM" 24h. */
function toTimeStr(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Average of an array. */
function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Standard deviation — lower = more consistent. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = avg(values);
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Format minutes-since-midnight to 12h display like "11:00 PM". */
function formatMinuteTo12h(minutes: number): string {
  const h24 = Math.round(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Rule-based fallback when Gemini is unavailable. */
function fallbackMessage(params: {
  avgBedtime: string;
  avgWakeTime: string;
  avgDurationHours: number;
  consistencyScore: number;
  avgQuality: number | null;
  sessionCount: number;
  scheduleBedtime: string;
  scheduleWakeTime: string;
  scheduleDuration: number;
}): string {
  const { avgBedtime, avgWakeTime, avgDurationHours, consistencyScore, avgQuality, sessionCount } = params;

  if (sessionCount === 0) {
    return `Try sleeping at ${params.scheduleBedtime} and waking at ${params.scheduleWakeTime} for ${params.scheduleDuration} hours. Log your first session to get data-backed advice.`;
  }

  const parts: string[] = [];
  parts.push(`Based on your last ${sessionCount} sessions, you typically sleep from ${avgBedtime} to ${avgWakeTime} (~${avgDurationHours}h)`);

  if (avgQuality != null) {
    parts.push(avgQuality >= 4 ? 'with good quality.' : avgQuality >= 3 ? 'with decent quality.' : '— quality could improve.');
  } else {
    parts.push('.');
  }

  if (sessionCount >= 3) {
    if (consistencyScore >= 80) parts.push('Great consistency — keep it up.');
    else if (consistencyScore >= 50) parts.push('Your schedule is somewhat irregular — try a more consistent bedtime.');
    else parts.push('Your bedtimes vary a lot — setting a fixed bedtime can improve your rest.');
  }

  if (avgDurationHours < 6.5 && sessionCount >= 3) {
    parts.push(`You're averaging only ${avgDurationHours}h — aim for 7–9 hours.`);
  } else if (avgDurationHours < 7 && sessionCount >= 3) {
    parts.push(`Close to optimal at ${avgDurationHours}h — try winding down 30 min earlier.`);
  }

  if (avgQuality != null && avgQuality < 3 && sessionCount >= 3) {
    parts.push('Your sleep quality is below average — a wind-down routine may help.');
  }

  return parts.join(' ');
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export interface SleepRecommendation {
  message: string;
  avgBedtime: string;
  avgWakeTime: string;
  avgDurationHours: number;
  sessionCount: number;
  consistencyScore: number;
  loading: boolean;
}

/**
 * Analyzes real sleep sessions + journal entries and calls Gemini to
 * generate a personalised sleep recommendation.
 *
 * Shows the last-cached Gemini tip (or a rule-based fallback) immediately,
 * then fires Gemini in the background. If the data fingerprint hasn't
 * changed since the last cache, Gemini is skipped entirely.
 */
export function useSleepRecommendation(): SleepRecommendation {
  const { user, isGuestMode } = useAuth();
  const { sessions } = useSleep();
  const { schedule, loading: scheduleLoading } = useSleepSchedule(user?.uid, isGuestMode);
  const { entries: journalEntries } = useJournal(user?.uid, isGuestMode);

  const [message, setMessage] = useState<string>('');
  const [cachedFingerprintChecked, setCachedFingerprintChecked] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const prevFingerprintRef = useRef('');

  // ── Compute metrics from raw data ──
  const defaultBedtime = schedule?.bedtime ?? '23:00';
  const defaultWake = schedule?.wakeTime ?? '06:30';
  const defaultDuration = schedule?.duration ?? 7.5;

  const cutoff = Date.now() - 30 * 86_400_000;
  const recent = sessions
    .filter(s => s.startTime >= cutoff && s.durationMinutes > 0)
    .sort((a, b) => b.startTime - a.startTime);

  const bedMinutes = recent.map(s => {
    const d = new Date(s.startTime);
    return d.getHours() * 60 + d.getMinutes();
  });
  const wakeMinutes = recent.map(s => {
    const d = new Date(s.endTime);
    return d.getHours() * 60 + d.getMinutes();
  });
  const durations = recent.map(s => s.durationMinutes / 60);
  const qualities = recent.filter(s => s.quality > 0).map(s => s.quality);

  const avgBedMin = bedMinutes.length > 0 ? Math.round(avg(bedMinutes)) : timeToMinutes(defaultBedtime);
  const avgWakeMin = wakeMinutes.length > 0 ? Math.round(avg(wakeMinutes)) : timeToMinutes(defaultWake);
  const avgDur = durations.length > 0 ? Math.round(avg(durations) * 10) / 10 : defaultDuration;
  const avgQual = qualities.length > 0 ? Math.round(avg(qualities) * 10) / 10 : null;

  const bedStd = stdDev(bedMinutes);
  const wakeStd = stdDev(wakeMinutes);
  const consistencyRaw = avg([Math.max(0, 100 - bedStd * 1.5), Math.max(0, 100 - wakeStd * 1.5)]);
  const consistencyScore = Math.round(Math.min(100, consistencyRaw));

  const avgBedtimeFormatted = formatMinuteTo12h(avgBedMin);
  const avgWakeTimeFormatted = formatMinuteTo12h(avgWakeMin);
  const scheduleBedtimeFormatted = formatMinuteTo12h(timeToMinutes(defaultBedtime));
  const scheduleWakeFormatted = formatMinuteTo12h(timeToMinutes(defaultWake));

  // Recent journal entries for Gemini context
  const recentJournalEntries = journalEntries.slice(0, 5).map(e => ({
    mood: e.mood,
    triggers: e.triggers,
    text: e.text,
    aiInsight: e.aiInsight,
  }));

  const currentFingerprint = buildSleepFingerprint({
    avgBedtime: avgBedtimeFormatted,
    avgWakeTime: avgWakeTimeFormatted,
    avgDurationHours: avgDur,
    consistencyScore,
    sessionCount: recent.length,
    journalEntryCount: recentJournalEntries.length,
  });

  // ── Load cached tip on mount ──
  const loadCached = useCallback(async () => {
    const cached = await getCachedSleepTip();
    if (cached) setMessage(cached);
    setCachedFingerprintChecked(true);
  }, []);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  // ── Fire Gemini when data is ready and fingerprint has changed ──
  useEffect(() => {
    if (!cachedFingerprintChecked || scheduleLoading) return;
    if (currentFingerprint === prevFingerprintRef.current) return;

    prevFingerprintRef.current = currentFingerprint;
    setGeminiLoading(true);

    generateSleepTip({
      avgBedtime: avgBedtimeFormatted,
      avgWakeTime: avgWakeTimeFormatted,
      avgDurationHours: avgDur,
      consistencyScore,
      avgQuality: avgQual,
      sessionCount: recent.length,
      scheduleBedtime: scheduleBedtimeFormatted,
      scheduleWakeTime: scheduleWakeFormatted,
      recentJournalEntries,
    }).then(async (geminiTip) => {
      if (geminiTip) {
        setMessage(geminiTip);
        await setCachedSleepTip(geminiTip);
        await setCachedFingerprint(currentFingerprint);
      } else {
        // Gemini unavailable — use rule-based fallback
        const fb = fallbackMessage({
          avgBedtime: avgBedtimeFormatted,
          avgWakeTime: avgWakeTimeFormatted,
          avgDurationHours: avgDur,
          consistencyScore,
          avgQuality: avgQual,
          sessionCount: recent.length,
          scheduleBedtime: scheduleBedtimeFormatted,
          scheduleWakeTime: scheduleWakeFormatted,
          scheduleDuration: defaultDuration,
        });
        setMessage(fb);
      }
    }).catch(() => {
      const fb = fallbackMessage({
        avgBedtime: avgBedtimeFormatted,
        avgWakeTime: avgWakeTimeFormatted,
        avgDurationHours: avgDur,
        consistencyScore,
        avgQuality: avgQual,
        sessionCount: recent.length,
        scheduleBedtime: scheduleBedtimeFormatted,
        scheduleWakeTime: scheduleWakeFormatted,
        scheduleDuration: defaultDuration,
      });
      setMessage(fb);
    }).finally(() => {
      setGeminiLoading(false);
    });
  }, [
    cachedFingerprintChecked,
    scheduleLoading,
    currentFingerprint,
    avgBedtimeFormatted,
    avgWakeTimeFormatted,
    avgDur,
    consistencyScore,
    avgQual,
    recent.length,
    scheduleBedtimeFormatted,
    scheduleWakeFormatted,
    defaultDuration,
    recentJournalEntries,
  ]);

  // ── If not yet checked cache, show a minimal placeholder ──
  const initialFallback = fallbackMessage({
    avgBedtime: avgBedtimeFormatted,
    avgWakeTime: avgWakeTimeFormatted,
    avgDurationHours: avgDur,
    consistencyScore,
    avgQuality: avgQual,
    sessionCount: recent.length,
    scheduleBedtime: scheduleBedtimeFormatted,
    scheduleWakeTime: scheduleWakeFormatted,
    scheduleDuration: defaultDuration,
  });

  return {
    message: message || initialFallback,
    avgBedtime: toTimeStr(new Date(0, 0, 0, Math.floor(avgBedMin / 60), avgBedMin % 60)),
    avgWakeTime: toTimeStr(new Date(0, 0, 0, Math.floor(avgWakeMin / 60), avgWakeMin % 60)),
    avgDurationHours: avgDur,
    sessionCount: recent.length,
    consistencyScore,
    loading: geminiLoading || scheduleLoading,
  };
}
