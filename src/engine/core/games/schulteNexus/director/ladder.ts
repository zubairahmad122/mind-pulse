import { SCHULTE_DIRECTOR_DIMENSIONS, type SchulteDirectorDimension, type SchulteDirectorVector } from './types';

/**
 * The Director's difficulty ladder — hand-authored, one dimension changed per
 * rung (mirrors the pattern already proven in `../ladder.ts`), so "increase
 * difficulty by one step" is structural rather than a judgment call at
 * generation time. `ladder.test.ts`-style tests assert the invariant.
 */
export const DIRECTOR_LADDER: readonly SchulteDirectorVector[] = [
  { searchSpeed: 0, targetCount: 0, gridComplexity: 0, sequenceComplexity: 0, ruleSwitching: 0, visualComplexity: 0, timePressure: 0 },
  { searchSpeed: 0, targetCount: 20, gridComplexity: 0, sequenceComplexity: 0, ruleSwitching: 0, visualComplexity: 0, timePressure: 0 },
  { searchSpeed: 20, targetCount: 20, gridComplexity: 0, sequenceComplexity: 0, ruleSwitching: 0, visualComplexity: 0, timePressure: 0 },
  { searchSpeed: 20, targetCount: 20, gridComplexity: 25, sequenceComplexity: 0, ruleSwitching: 0, visualComplexity: 0, timePressure: 0 },
  { searchSpeed: 20, targetCount: 20, gridComplexity: 25, sequenceComplexity: 25, ruleSwitching: 0, visualComplexity: 0, timePressure: 0 },
  { searchSpeed: 20, targetCount: 40, gridComplexity: 25, sequenceComplexity: 25, ruleSwitching: 0, visualComplexity: 0, timePressure: 0 },
  { searchSpeed: 40, targetCount: 40, gridComplexity: 25, sequenceComplexity: 25, ruleSwitching: 0, visualComplexity: 0, timePressure: 0 },
  { searchSpeed: 40, targetCount: 40, gridComplexity: 50, sequenceComplexity: 25, ruleSwitching: 0, visualComplexity: 0, timePressure: 0 },
  { searchSpeed: 40, targetCount: 40, gridComplexity: 50, sequenceComplexity: 50, ruleSwitching: 0, visualComplexity: 0, timePressure: 0 },
  { searchSpeed: 40, targetCount: 40, gridComplexity: 50, sequenceComplexity: 50, ruleSwitching: 0, visualComplexity: 0, timePressure: 20 },
  { searchSpeed: 40, targetCount: 60, gridComplexity: 50, sequenceComplexity: 50, ruleSwitching: 0, visualComplexity: 0, timePressure: 20 },
  { searchSpeed: 60, targetCount: 60, gridComplexity: 50, sequenceComplexity: 50, ruleSwitching: 0, visualComplexity: 0, timePressure: 20 },
  { searchSpeed: 60, targetCount: 60, gridComplexity: 75, sequenceComplexity: 50, ruleSwitching: 0, visualComplexity: 0, timePressure: 20 },
  { searchSpeed: 60, targetCount: 60, gridComplexity: 75, sequenceComplexity: 50, ruleSwitching: 40, visualComplexity: 0, timePressure: 20 },
  { searchSpeed: 60, targetCount: 60, gridComplexity: 75, sequenceComplexity: 50, ruleSwitching: 40, visualComplexity: 30, timePressure: 20 },
  { searchSpeed: 60, targetCount: 60, gridComplexity: 75, sequenceComplexity: 50, ruleSwitching: 40, visualComplexity: 30, timePressure: 40 },
];

export const DIRECTOR_LADDER_MIN_INDEX = 0;
export const DIRECTOR_LADDER_MAX_INDEX = DIRECTOR_LADDER.length - 1;

export function clampDirectorLadderIndex(index: number): number {
  if (!Number.isFinite(index)) return DIRECTOR_LADDER_MIN_INDEX;
  const rounded = Math.round(index);
  if (rounded < DIRECTOR_LADDER_MIN_INDEX) return DIRECTOR_LADDER_MIN_INDEX;
  if (rounded > DIRECTOR_LADDER_MAX_INDEX) return DIRECTOR_LADDER_MAX_INDEX;
  return rounded;
}

export function directorVectorAt(index: number): SchulteDirectorVector {
  return DIRECTOR_LADDER[clampDirectorLadderIndex(index)];
}

/** The dimensions in which two vectors differ. Empty when identical. */
export function changedDirectorDimensions(
  a: SchulteDirectorVector,
  b: SchulteDirectorVector,
): SchulteDirectorDimension[] {
  return SCHULTE_DIRECTOR_DIMENSIONS.filter(dimension => a[dimension] !== b[dimension]);
}

/** Zeroes the accuracy-hostile dimensions — used to steer a mistake-prone player toward control. */
export function controlOrientedVector(vector: SchulteDirectorVector): SchulteDirectorVector {
  return { ...vector, ruleSwitching: 0, visualComplexity: 0 };
}

export function averageVectorComplexity(vector: SchulteDirectorVector): number {
  const sum = SCHULTE_DIRECTOR_DIMENSIONS.reduce((total, dimension) => total + vector[dimension], 0);
  return sum / SCHULTE_DIRECTOR_DIMENSIONS.length;
}
