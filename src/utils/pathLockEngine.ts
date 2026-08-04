import type { SeededRandom } from './seededRandom';

/**
 * Pure engine for the Path Lock stage: a single target continuously travels
 * a path and periodically enters a brief "lock" window — the player taps
 * only during that window. No grid, no symbols; timing-gated, not
 * position-gated (the whole canvas is the tap zone), keeping rounds short
 * and energetic per spec. Visual path shape is a rendering concern (the UI
 * layer); this file only owns the lock-window timing math and its two path
 * variants' *normalized position* for rendering reference.
 */
export type PathShape = 'circle' | 'figure-eight';

export interface PathLockRound {
  roundIndex: number;
  shape: PathShape;
  /** Full loop duration, ms. */
  cycleMs: number;
  /** How long the lock window stays open at the end of each cycle, ms. */
  lockWindowMs: number;
}

const CYCLE_MS = 1700;
const LOCK_WINDOW_MS = 480;
export const PATH_LOCK_BASE_POINTS = 110;

export function generatePathLockRound(rng: SeededRandom, roundIndex: number): PathLockRound {
  const shape: PathShape = rng() < 0.5 ? 'circle' : 'figure-eight';
  return { roundIndex, shape, cycleMs: CYCLE_MS, lockWindowMs: LOCK_WINDOW_MS };
}

/** True during the brief window (the tail end of each cycle) when a tap counts as correct. */
export function isPathLocked(round: PathLockRound, elapsedMs: number): boolean {
  const posInCycle = ((elapsedMs % round.cycleMs) + round.cycleMs) % round.cycleMs;
  return posInCycle >= round.cycleMs - round.lockWindowMs;
}

export type PathLockTapClassification = 'correct' | 'wrong';

export function classifyPathLockTap(round: PathLockRound, elapsedMs: number): PathLockTapClassification {
  return isPathLocked(round, elapsedMs) ? 'correct' : 'wrong';
}

/** Normalized (0..1, 0..1) target position for the given path shape at a
 *  given point in its cycle — a rendering reference only; the UI is free to
 *  animate this with Reanimated rather than recomputing it every frame from
 *  JS. Not used for scoring (scoring is purely time-gated via isPathLocked). */
export function pathPosition(shape: PathShape, progress: number): { x: number; y: number } {
  const t = progress * Math.PI * 2;
  if (shape === 'circle') {
    return { x: 0.5 + 0.38 * Math.cos(t), y: 0.5 + 0.38 * Math.sin(t) };
  }
  // Figure-eight (lemniscate-like), normalized into [0,1].
  const denom = 1 + Math.sin(t) * Math.sin(t);
  return {
    x: 0.5 + (0.4 * Math.cos(t)) / denom,
    y: 0.5 + (0.25 * Math.sin(t) * Math.cos(t)) / denom,
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Reaction measured from the moment the lock window opened. */
export function pathLockSpeedBonus(reactionMs: number, round: PathLockRound): number {
  return Math.round(clamp01(1 - reactionMs / round.lockWindowMs) * 20);
}

export function pointsForPathLockTap(reactionMs: number, round: PathLockRound): number {
  return PATH_LOCK_BASE_POINTS + pathLockSpeedBonus(reactionMs, round);
}
