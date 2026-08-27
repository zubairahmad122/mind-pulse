import { createSeededRandom, pickRandom } from '../../../rng';
import { SCHULTE_NEXUS_VERSION } from '../generator';
import type { SchulteChallenge, SchulteRevealBehaviour, SchulteTransformRule } from '../types';
import { buildDirectorChallenge, type SchulteNumberParity } from './challengeBuilder';
import { getSlotAwareEnvelope, resolveSchulteLevelAccess, type SchulteLevelAccessResult, type SchulteLevelEnvelope } from './levels';
import { calculateNoveltyScore, createSemanticKey, shouldRejectCandidate, type SchulteNoveltyMeta } from './novelty';
import { buildPersonalMissionSeed } from './seed';
import { missionBandFor } from './timer';
import type { SchulteMissionBand, SchultePlayerSkillProfile } from './types';

/**
 * The level-aware mission resolver — the only place a level envelope turns
 * into an actual generated mission. Reuses `buildDirectorChallenge` (board/
 * signature/validation), `buildPersonalMissionSeed` (deterministic personal
 * seeding) and `calculateNoveltyScore`/`shouldRejectCandidate` (anti-
 * repetition + hard signature rejection) exactly as `missionDirector.ts`
 * does — no competing selection logic.
 */

export interface ResolveLevelMissionInput {
  readonly profile: SchultePlayerSkillProfile;
  readonly userStableId: string;
  readonly level: number;
  readonly missionInLevel: number;
  readonly isPremium: boolean;
  readonly mode: 'next' | 'retry';
  readonly lastChallenge?: SchulteChallenge;
  readonly version?: number;
}

export interface ResolveLevelMissionResult {
  readonly access: SchulteLevelAccessResult;
  readonly challenge: SchulteChallenge | null;
  readonly band: SchulteMissionBand | null;
}

const CANDIDATE_ATTEMPTS = 6;
const RECENT_WINDOW = 8;
/** Chance an unlocked extra mechanic (fading/shift/parity/off-origin) actually applies to a given mission. */
const MECHANIC_CHANCE = 0.4;

function directionOf(family: SchulteChallenge['family']): 'asc' | 'desc' | 'other' {
  if (family === 'ascending') return 'asc';
  if (family === 'descending') return 'desc';
  return 'other';
}

function noveltyMetaOf(challenge: SchulteChallenge): SchulteNoveltyMeta {
  const targetCount = challenge.targetSequence.length;
  return {
    family: challenge.family,
    geometry: `${challenge.boardSize}x${challenge.columns ?? challenge.boardSize}`,
    targetCount,
    direction: directionOf(challenge.family),
    band: missionBandFor(challenge.timeLimitMs),
    semanticKey: createSemanticKey(challenge.family, challenge.targetSequence, targetCount),
  };
}

