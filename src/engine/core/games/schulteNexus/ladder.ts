import {
  SCHULTE_DIFFICULTY_DIMENSIONS,
  type SchulteDifficultyBand,
  type SchulteDifficultyDimension,
  type SchulteDifficultyVector,
  type SchulteFamily,
  type SchulteOrderFamily,
  type SchulteRewardTier,
} from './types';

/**
 * The difficulty ladder.
 *
 * Hand-authored and ordered, not computed from a formula. That is the whole
 * point: the product rule is "increase only one difficulty dimension at a
 * time", and with a literal table you can *read* whether the rule holds
 * instead of reasoning about a curve. `ladder.test.ts` asserts it mechanically
 * — every adjacent pair differs in exactly one field, by exactly +1 — so the
 * table cannot be edited into violating the rule without a red test.
 *
 * Rung 0 is the gentle start every new player gets: a 3×3 board, the simplest
 * order families, no fading, no movement, no traps, no time pressure.
 */
export const SCHULTE_DIFFICULTY_LADDER: readonly SchulteDifficultyVector[] = [
  { boardSize: 3, familyTier: 0, revealTier: 0, transformTier: 0, trapTier: 0, paceTier: 0 },
  { boardSize: 3, familyTier: 0, revealTier: 0, transformTier: 0, trapTier: 0, paceTier: 1 },
  { boardSize: 3, familyTier: 1, revealTier: 0, transformTier: 0, trapTier: 0, paceTier: 1 },
  { boardSize: 4, familyTier: 1, revealTier: 0, transformTier: 0, trapTier: 0, paceTier: 1 },
  { boardSize: 4, familyTier: 1, revealTier: 0, transformTier: 0, trapTier: 0, paceTier: 2 },
  { boardSize: 4, familyTier: 2, revealTier: 0, transformTier: 0, trapTier: 0, paceTier: 2 },
  { boardSize: 4, familyTier: 2, revealTier: 1, transformTier: 0, trapTier: 0, paceTier: 2 },
  { boardSize: 5, familyTier: 2, revealTier: 1, transformTier: 0, trapTier: 0, paceTier: 2 },
  { boardSize: 5, familyTier: 2, revealTier: 1, transformTier: 1, trapTier: 0, paceTier: 2 },
  { boardSize: 5, familyTier: 3, revealTier: 1, transformTier: 1, trapTier: 0, paceTier: 2 },
  { boardSize: 5, familyTier: 3, revealTier: 1, transformTier: 1, trapTier: 1, paceTier: 2 },
  { boardSize: 5, familyTier: 3, revealTier: 2, transformTier: 1, trapTier: 1, paceTier: 2 },
  { boardSize: 5, familyTier: 3, revealTier: 2, transformTier: 1, trapTier: 1, paceTier: 3 },
  { boardSize: 6, familyTier: 3, revealTier: 2, transformTier: 1, trapTier: 1, paceTier: 3 },
  { boardSize: 6, familyTier: 3, revealTier: 2, transformTier: 2, trapTier: 1, paceTier: 3 },
  { boardSize: 6, familyTier: 3, revealTier: 2, transformTier: 2, trapTier: 2, paceTier: 3 },
];

export const SCHULTE_LADDER_MIN_INDEX = 0;
export const SCHULTE_LADDER_MAX_INDEX = SCHULTE_DIFFICULTY_LADDER.length - 1;

/**
 * Rungs the daily mission may use.
 *
 * Dailies start at rung 3 (the first 4×4) rather than rung 0. A daily is a
 * one-off puzzle for everyone at once, not a progression step, and a 3×3
 * board only has 9! distinct layouts — over a decade of dailies that is close
 * enough to the birthday bound to make "no two dailies are ever identical" a
 * matter of luck. 16! is not.
 */
export const SCHULTE_DAILY_MIN_LADDER_INDEX = 3;

export function clampLadderIndex(index: number): number {
  if (!Number.isFinite(index)) return SCHULTE_LADDER_MIN_INDEX;
  const rounded = Math.round(index);
  if (rounded < SCHULTE_LADDER_MIN_INDEX) return SCHULTE_LADDER_MIN_INDEX;
  if (rounded > SCHULTE_LADDER_MAX_INDEX) return SCHULTE_LADDER_MAX_INDEX;
  return rounded;
}

