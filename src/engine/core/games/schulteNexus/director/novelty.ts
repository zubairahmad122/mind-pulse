import type { SchulteFamily } from '../types';
import type { SchulteMissionAttempt, SchulteMissionBand } from './types';

export interface SchulteNoveltyMeta {
  readonly family: SchulteFamily;
  readonly geometry: string;
  readonly targetCount: number;
  readonly direction: 'asc' | 'desc' | 'other';
  readonly band: SchulteMissionBand;
  /** Semantic key for anti-repeat: family+start+end+targetCount */
  readonly semanticKey: string;
}

/**
 * Creates a semantic key that captures the "feel" of a mission.
 * Two missions with the same semantic key are perceived as the same task
 * even if the board shuffle differs.
 *
 * Uses min/max of the range to avoid treating ascending 1→9 and
 * descending 9→1 as different semantic missions (they're the same task
 * in opposite directions).
 */
export function createSemanticKey(
  family: SchulteFamily,
  targetSequence: readonly number[],
  targetCount: number,
): string {
  if (!targetSequence || targetSequence.length === 0) return `${family}:empty:${targetCount}`;
  const min = Math.min(...targetSequence);
  const max = Math.max(...targetSequence);
  return `${family}:${min}-${max}:${targetCount}`;
}

/**
 * Extracts semantic key from a persisted mission attempt.
 */
export function semanticKeyFromAttempt(attempt: SchulteMissionAttempt): string {
  return createSemanticKey(attempt.family, attempt.targetSequence, attempt.targetCount);
}

/**
 * Checks if a candidate's semantic key matches any recent mission's semantic key.
 * Returns true if this would be a perceived repetition.
 */
export function isSemanticRepeat(
  candidateSemanticKey: string,
  recentSemanticKeys: readonly string[],
): boolean {
  return recentSemanticKeys.includes(candidateSemanticKey);
}

/**
 * Weighted novelty, not a hard rule — exact-signature rejection is the only
 * absolute in the system (see `shouldRejectCandidate`). `recent` is expected
 * pre-trimmed to the anti-repetition window (5–10 missions).
 *
 * Semantic repeat (same family + start/end + target count) gets a heavy
 * penalty because the player perceives it as the same mission.
 */
export function calculateNoveltyScore(
  candidate: SchulteNoveltyMeta,
  recent: readonly SchulteNoveltyMeta[],
): number {
  let score = 1;

  // Heavy penalty for semantic repeat (same family + range + count)
  const semanticMatches = recent.filter(r => r.semanticKey === candidate.semanticKey).length;
  if (semanticMatches > 0) {
    // Semantic duplicate is almost always rejected — this is the core fix
    score -= 0.7;
  }

  score -= recent.filter(r => r.family === candidate.family).length * 0.12;
  if (recent[0]?.family === candidate.family) score -= 0.15;
  score -= recent.filter(r => r.geometry === candidate.geometry).length * 0.08;
  score -= recent.filter(r => r.targetCount === candidate.targetCount).length * 0.06;
  score -= recent.filter(r => r.direction === candidate.direction).length * 0.06;
  score -= recent.filter(r => r.band === candidate.band).length * 0.05;
  return Math.max(0, Math.min(1, score));
}

/** The one hard rule: a completed exact signature is never served by Next Challenge. */
export function shouldRejectCandidate(signature: string, completedSignatures: readonly string[]): boolean {
  return completedSignatures.includes(signature);
}
