import { createSeededRandom, pickRandom, type SeededRandom } from '../../../rng';
import { layoutBoard } from '../board';
import { buildTargetPlan } from '../sequences';
import { createChallengeSignature, type SchulteChallengeDraft } from '../signature';
import { validateChallenge } from '../validate';
import { difficultyBandFor, maximumErrorsFor, rewardTierFor, SCHULTE_LADDER_MAX_INDEX } from '../ladder';
import type { SchulteChallenge, SchulteOrderFamily, SchulteRevealBehaviour, SchulteTransformRule } from '../types';
import { layoutRectBoard } from './board';
import { averageVectorComplexity } from './ladder';
import { calculateAdaptiveTimeLimit } from './timer';
import {
  SCHULTE_DEFAULT_NUMBER_RANGE,
  type SchulteDirectorVector,
  type SchulteNumberRangeConfig,
} from './types';

/**
 * Composes a `SchulteChallenge` from a Director-selected vector, reusing the
 * same primitives the daily/ladder generator does (`buildTargetPlan`,
 * `createChallengeSignature`, `../board`'s square layout, and `../ladder`'s
 * band/reward helpers) — this is a second *composition* over the existing
 * engine, not a second engine.
 */

const GEOMETRIES: readonly (readonly [rows: number, columns: number])[] = [
  [3, 3],
  [3, 4],
  [4, 4],
  [4, 5],
  [5, 5],
];

const TARGET_COUNTS = [7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 19, 21, 23, 25] as const;

const SEQUENCE_FAMILIES_BY_TIER: readonly (readonly SchulteOrderFamily[])[] = [
  ['ascending', 'descending'],
  ['fixed-step', 'custom-target-queue'],
  ['alternating-ends', 'reverse-blocks'],
  ['rule-switch'],
];

const NO_TRANSFORM: SchulteTransformRule = {
  kind: 'none',
  axisIndex: 0,
  offset: 0,
  everySteps: 0,
  advanceAxis: false,
};

const ALWAYS_VISIBLE: SchulteRevealBehaviour = {
  mode: 'always-visible',
  previewMs: 0,
  fadeOpacity: 1,
  fadeAfterSteps: 0,
};

function geometryFor(gridComplexity: number): readonly [number, number] {
  const idx = Math.min(GEOMETRIES.length - 1, Math.floor((gridComplexity / 100) * GEOMETRIES.length));
  return GEOMETRIES[idx];
}

function targetCountFor(dimValue: number, cellCount: number): number {
  const idx = Math.min(TARGET_COUNTS.length - 1, Math.floor((dimValue / 100) * TARGET_COUNTS.length));
  return Math.min(TARGET_COUNTS[idx], cellCount);
}

function sequenceFamilyFor(vector: SchulteDirectorVector, rng: SeededRandom): SchulteOrderFamily {
  if (vector.ruleSwitching >= 35) return 'rule-switch';
  const tier = vector.sequenceComplexity >= 75 ? 2 : vector.sequenceComplexity >= 40 ? 1 : 0;
  return pickRandom(rng, SEQUENCE_FAMILIES_BY_TIER[tier]);
}

export type SchulteNumberParity = 'all' | 'odd' | 'even';

export interface DirectorChallengeConfig {
  readonly id: string;
  readonly version: number;
  readonly seed: number;
  readonly vector: SchulteDirectorVector;
  readonly masteryScore?: number;
  /** Forces a specific family — used by the fixed first-3-mission calibration. */
  readonly forcedFamily?: SchulteOrderFamily;
  readonly forcedGeometry?: readonly [rows: number, columns: number];
  readonly forcedTargetCount?: number;
  readonly forcedTimeLimitMs?: number;
  readonly numberRange?: SchulteNumberRangeConfig;
  /** Restricts targets to odd/even values; the other parity becomes neutral (trap) cells. Level-progression hook. */
  readonly numberParity?: SchulteNumberParity;
  /** Fading is purely visual (opacity only) — safe to override regardless of grid shape. Level-progression hook. */
  readonly forcedRevealBehaviour?: SchulteRevealBehaviour;
  /** Only ever passed for square geometries — see `../board.ts`'s transform-replay assumptions. Level-progression hook. */
  readonly forcedTransformRule?: SchulteTransformRule;
}

function filterByParity(values: readonly number[], parity: SchulteNumberParity): number[] {
  if (parity === 'all') return [...values];
  return values.filter(v => (parity === 'odd' ? v % 2 !== 0 : v % 2 === 0));
}

export function buildDirectorChallenge(config: DirectorChallengeConfig): SchulteChallenge {
  const rng = createSeededRandom(config.seed);
  const range = config.numberRange ?? SCHULTE_DEFAULT_NUMBER_RANGE;
  const [rows, columns] = config.forcedGeometry ?? geometryFor(config.vector.gridComplexity);
  const cellCount = rows * columns;

  const activeValues = Array.from({ length: cellCount }, (_, i) => range.origin + i);
  const parityCandidates = filterByParity(activeValues, config.numberParity ?? 'all');
  const targetCount = Math.max(
    4,
    Math.min(
      config.forcedTargetCount ?? targetCountFor(config.vector.targetCount, cellCount),
      parityCandidates.length,
    ),
  );

  const family = config.forcedFamily ?? sequenceFamilyFor(config.vector, rng);
  const targetValues = parityCandidates.slice(0, targetCount);
  const targetSet = new Set(targetValues);
  const trapValues = activeValues.filter(v => !targetSet.has(v));

  const plan = buildTargetPlan(family, targetValues, Math.max(rows, columns), rng);
  const boardPositions =
    rows === columns ? layoutBoard(rng, activeValues) : layoutRectBoard(rng, activeValues, rows, columns);

  const timeLimitMs =
    config.forcedTimeLimitMs ?? calculateAdaptiveTimeLimit(config.vector, targetCount, config.masteryScore);

  const pseudoLadderIndex = Math.round((averageVectorComplexity(config.vector) / 100) * SCHULTE_LADDER_MAX_INDEX);
  const difficultyBand = difficultyBandFor(pseudoLadderIndex);

  const draft: SchulteChallengeDraft = {
    id: config.id,
    version: config.version,
    seed: config.seed >>> 0,
    family,
    boardSize: rows,
    columns: rows === columns ? undefined : columns,
    activeValues,
    boardPositions,
    targetSequence: plan.sequence,
    phaseRules: plan.phases,
    revealBehaviour: config.forcedRevealBehaviour ?? ALWAYS_VISIBLE,
    transformRule: config.forcedTransformRule ?? NO_TRANSFORM,
    trapValues,
    timeLimitMs,
    maximumErrors: maximumErrorsFor(difficultyBand),
    difficultyBand,
    rewardTier: rewardTierFor(pseudoLadderIndex, 0),
  };

  const challenge: SchulteChallenge = { ...draft, signature: createChallengeSignature(draft) };

  const result = validateChallenge(challenge);
  if (!result.valid) {
    throw new Error(`Mission Director produced an invalid challenge: ${result.issues.join('; ')}`);
  }
  return challenge;
}