export function difficultyVectorAt(index: number): SchulteDifficultyVector {
  return SCHULTE_DIFFICULTY_LADDER[clampLadderIndex(index)];
}

/** The dimensions in which two vectors differ. Empty when identical. */
export function changedDimensions(
  a: SchulteDifficultyVector,
  b: SchulteDifficultyVector,
): SchulteDifficultyDimension[] {
  return SCHULTE_DIFFICULTY_DIMENSIONS.filter((dimension) => a[dimension] !== b[dimension]);
}

/**
 * Order families reachable at a given family tier.
 *
 * Tiers are cumulative: tier 2 may still produce a plain ascending board. The
 * ceiling rises, the floor does not.
 */
const ORDER_FAMILIES_BY_TIER: readonly (readonly SchulteOrderFamily[])[] = [
  ['ascending', 'descending'],
  ['odd-then-even', 'even-then-odd', 'fixed-step'],
  ['alternating-ends', 'reverse-blocks', 'custom-target-queue'],
  ['rule-switch'],
];

export function orderFamiliesForTier(familyTier: number): SchulteOrderFamily[] {
  const ceiling = Math.max(0, Math.min(ORDER_FAMILIES_BY_TIER.length - 1, familyTier));
  const families: SchulteOrderFamily[] = [];
  for (let tier = 0; tier <= ceiling; tier++) families.push(...ORDER_FAMILIES_BY_TIER[tier]);
  return families;
}

/**
 * Every family the generator may pick at this rung.
 *
 * Modifier families are gated by *their own* dimension, not by `familyTier`:
 * `fading` only becomes available once `revealTier` rises, the shift families
 * once `transformTier` rises, `trap-nodes` once `trapTier` rises. Without
 * that, a rung that raised only `familyTier` could hand out a fading board
 * and quietly break the one-dimension-at-a-time promise.
 */
export function familyPoolFor(vector: SchulteDifficultyVector): SchulteFamily[] {
  const pool: SchulteFamily[] = [...orderFamiliesForTier(vector.familyTier)];
  if (vector.revealTier >= 1) pool.push('fading');
  if (vector.transformTier >= 1) pool.push('row-shift', 'column-shift');
  if (vector.trapTier >= 1) pool.push('trap-nodes');
  return pool;
}

const BAND_BY_QUARTER: readonly SchulteDifficultyBand[] = ['gentle', 'casual', 'sharp', 'elite'];
const REWARD_BY_INDEX: readonly SchulteRewardTier[] = ['bronze', 'silver', 'gold', 'platinum'];

export function difficultyBandFor(ladderIndex: number): SchulteDifficultyBand {
  const index = clampLadderIndex(ladderIndex);
  const quarter = Math.floor((index * BAND_BY_QUARTER.length) / SCHULTE_DIFFICULTY_LADDER.length);
  return BAND_BY_QUARTER[Math.min(BAND_BY_QUARTER.length - 1, quarter)];
}

/**
 * Reward tier: the band, bumped once when two or more modifiers are stacked.
 *
 * A gentle-band board carrying both a fade and a shift is a harder ask than
 * its band suggests, and the reward should say so.
 */
export function rewardTierFor(ladderIndex: number, activeModifierCount: number): SchulteRewardTier {
  const bandIndex = BAND_BY_QUARTER.indexOf(difficultyBandFor(ladderIndex));
  const bumped = bandIndex + (activeModifierCount >= 2 ? 1 : 0);
  return REWARD_BY_INDEX[Math.max(0, Math.min(REWARD_BY_INDEX.length - 1, bumped))];
}

/** Mistakes allowed, by band. Never below 1. */
export function maximumErrorsFor(band: SchulteDifficultyBand): number {
  switch (band) {
    case 'gentle':
      return 6;
    case 'casual':
      return 5;
    case 'sharp':
      return 4;
    case 'elite':
      return 3;
  }
}

/** Budget per target before modifier allowances, by pace tier. */
const MS_PER_TARGET_BY_PACE: readonly number[] = [2600, 2200, 1800, 1500];

export function msPerTargetFor(paceTier: number): number {
  const tier = Math.max(0, Math.min(MS_PER_TARGET_BY_PACE.length - 1, paceTier));
  return MS_PER_TARGET_BY_PACE[tier];
}
