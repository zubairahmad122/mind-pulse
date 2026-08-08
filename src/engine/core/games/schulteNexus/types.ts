/**
 * Schulte Nexus — challenge descriptor types.
 *
 * A `SchulteChallenge` is a *data-only* description of one mission: which
 * numbers sit where, the exact order they must be tapped in, and every
 * modifier layered on top. Nothing here knows about React, a renderer, the
 * network or persistence — a challenge is generated, validated, described and
 * asserted entirely in a plain unit test, and the gameplay layer that will
 * eventually consume it only reads these fields.
 *
 * Two invariants the rest of the module exists to protect:
 *
 *  1. `targetSequence` is the *exact* order the player must tap, and it is
 *     always solvable — every value in it appears exactly once on the board.
 *  2. `transformRule` may only permute cell positions, never add, remove or
 *     duplicate values, so a board that was solvable before a shift is still
 *     solvable after every shift it will ever receive.
 */

/** Every challenge family the generator can produce. */
export const SCHULTE_FAMILIES = [
  'ascending',
  'descending',
  'alternating-ends',
  'odd-then-even',
  'even-then-odd',
  'fixed-step',
  'reverse-blocks',
  'custom-target-queue',
  'fading',
  'row-shift',
  'column-shift',
  'rule-switch',
  'trap-nodes',
] as const;

export type SchulteFamily = (typeof SCHULTE_FAMILIES)[number];

/**
 * Families that define a *tap order*. These are the ones that decide what
 * `targetSequence` looks like.
 */
export const SCHULTE_ORDER_FAMILIES = [
  'ascending',
  'descending',
  'alternating-ends',
  'odd-then-even',
  'even-then-odd',
  'fixed-step',
  'reverse-blocks',
  'custom-target-queue',
  'rule-switch',
] as const;

export type SchulteOrderFamily = (typeof SCHULTE_ORDER_FAMILIES)[number];

/**
 * Families that define a *board behaviour* rather than an order. They layer
 * on top of a base order family, which is why they carry no ordering logic of
 * their own — `fading` is "some order, but the numbers dim".
 */
export const SCHULTE_MODIFIER_FAMILIES = [
  'fading',
  'row-shift',
  'column-shift',
  'trap-nodes',
] as const;

export type SchulteModifierFamily = (typeof SCHULTE_MODIFIER_FAMILIES)[number];

export function isModifierFamily(family: SchulteFamily): family is SchulteModifierFamily {
  return (SCHULTE_MODIFIER_FAMILIES as readonly string[]).includes(family);
}

/**
 * The order rule of a single phase.
 *
 * Deliberately narrower than `SchulteFamily`: `rule-switch` is not a phase
 * order, it is *two* phases with two different orders. `queue` is the
 * free-form order used by `custom-target-queue`, the only one that cannot be
 * reconstructed from the value set alone.
 */
export type SchultePhaseOrder =
  | 'ascending'
  | 'descending'
  | 'alternating-ends'
  | 'odd-then-even'
  | 'even-then-odd'
  | 'fixed-step'
  | 'reverse-blocks'
  | 'queue';

/**
 * One segment of `targetSequence`, with the rule that produced it.
 *
 * Phases tile the sequence exactly: the first starts at step 0, each next one
 * starts where the previous ended + 1, and the last ends on the final step.
 * `validateChallenge` re-derives the slice from `order` + the slice's own
 * values and compares — so a phase rule can never drift from the sequence it
 * claims to describe.
 */
export interface SchultePhaseRule {
  /** 0-based phase index. */
  readonly index: number;
  /** First step of this phase, inclusive, as an index into `targetSequence`. */
  readonly startStep: number;
  /** Last step of this phase, inclusive. */
  readonly endStep: number;
  readonly order: SchultePhaseOrder;
  /** Stride for `fixed-step`, otherwise null. */
  readonly step: number | null;
  /** Block length for `reverse-blocks`, otherwise null. */
  readonly blockSize: number | null;
  /** Human-readable rule, e.g. "tap the numbers in ascending order". */
  readonly label: string;
}

export type SchulteRevealMode = 'always-visible' | 'fade-after-preview' | 'fade-on-progress';

/** How long the numbers stay readable. */
export interface SchulteRevealBehaviour {
  readonly mode: SchulteRevealMode;
  /** Time the board is fully legible before fading. 0 when always visible. */
  readonly previewMs: number;
  /** Residual opacity once faded, 0..1. 1 means no fade. */
  readonly fadeOpacity: number;
  /** Taps completed before the fade begins. Only meaningful for `fade-on-progress`. */
  readonly fadeAfterSteps: number;
}

export type SchulteTransformKind = 'none' | 'row-shift' | 'column-shift';

/**
 * A board transform.
 *
 * Only cyclic shifts of a single row or column exist, and that is the point:
 * a cyclic shift is a permutation of positions within a line, so it provably
 * cannot lose, duplicate or introduce a value. Any future transform must keep
 * that property or `validateChallenge` will reject it.
 */
export interface SchulteTransformRule {
  readonly kind: SchulteTransformKind;
  /** Row or column index the first application shifts. Ignored when `kind` is 'none'. */
  readonly axisIndex: number;
  /** Cells to shift by, positive. */
  readonly offset: number;
  /** Taps between applications. */
  readonly everySteps: number;
  /** When true each application moves to the next row/column instead of repeating one. */
  readonly advanceAxis: boolean;
}

