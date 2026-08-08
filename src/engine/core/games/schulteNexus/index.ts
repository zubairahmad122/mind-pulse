/**
 * Schulte Nexus — daily missions.
 *
 * A pure, data-driven procedural challenge system. It produces
 * `SchulteChallenge` descriptors and nothing else: no rendering, no state
 * machine, no persistence, no clock. The gameplay layer that will consume
 * these is deliberately not built yet.
 *
 * Entry points:
 *  - `generateDailyChallenge(date, version)` — the same mission worldwide.
 *  - `generateNextPersonalChallenge(profile, completedSignatures, seed)` — the
 *    next rung of one player's ladder, never repeating a completed puzzle.
 *  - `createChallengeSignature` / `validateChallenge` / `describeChallengeRule`
 *  - `adjustChallengeDifficulty(recentResults)` — the ±1 rung decision.
 */

export {
  adjustChallengeDifficulty,
  createStartingProfile,
  generateDailyChallenge,
  generateNextPersonalChallenge,
  SCHULTE_NEXUS_VERSION,
  toUtcDateKey,
} from './generator';

export { createChallengeSignature, canonicalChallengeContent, hash64, seedFromString } from './signature';
export type { SchulteChallengeDraft } from './signature';

export { validateChallenge } from './validate';
export { describeChallengeRule } from './describe';

export { applyTransformAtStep, layoutBoard, transformApplicationCount } from './board';
export { buildPhaseOrder, buildTargetPlan, phaseLabelFor, pickCoprimeStep } from './sequences';
export type { SchulteTargetPlan } from './sequences';

export {
  changedDimensions,
  clampLadderIndex,
  difficultyBandFor,
  difficultyVectorAt,
  familyPoolFor,
  maximumErrorsFor,
  msPerTargetFor,
  orderFamiliesForTier,
  rewardTierFor,
  SCHULTE_DAILY_MIN_LADDER_INDEX,
  SCHULTE_DIFFICULTY_LADDER,
  SCHULTE_LADDER_MAX_INDEX,
  SCHULTE_LADDER_MIN_INDEX,
} from './ladder';

export {
  isModifierFamily,
  SCHULTE_DIFFICULTY_DIMENSIONS,
  SCHULTE_FAMILIES,
  SCHULTE_MODIFIER_FAMILIES,
  SCHULTE_ORDER_FAMILIES,
} from './types';

// Adaptive Mission Director + player record system — additive, namespaced so
// none of its exports can collide with the daily/ladder generator above.
export * as schulteDirector from './director';

export type {
  SchulteBoardPosition,
  SchulteChallenge,
  SchulteChallengeResult,
  SchulteDifficultyAdjustment,
  SchulteDifficultyBand,
  SchulteDifficultyDimension,
  SchulteDifficultyDirection,
  SchulteDifficultyVector,
  SchulteFamily,
  SchulteModifierFamily,
  SchulteNextChallenge,
  SchulteNexusProfile,
  SchulteOrderFamily,
  SchultePhaseOrder,
  SchultePhaseRule,
  SchulteRevealBehaviour,
  SchulteRevealMode,
  SchulteRewardTier,
  SchulteTransformKind,
  SchulteTransformRule,
  SchulteValidationResult,
} from './types';
