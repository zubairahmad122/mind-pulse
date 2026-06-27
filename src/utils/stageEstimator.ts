/**
 * stageEstimator — Deterministic sleep stage estimation from a session ID.
 *
 * Uses a simple string hash to derive stable proportions for
 * light / REM / deep sleep so the same session always shows the
 * same breakdown without needing real polysomnography data.
 */

import type { SleepStageData } from '@/components/sleep/SleepSummaryCard';

/**
 * Simple string → number hash (djb2 variant).
 * Returns a value in [0, 1) that is stable for the same input.
 */
function hashSeed(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) + hash + id.charCodeAt(i)) | 0;
  }
  // Fold into [0, 1)
  return (hash >>> 0) / 4_294_967_296;
}

/**
 * Derive realistic sleep stage proportions from a session identifier.
 *
 * Realistic ranges (based on population norms for healthy adults):
 *   Deep:  15–25%
 *   REM:   20–25%
 *   Light: 50–60%  (remainder)
 */
export function estimateStages(sessionId: string, totalMinutes: number): SleepStageData {
  const seed = hashSeed(sessionId);

  // Deep:  0.15 → 0.25
  const deep = 0.15 + seed * 0.10;

  // REM:   0.20 → 0.25
  // Use a second hash so REM is not strictly correlated with deep
  const remSeed = hashSeed(sessionId + '_rem');
  const rem = 0.20 + remSeed * 0.05;

  // Light: remainder — the tight bounds on deep (15–25%) and REM (20–25%)
  // naturally keep light in the 50–65% range without an explicit clamp.
  const light = 1 - deep - rem;

  return { totalMinutes, lightPct: light, remPct: rem, deepPct: deep };
}
