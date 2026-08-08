import { createSeededRandom, pickRandom, randomInt, shuffle, type SeededRandom } from '../../rng';
import { layoutBoard } from './board';
import {
  clampLadderIndex,
  difficultyBandFor,
  difficultyVectorAt,
  familyPoolFor,
  maximumErrorsFor,
  msPerTargetFor,
  orderFamiliesForTier,
  rewardTierFor,
  SCHULTE_DAILY_MIN_LADDER_INDEX,
  SCHULTE_LADDER_MAX_INDEX,
} from './ladder';
import { buildTargetPlan } from './sequences';
import { createChallengeSignature, seedFromString, type SchulteChallengeDraft } from './signature';
import {
  isModifierFamily,
  SCHULTE_FAMILIES,
  type SchulteChallenge,
  type SchulteChallengeResult,
  type SchulteDifficultyAdjustment,
  type SchulteFamily,
  type SchulteNextChallenge,
  type SchulteNexusProfile,
  type SchulteOrderFamily,
  type SchulteRevealBehaviour,
  type SchulteTransformRule,
} from './types';

/**
 * Schulte Nexus — procedural challenge generation.
 *
 * Everything in here is pure: same inputs, same challenge, forever. No clock
 * is read (the date is always an argument), no storage, no network, no
 * randomness that isn't seeded. That is what lets a daily mission be
 * reproduced years later from nothing but its date, and what lets a
 * regression test assert on an exact board.
 */

/** Bump to intentionally invalidate every previously generated challenge. */
export const SCHULTE_NEXUS_VERSION = 1;

/** How many recent families a personal challenge tries to steer away from. */
const RECENT_FAMILY_WINDOW = 3;

/** How much family history a returned `SchulteNextChallenge` carries forward. */
const FAMILY_HISTORY_LIMIT = 8;

/** Re-rolls allowed while dodging already-completed signatures. */
const MAX_SIGNATURE_ATTEMPTS = 256;

/** Keeps the family draw from sharing an rng stream with the board layout. */
const FAMILY_SEED_SALT = 0x5f37_1e2d;

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/**
 * Normalises a date to its UTC calendar day.
 *
 * UTC, not local time, and deliberately so: every player worldwide must get
 * the identical daily board. A local-date policy would hand two people in
 * different timezones different puzzles on the same "day" and make historic
 * seeds irreproducible.
 */
