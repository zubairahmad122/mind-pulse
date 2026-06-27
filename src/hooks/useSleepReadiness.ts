import { useSleep } from '@/context/SleepContext';
import { calculateStreak, type SleepSession } from '@/utils/sleepUtils';
import { useMemo } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Standard deviation in minutes — lower = more consistent bedtimes. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = avg(values);
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type ReadinessLevel = 'low' | 'fair' | 'good' | 'high';

export interface SleepReadiness {
  /** 0–100 readiness score. */
  score: number;
  level: ReadinessLevel;
  label: string;
  color: string;
  /** One-line, human explanation of the score. */
  summary: string;
  /** Number of sessions in the last 7 days used for the score. */
  sessionCount: number;
}

function levelFor(score: number): { level: ReadinessLevel; label: string; color: string } {
  if (score < 35) return { level: 'low', label: 'Low Readiness', color: '#f97316' };
  if (score < 60) return { level: 'fair', label: 'Building Recovery', color: '#facc15' };
  if (score < 80) return { level: 'good', label: 'Good Readiness', color: '#4FC3F7' };
  return { level: 'high', label: 'Fully Recovered', color: '#34d399' };
}

/**
 * Computes a "sleep readiness" score from real session history — how recovered
 * the user is likely to feel based on the last week of sleep.
 *
 * Weighting:
 *   Recent duration vs goal   40%
 *   Bedtime consistency       25%
 *   Recent quality            20%
 *   Logging streak            15%
 *
 * With no data, returns a neutral mid-score so the indicator still reads sensibly.
 */
export function useSleepReadiness(goalHours = 8): SleepReadiness {
  const { sessions } = useSleep();

  return useMemo(() => {
    const cutoff = Date.now() - 7 * 86_400_000;
    const recent: SleepSession[] = sessions
      .filter(s => s.startTime >= cutoff && s.durationMinutes > 0)
      .sort((a, b) => b.startTime - a.startTime);

    if (recent.length === 0) {
      const meta = levelFor(55);
      return {
        score: 55,
        ...meta,
        summary: 'Track a night of sleep to personalize your readiness.',
        sessionCount: 0,
      };
    }

    // Duration vs goal — full marks within ±0.5h of goal, decaying outward.
    const durations = recent.map(s => s.durationMinutes / 60);
    const avgDur = avg(durations);
    const durDiff = Math.abs(avgDur - goalHours);
    const durationSub = clamp(100 - Math.max(0, durDiff - 0.5) * 22, 15, 100);

    // Bedtime consistency — based on the spread of bedtimes (minutes of day).
    const bedMinutes = recent.map(s => {
      const d = new Date(s.startTime);
      return d.getHours() * 60 + d.getMinutes();
    });
    const consistencySub = clamp(100 - stdDev(bedMinutes) * 1.4, 20, 100);

    // Recent quality (1–5) → 0–100.
    const qualities = recent.filter(s => s.quality > 0).map(s => s.quality);
    const qualitySub = qualities.length > 0 ? clamp(avg(qualities) * 20, 0, 100) : 60;

    // Streak — capped contribution at 7 logged days.
    const streak = calculateStreak(sessions);
    const streakSub = clamp(40 + Math.min(streak, 7) * 9, 0, 100);

    const score = Math.round(
      durationSub * 0.4 + consistencySub * 0.25 + qualitySub * 0.2 + streakSub * 0.15,
    );

    const meta = levelFor(score);

    // Build a short, traceable summary from the weakest contributor.
    let summary: string;
    if (avgDur < goalHours - 0.75) {
      summary = `Averaging ${avgDur.toFixed(1)}h recently — a little below your ${goalHours}h goal.`;
    } else if (consistencySub < 55) {
      summary = 'Your bedtimes have been varying — a steadier schedule will help.';
    } else if (qualities.length > 0 && avg(qualities) < 3) {
      summary = 'Recent sleep quality has been lower than usual.';
    } else if (score >= 80) {
      summary = `${avgDur.toFixed(1)}h average with steady timing — you're well recovered.`;
    } else {
      summary = `Based on your last ${recent.length} night${recent.length > 1 ? 's' : ''} of sleep.`;
    }

    return { score, ...meta, summary, sessionCount: recent.length };
  }, [sessions, goalHours]);
}