function pickCandidate(
  envelope: SchulteLevelEnvelope,
  level: number,
  userStableId: string,
  missionIndex: number,
  version: number,
  salt: number,
): SchulteChallenge {
  const seed = buildPersonalMissionSeed(userStableId, missionIndex, version, salt);
  const rng = createSeededRandom(seed ^ 0x5a5a5a5a);

  const family = pickRandom(rng, envelope.families);
  const [minCount, maxCount] = envelope.targetCountRange;
  const wantedCount = minCount + Math.floor(rng() * (maxCount - minCount + 1));
  const fittingGeometries = envelope.geometries.filter(([rows, columns]) => rows * columns >= wantedCount);
  const [rows, columns] = pickRandom(rng, fittingGeometries.length > 0 ? fittingGeometries : envelope.geometries);
  const cellCount = rows * columns;
  const targetCount = envelope.allowNeutralCells ? Math.min(wantedCount, cellCount) : cellCount;

  const origin = envelope.allowNonUnitOrigin && rng() < MECHANIC_CHANCE ? 1 + Math.floor(rng() * 10) : 1;
  const parity: SchulteNumberParity =
    envelope.allowParityFilter && rng() < MECHANIC_CHANCE ? (rng() < 0.5 ? 'odd' : 'even') : 'all';

  // At most one extra visual/board mechanic per mission — restraint, per the
  // "do not combine multiple difficult mechanics recklessly" rule (level 20
  // still only ever layers one on top of the base family/grid choice here).
  let forcedRevealBehaviour: SchulteRevealBehaviour | undefined;
  let forcedTransformRule: SchulteTransformRule | undefined;
  if (envelope.allowFading && rng() < MECHANIC_CHANCE) {
    forcedRevealBehaviour = { mode: 'fade-after-preview', previewMs: 2500, fadeOpacity: 0.35, fadeAfterSteps: 0 };
  } else if (rows === columns && envelope.allowRowShift && rng() < MECHANIC_CHANCE) {
    forcedTransformRule = {
      kind: 'row-shift',
      axisIndex: Math.floor(rng() * rows),
      offset: 1 + Math.floor(rng() * (rows - 1)),
      everySteps: 4,
      advanceAxis: false,
    };
  } else if (rows === columns && envelope.allowColumnShift && rng() < MECHANIC_CHANCE) {
    forcedTransformRule = {
      kind: 'column-shift',
      axisIndex: Math.floor(rng() * columns),
      offset: 1 + Math.floor(rng() * (columns - 1)),
      everySteps: 4,
      advanceAxis: false,
    };
  }

  return buildDirectorChallenge({
    id: `schulte-nexus-level-${level}-${userStableId}-${missionIndex}-${seed}-v${version}`,
    version,
    seed,
    vector: envelope.baseVector,
    forcedFamily: family,
    forcedGeometry: [rows, columns],
    forcedTargetCount: targetCount,
    numberRange: { allowNegative: false, origin },
    numberParity: parity,
    forcedRevealBehaviour,
    forcedTransformRule,
  });
}

/**
 * Resolves the next (or retried) mission for a level. Premium gating is
 * checked first and short-circuits generation entirely — a blocked level
 * never reaches the director.
 */
export function resolveNextSchulteLevelMission(input: ResolveLevelMissionInput): ResolveLevelMissionResult {
  const access = resolveSchulteLevelAccess(input.level, input.isPremium);
  if (!access.canPlay) return { access, challenge: null, band: null };

  const version = input.version ?? SCHULTE_NEXUS_VERSION;

  if (input.mode === 'retry') {
    if (!input.lastChallenge) throw new Error('resolveNextSchulteLevelMission: retry requires lastChallenge');
    return { access, challenge: input.lastChallenge, band: missionBandFor(input.lastChallenge.timeLimitMs) };
  }

  const envelope = getSlotAwareEnvelope(input.level, input.missionInLevel, input.profile);
  const recentMeta: SchulteNoveltyMeta[] = input.profile.recentAttempts.slice(0, RECENT_WINDOW).map(a => ({
    family: a.family,
    geometry: `${a.rows}x${a.columns}`,
    targetCount: a.targetCount,
    direction: directionOf(a.family),
    band: missionBandFor(a.timeLimitMs),
    semanticKey: createSemanticKey(a.family, a.targetSequence, a.targetCount),
  }));

  let best: { challenge: SchulteChallenge; score: number } | null = null;
  for (let salt = 0; salt < CANDIDATE_ATTEMPTS; salt++) {
    const challenge = pickCandidate(envelope, input.level, input.userStableId, input.profile.missionIndex, version, salt);
    if (shouldRejectCandidate(challenge.signature, input.profile.completedSignatures)) continue;

    const score = calculateNoveltyScore(noveltyMetaOf(challenge), recentMeta);
    if (!best || score > best.score) best = { challenge, score };
    if (score >= 0.8) break;
  }

  if (!best) {
    // Every candidate matched a completed signature — one more deterministic roll rather than fail.
    const challenge = pickCandidate(
      envelope,
      input.level,
      input.userStableId,
      input.profile.missionIndex,
      version,
      CANDIDATE_ATTEMPTS,
    );
    best = { challenge, score: 0 };
  }

  return { access, challenge: best.challenge, band: missionBandFor(best.challenge.timeLimitMs) };
}
