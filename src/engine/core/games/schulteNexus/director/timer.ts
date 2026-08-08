import type { SchulteDirectorVector, SchulteMissionBand } from './types';

const HARD_CAP_MS = 60_000;
const FAIR_MIN_MS = 8_000;
const ROUND_STEP_MS = 500;

/**
 * Timer is a function of challenge complexity, never a random pick. Every
 * vector dimension nudges the total by a bounded percentage so no single
 * factor (e.g. time pressure) can push the result past the 60s hard cap or
 * below a fair minimum; rounded to a clean half-second step so the UI never
 * sees something like 23438.7ms.
 */
export function calculateAdaptiveTimeLimit(
  vector: SchulteDirectorVector,
  targetCount: number,
  masteryScore = 0,
): number {
  const baseMsPerTarget = 2600 - (vector.searchSpeed / 100) * 1400;
  let total = Math.max(1, targetCount) * baseMsPerTarget;

  total *= 1 + (vector.gridComplexity / 100) * 0.15;
  total *= 1 + (vector.sequenceComplexity / 100) * 0.12;
  total *= 1 + (vector.ruleSwitching / 100) * 0.1;
  total *= 1 + (vector.visualComplexity / 100) * 0.15;
  total *= 1 - (vector.timePressure / 100) * 0.35;
  total *= 1 - (Math.max(0, Math.min(100, masteryScore)) / 100) * 0.1;

  const rounded = Math.round(total / ROUND_STEP_MS) * ROUND_STEP_MS;
  return Math.max(FAIR_MIN_MS, Math.min(HARD_CAP_MS, rounded));
}

export function missionBandFor(timeLimitMs: number): SchulteMissionBand {
  if (timeLimitMs <= 30_000) return 'quick';
  if (timeLimitMs <= 45_000) return 'normal';
  return 'advanced';
}