export type SchulteDifficultyBand = 'gentle' | 'casual' | 'sharp' | 'elite';
export type SchulteRewardTier = 'bronze' | 'silver' | 'gold' | 'platinum';

/** A number's cell. Rows and columns are 0-indexed, top-left origin. */
export interface SchulteBoardPosition {
  readonly value: number;
  readonly row: number;
  readonly column: number;
}

/** The complete, self-contained description of one mission. */
export interface SchulteChallenge {
  /** Stable identity, e.g. `schulte-nexus-daily-2026-08-06-v1`. */
  readonly id: string;
  /** Generator version. Bumping it changes every generated challenge. */
  readonly version: number;
  /** The seed every random choice in this challenge came from. */
  readonly seed: number;
  readonly family: SchulteFamily;
  /** Board row count; the board is `boardSize` × `boardSize` unless `columns` is set. */
  readonly boardSize: number;
  /**
   * Column count for a non-square board (Mission Director geometries like
   * 3×4 or 4×5). Omitted (or equal to `boardSize`) for the square boards the
   * daily/ladder generator has always produced — every existing consumer
   * that never sets this keeps reading a square board exactly as before.
   */
  readonly columns?: number;
  /** Every value printed on the board, ascending. Includes trap values. */
  readonly activeValues: readonly number[];
  /** One entry per cell, row-major. Length is always `boardSize²`. */
  readonly boardPositions: readonly SchulteBoardPosition[];
  /** The exact tap order. Never contains a trap value. */
  readonly targetSequence: readonly number[];
  /** Contiguous, non-overlapping segments of `targetSequence`. */
  readonly phaseRules: readonly SchultePhaseRule[];
  readonly revealBehaviour: SchulteRevealBehaviour;
  readonly transformRule: SchulteTransformRule;
  /** Board values that must never be tapped. Disjoint from `targetSequence`. */
  readonly trapValues: readonly number[];
  readonly timeLimitMs: number;
  /** Mistakes allowed before the mission fails. Always ≥ 1. */
  readonly maximumErrors: number;
  readonly difficultyBand: SchulteDifficultyBand;
  readonly rewardTier: SchulteRewardTier;
  /** Content hash — see `createChallengeSignature`. */
  readonly signature: string;
}

/**
 * The independently-adjustable difficulty dimensions.
 *
 * The escalation rule ("increase only one difficulty dimension at a time") is
 * a statement about this vector, which is why it is a named type rather than
 * a scalar: two adjacent ladder rungs must differ in exactly one field, by
 * exactly one step, and a test reads that off directly.
 */
export interface SchulteDifficultyVector {
  /** Board edge length, 3..6. */
  readonly boardSize: number;
  /** How complex the tap order may be, 0..3. */
  readonly familyTier: number;
  /** How much the numbers fade, 0..2. */
  readonly revealTier: number;
  /** How much the board moves, 0..2. */
  readonly transformTier: number;
  /** How many forbidden cells, 0..2. */
  readonly trapTier: number;
  /** Time pressure, 0..3. */
  readonly paceTier: number;
}

export const SCHULTE_DIFFICULTY_DIMENSIONS = [
  'boardSize',
  'familyTier',
  'revealTier',
  'transformTier',
  'trapTier',
  'paceTier',
] as const;

export type SchulteDifficultyDimension = (typeof SCHULTE_DIFFICULTY_DIMENSIONS)[number];

/** What one finished attempt tells the difficulty controller. */
export interface SchulteChallengeResult {
  readonly signature: string;
  readonly family: SchulteFamily;
  /** False when the player ran out of time or exceeded `maximumErrors`. */
  readonly completed: boolean;
  readonly errors: number;
  /** The `maximumErrors` of the challenge that was played. */
  readonly maximumErrors: number;
  readonly durationMs: number;
  /** The `timeLimitMs` of the challenge that was played. */
  readonly timeLimitMs: number;
}

export type SchulteDifficultyDirection = 'advance' | 'hold' | 'step-down';

export interface SchulteDifficultyAdjustment {
  readonly direction: SchulteDifficultyDirection;
  /** Ladder movement: +1, 0 or -1. Never larger — escalation is one step at a time. */
  readonly delta: 1 | 0 | -1;
  /** Plain-language justification, safe to surface in the UI. */
  readonly reason: string;
}

/** Everything the generator needs to know about a returning player. */
export interface SchulteNexusProfile {
  /** Current rung on the difficulty ladder. A new player starts at 0. */
  readonly ladderIndex: number;
  /** Families played most recently, newest first. Used to avoid repeats. */
  readonly recentFamilies: readonly SchulteFamily[];
  /** Finished attempts, newest first. Only the newest few are read. */
  readonly recentResults: readonly SchulteChallengeResult[];
}

/**
 * The result of `generateNextPersonalChallenge`.
 *
 * Wrapping the challenge is deliberate: the caller has to persist the new
 * ladder rung and family history to generate the *next* one, and the
 * challenge descriptor itself stays free of progression state.
 */
export interface SchulteNextChallenge {
  readonly challenge: SchulteChallenge;
  /** Rung this challenge was built at — store it back on the profile. */
  readonly ladderIndex: number;
  readonly adjustment: SchulteDifficultyAdjustment;
  /** `profile.recentFamilies` with this challenge's family prepended. */
  readonly recentFamilies: readonly SchulteFamily[];
}

export interface SchulteValidationResult {
  readonly valid: boolean;
  /** Empty when valid. One entry per distinct problem found. */
  readonly issues: readonly string[];
}