export function toUtcDateKey(date: Date | string): string {
  if (typeof date === 'string') {
    const key = date.slice(0, 10);
    const match = DATE_KEY_PATTERN.exec(key);
    if (!match) throw new TypeError(`Schulte Nexus: expected a YYYY-MM-DD date, received "${date}"`);
    const parsed = new Date(`${key}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== key) {
      throw new TypeError(`Schulte Nexus: "${date}" is not a real calendar date`);
    }
    return key;
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('Schulte Nexus: expected a valid Date or YYYY-MM-DD string');
  }
  return date.toISOString().slice(0, 10);
}

function dayOrdinal(dateKey: string): number {
  return Math.floor(Date.parse(`${dateKey}T00:00:00.000Z`) / MS_PER_DAY);
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

function revealBehaviourFor(tier: number): SchulteRevealBehaviour {
  if (tier <= 0) {
    return { mode: 'always-visible', previewMs: 0, fadeOpacity: 1, fadeAfterSteps: 0 };
  }
  if (tier === 1) {
    return { mode: 'fade-after-preview', previewMs: 3000, fadeOpacity: 0.35, fadeAfterSteps: 0 };
  }
  return { mode: 'fade-on-progress', previewMs: 1500, fadeOpacity: 0.18, fadeAfterSteps: 1 };
}

const NO_TRANSFORM: SchulteTransformRule = {
  kind: 'none',
  axisIndex: 0,
  offset: 0,
  everySteps: 0,
  advanceAxis: false,
};

function transformRuleFor(
  rng: SeededRandom,
  family: SchulteFamily,
  tier: number,
  boardSize: number,
): SchulteTransformRule {
  const effectiveTier =
    family === 'row-shift' || family === 'column-shift' ? Math.max(tier, 1) : tier;
  if (effectiveTier <= 0) return NO_TRANSFORM;

  const kind: SchulteTransformRule['kind'] =
    family === 'row-shift'
      ? 'row-shift'
      : family === 'column-shift'
        ? 'column-shift'
        : pickRandom(rng, ['row-shift', 'column-shift'] as const);

  return {
    kind,
    axisIndex: randomInt(rng, 0, boardSize - 1),
    offset: randomInt(rng, 1, boardSize - 1),
    everySteps: effectiveTier === 1 ? 5 : 3,
    advanceAxis: effectiveTier >= 2,
  };
}

function trapCountFor(family: SchulteFamily, tier: number, cellCount: number): number {
  const effectiveTier = family === 'trap-nodes' ? Math.max(tier, 1) : tier;
  if (effectiveTier <= 0) return 0;
  const raw =
    effectiveTier === 1
      ? Math.max(1, Math.round(cellCount * 0.1))
      : Math.max(2, Math.round(cellCount * 0.18));
  // Always leave a mission worth playing behind the traps.
  return Math.min(raw, cellCount - 4);
}

function roundToHundred(value: number): number {
  return Math.round(value / 100) * 100;
}

interface ComposeOptions {
  readonly id: string;
  readonly version: number;
  readonly seed: number;
  readonly ladderIndex: number;
  readonly family: SchulteFamily;
}

/**
 * Builds one challenge from a fully-resolved set of choices.
 *
 * The family is an input rather than something drawn here, because the daily
 * mission and the personal ladder pick families by different rules (a
 * date-driven rotation vs. steering away from recent history) but must
 * otherwise produce challenges from the same code path.
 */
function composeChallenge(options: ComposeOptions): SchulteChallenge {
  const ladderIndex = clampLadderIndex(options.ladderIndex);
  const vector = difficultyVectorAt(ladderIndex);
  const rng = createSeededRandom(options.seed);

  const boardSize = vector.boardSize;
  const cellCount = boardSize * boardSize;
  const activeValues: number[] = Array.from({ length: cellCount }, (_, index) => index + 1);

  const trapCount = trapCountFor(options.family, vector.trapTier, cellCount);
  const trapValues = shuffle(rng, activeValues).slice(0, trapCount).sort((a, b) => a - b);
  const trapSet = new Set(trapValues);
  const targetValues = activeValues.filter((value) => !trapSet.has(value));

  // A modifier family ("the numbers fade", "a row slides") still needs an
  // order to tap in, so it borrows one from the tier it was unlocked at.
  const orderFamily: SchulteOrderFamily = isModifierFamily(options.family)
    ? pickRandom(rng, orderFamiliesForTier(vector.familyTier))
    : options.family;

  const plan = buildTargetPlan(orderFamily, targetValues, boardSize, rng);
  const boardPositions = layoutBoard(rng, activeValues);

  const revealTier =
    options.family === 'fading' ? Math.max(vector.revealTier, 1) : vector.revealTier;
  const revealBehaviour = revealBehaviourFor(revealTier);
  const transformRule = transformRuleFor(rng, options.family, vector.transformTier, boardSize);

  const activeModifierCount =
    (revealTier > 0 ? 1 : 0) + (transformRule.kind !== 'none' ? 1 : 0) + (trapCount > 0 ? 1 : 0);

  // Harder mechanics get a little more time per target; `paceTier` stays the
  // dial that actually applies pressure.
  const timeMultiplier =
    1 +
    (revealTier > 0 ? 0.15 : 0) +
    (transformRule.kind !== 'none' ? 0.15 : 0) +
    (trapCount > 0 ? 0.1 : 0);
  const timeLimitMs = roundToHundred(
    plan.sequence.length * msPerTargetFor(vector.paceTier) * timeMultiplier,
  );

  const difficultyBand = difficultyBandFor(ladderIndex);

  const draft: SchulteChallengeDraft = {
    id: options.id,
    version: options.version,
    seed: options.seed >>> 0,
    family: options.family,
    boardSize,
    activeValues,
    boardPositions,
    targetSequence: plan.sequence,
    phaseRules: plan.phases,
    revealBehaviour,
    transformRule,
    trapValues,
    timeLimitMs,
    maximumErrors: maximumErrorsFor(difficultyBand),
    difficultyBand,
    rewardTier: rewardTierFor(ladderIndex, activeModifierCount),
  };

  return { ...draft, signature: createChallengeSignature(draft) };
}

// ---------------------------------------------------------------------------
// Family selection
// ---------------------------------------------------------------------------

/**
 * Picks a family, steering away from the ones just played.
 *
 * Exclusions stop one short of emptying the pool, so a two-family rung still
 * alternates instead of deadlocking — "avoid repeats" is best-effort against
 * a small pool, never a hard failure.
 */
function selectFamily(
  seed: number,
  pool: readonly SchulteFamily[],
  avoid: readonly SchulteFamily[],
): SchulteFamily {
  const excluded = new Set<SchulteFamily>();
  for (const family of avoid) {
    if (!pool.includes(family)) continue;
    if (excluded.size >= pool.length - 1) break;
    excluded.add(family);
  }
  const candidates = pool.filter((family) => !excluded.has(family));
  return pickRandom(createSeededRandom(seed >>> 0), candidates);
}

// ---------------------------------------------------------------------------
// Daily missions
// ---------------------------------------------------------------------------

/**
 * The daily mission for a UTC calendar date.
 *
 * Deterministic in `(date, version)` alone — no profile, no history, no
 * clock. The rung is drawn from the date too, so dailies rotate through board
 * sizes and mechanics instead of tracking any one player's progress.
 */
export function generateDailyChallenge(
  date: Date | string,
  version: number = SCHULTE_NEXUS_VERSION,
): SchulteChallenge {
  const dateKey = toUtcDateKey(date);
  const seed = seedFromString(`schulte-nexus|daily|${dateKey}|v${version}`);

  // Family first, rung second — the reverse of the personal path, and
  // deliberately so. The family rotates by day number across the whole family
  // list, which makes "today is never yesterday's family" arithmetic rather
  // than luck. Picking the rung first and then a family from its pool cannot
  // promise that, because two consecutive days can sit on rungs whose pools
  // differ in size and still land on the same family.
  const rotationOffset = seedFromString(`schulte-nexus|daily-rotation|v${version}`);
  const family = SCHULTE_FAMILIES[(dayOrdinal(dateKey) + rotationOffset) % SCHULTE_FAMILIES.length];

  // Only rungs that actually offer this family, and never the smallest boards.
  const eligibleRungs: number[] = [];
  for (let rung = SCHULTE_DAILY_MIN_LADDER_INDEX; rung <= SCHULTE_LADDER_MAX_INDEX; rung++) {
    if (familyPoolFor(difficultyVectorAt(rung)).includes(family)) eligibleRungs.push(rung);
  }
  const ladderIndex =
    eligibleRungs[
      seedFromString(`schulte-nexus|daily-rung|${dateKey}|v${version}`) % eligibleRungs.length
    ];

  return composeChallenge({
    id: `schulte-nexus-daily-${dateKey}-v${version}`,
    version,
    seed,
    ladderIndex,
    family,
  });
}

// ---------------------------------------------------------------------------
// Difficulty control
// ---------------------------------------------------------------------------

function isErrorHeavy(result: SchulteChallengeResult): boolean {
  if (!result.completed) return true;
  if (result.durationMs > result.timeLimitMs) return true;
  return result.errors >= Math.max(2, Math.ceil(result.maximumErrors / 2));
}

function isClean(result: SchulteChallengeResult): boolean {
  return result.completed && result.errors <= 1 && result.durationMs <= result.timeLimitMs;
}

/**
 * Decides which way the ladder should move next.
 *
 * Returns a delta rather than an absolute rung so the "one step at a time"
 * rule is structural: there is no value this function can return that skips a
 * rung. The three product rules it encodes —
 *
 *  - a clean run advances exactly one rung,
 *  - one error-heavy run holds (a bad session shouldn't cost progress),
 *  - two error-heavy runs in a row step down (the rung is genuinely too high).
 *
 * `recentResults` is newest-first; only the two newest are read.
 */
export function adjustChallengeDifficulty(
  recentResults: readonly SchulteChallengeResult[],
): SchulteDifficultyAdjustment {
  if (recentResults.length === 0) {
    return { direction: 'hold', delta: 0, reason: 'No history yet — starting at the gentlest setup.' };
  }

  const newest = recentResults[0];

  if (isErrorHeavy(newest)) {
    const previous = recentResults[1];
    if (previous !== undefined && isErrorHeavy(previous)) {
      return {
        direction: 'step-down',
        delta: -1,
        reason: 'Two error-heavy runs in a row — stepping back one rung.',
      };
    }
    return {
      direction: 'hold',
      delta: 0,
      reason: 'Last run was error-heavy — holding at the same rung.',
    };
  }

  if (isClean(newest)) {
    return {
      direction: 'advance',
      delta: 1,
      reason: 'Last run was clean — moving up one rung.',
    };
  }

  return {
    direction: 'hold',
    delta: 0,
    reason: 'Last run was finished but not clean — holding at the same rung.',
  };
}

// ---------------------------------------------------------------------------
// Personal progression
// ---------------------------------------------------------------------------

/** A brand-new player's profile: rung 0, no history. */
export function createStartingProfile(): SchulteNexusProfile {
  return { ladderIndex: 0, recentFamilies: [], recentResults: [] };
}

/**
 * The next challenge for a specific player.
 *
 * Applies `adjustChallengeDifficulty` to the profile's history, then rolls a
 * challenge at the resulting rung, re-rolling until it lands on one the
 * player has not already completed. Re-rolls change the seed, which changes
 * the board layout — and layout entropy alone (16! on the smallest daily
 * board) means a fresh roll is essentially always unseen.
 *
 * Throws only if `MAX_SIGNATURE_ATTEMPTS` consecutive rolls were all already
 * completed, which cannot happen with a real completion history; treat it as
 * a corrupted `completedSignatures` rather than an expected condition.
 */
export function generateNextPersonalChallenge(
  profile: SchulteNexusProfile,
  completedSignatures: Iterable<string>,
  seed: number,
  version: number = SCHULTE_NEXUS_VERSION,
): SchulteNextChallenge {
  const adjustment = adjustChallengeDifficulty(profile.recentResults);
  const ladderIndex = clampLadderIndex(profile.ladderIndex + adjustment.delta);
  const completed = completedSignatures instanceof Set ? completedSignatures : new Set(completedSignatures);

  const pool = familyPoolFor(difficultyVectorAt(ladderIndex));
  const avoid = profile.recentFamilies.slice(0, RECENT_FAMILY_WINDOW);

  for (let attempt = 0; attempt < MAX_SIGNATURE_ATTEMPTS; attempt++) {
    const attemptSeed = seedFromString(`schulte-nexus|personal|${seed >>> 0}|${attempt}`);
    const family = selectFamily((attemptSeed ^ FAMILY_SEED_SALT) >>> 0, pool, avoid);
    const challenge = composeChallenge({
      id: `schulte-nexus-personal-${ladderIndex}-${attemptSeed >>> 0}-v${version}`,
      version,
      seed: attemptSeed,
      ladderIndex,
      family,
    });

    if (completed.has(challenge.signature)) continue;

    return {
      challenge,
      ladderIndex,
      adjustment,
      recentFamilies: [challenge.family, ...profile.recentFamilies].slice(0, FAMILY_HISTORY_LIMIT),
    };
  }

  throw new Error(
    `Schulte Nexus: could not find an uncompleted challenge at rung ${ladderIndex} in ${MAX_SIGNATURE_ATTEMPTS} attempts`,
  );
}
