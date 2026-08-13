import { SCHULTE_NEXUS_VERSION } from '../generator';
import type { SchulteChallenge } from '../types';
import { buildDirectorChallenge } from './challengeBuilder';
import { clampDirectorLadderIndex, controlOrientedVector, directorVectorAt } from './ladder';
import { calculateNoveltyScore, createSemanticKey, shouldRejectCandidate, type SchulteNoveltyMeta } from './novelty';
import { calculateFamilyMastery } from './mastery';
import { calculateOverallRating } from './rating';
import { buildPersonalMissionSeed } from './seed';
import { missionBandFor } from './timer';
import type {
  SchulteMissionAttempt,
  SchulteMissionBand,
  SchultePersonalBestEntry,
  SchultePlayerSkillProfile,
} from './types';

/**
 * The Adaptive Mission Director — the only place gameplay difficulty is
 * decided. UI/screens call `selectNextMission`/`recordMissionAttempt` and
 * never touch a `SchulteDirectorVector` themselves.
 */

const RECENT_WINDOW = 8;
const MAX_ATTEMPT_HISTORY = 20;
const RETRY_LOOKBACK_FOR_STEPDOWN = 2;

// ─── Starting state ─────────────────────────────────────────────────────────

export function createStartingSkillProfile(): SchultePlayerSkillProfile {
  return {
    rating: 0,
    missionIndex: 0,
    ladderIndex: 0,
    familyMastery: {},
    personalBests: {},
    recentAttempts: [],
    completedSignatures: [],
    recentFamilies: [],
    recentGeometries: [],
    allowNegativeNumbers: false,
  };
}

// ─── Performance interpretation (CASE A–D) ──────────────────────────────────

export type SchultePerformanceCase =
  | 'fastAccurate'
  | 'accurateSlow'
  | 'fastMistakeProne'
  | 'strugglingSlow'
  | 'insufficientData'
  | 'mixed';

export function interpretRecentPerformance(recentAttempts: readonly SchulteMissionAttempt[]): SchultePerformanceCase {
  const sample = recentAttempts.slice(0, 5).filter(a => a.result !== 'abandoned');
  if (sample.length < 3) return 'insufficientData';

  const completions = sample.filter(a => a.result === 'completed');
  const completionRate = completions.length / sample.length;
  const avgMistakes = sample.reduce((sum, a) => sum + a.mistakes, 0) / sample.length;
  const avgRemainingRatio = completions.length
    ? completions.reduce((sum, a) => sum + (a.timeLimitMs > 0 ? a.remainingTimeMs / a.timeLimitMs : 0), 0) /
      completions.length
    : 0;

  if (completionRate >= 0.8 && avgMistakes <= 0.4 && avgRemainingRatio >= 0.3) return 'fastAccurate';
  if (completionRate >= 0.8 && avgMistakes <= 0.6 && avgRemainingRatio < 0.15) return 'accurateSlow';
  if (avgMistakes > 1.2 && avgRemainingRatio >= 0.25) return 'fastMistakeProne';
  if (completionRate < 0.5) return 'strugglingSlow';
  return 'mixed';
}

export type SchulteDifficultyStep = 'advance' | 'hold' | 'stepDown';

/** First failure holds; a second consecutive failure steps one dimension down. Never harsher. */
export function stepDirectionFor(
  perf: SchultePerformanceCase,
  recentAttempts: readonly SchulteMissionAttempt[],
): SchulteDifficultyStep {
  const last = recentAttempts[0];
  if (last && last.result !== 'completed') {
    const lastTwoFailed =
      recentAttempts.length >= RETRY_LOOKBACK_FOR_STEPDOWN &&
      recentAttempts.slice(0, RETRY_LOOKBACK_FOR_STEPDOWN).every(a => a.result !== 'completed');
    return lastTwoFailed ? 'stepDown' : 'hold';
  }
  if (perf === 'fastAccurate') return 'advance';
  return 'hold';
}

// ─── Recording an attempt ───────────────────────────────────────────────────

export function personalBestClassKey(
  attempt: Pick<SchulteMissionAttempt, 'rows' | 'columns' | 'family' | 'targetCount'>,
): string {
  return `${attempt.rows}x${attempt.columns}:${attempt.family}:${attempt.targetCount}`;
}

export interface RecordMissionAttemptResult {
  readonly profile: SchultePlayerSkillProfile;
  readonly attempt: SchulteMissionAttempt;
  /** The best time for this attempt's class before this attempt, if one existed. */
  readonly previousBestMs: number | null;
}

/** Records one attempt and returns the updated profile plus the attempt with `wasPersonalBest` resolved. */
export function recordMissionAttempt(
  profile: SchultePlayerSkillProfile,
  attemptInput: Omit<SchulteMissionAttempt, 'wasPersonalBest'>,
): RecordMissionAttemptResult {
  const classKey = personalBestClassKey(attemptInput);
  const existingBest = profile.personalBests[classKey];
  const wasPersonalBest =
    attemptInput.result === 'completed' && (!existingBest || attemptInput.completionTimeMs < existingBest.timeMs);

  const attempt: SchulteMissionAttempt = { ...attemptInput, wasPersonalBest };

  const rating = calculateOverallRating(profile.rating, attempt);
  const familyMastery = {
    ...profile.familyMastery,
    [attempt.family]: calculateFamilyMastery(profile.familyMastery[attempt.family], attempt),
  };

  const completedSignatures =
    attempt.result === 'completed' && !profile.completedSignatures.includes(attempt.challengeSignature)
      ? [...profile.completedSignatures, attempt.challengeSignature]
      : profile.completedSignatures;

  const recentAttempts = [attempt, ...profile.recentAttempts].slice(0, MAX_ATTEMPT_HISTORY);
  const recentFamilies = [attempt.family, ...profile.recentFamilies].slice(0, RECENT_WINDOW);
  const recentGeometries = [`${attempt.rows}x${attempt.columns}`, ...profile.recentGeometries].slice(0, RECENT_WINDOW);

  let personalBests = profile.personalBests;
  if (wasPersonalBest) {
    const entry: SchultePersonalBestEntry = {
      classKey,
      timeMs: attempt.completionTimeMs,
      signature: attempt.challengeSignature,
      achievedAt: attempt.completedAt,
    };
    personalBests = { ...profile.personalBests, [classKey]: entry };
  }

  const perf = interpretRecentPerformance(recentAttempts);
  const direction = stepDirectionFor(perf, recentAttempts);
  const ladderIndex = clampDirectorLadderIndex(
    profile.ladderIndex + (direction === 'advance' ? 1 : direction === 'stepDown' ? -1 : 0),
  );

  return {
    profile: {
      ...profile,
      rating,
      familyMastery,
      completedSignatures,
      recentAttempts,
      recentFamilies,
      recentGeometries,
      personalBests,
      missionIndex: profile.missionIndex + 1,
      ladderIndex,
    },
    attempt,
    previousBestMs: existingBest?.timeMs ?? null,
  };
}

// ─── Selection ───────────────────────────────────────────────────────────────

export interface SelectNextMissionInput {
  readonly profile: SchultePlayerSkillProfile;
  readonly userStableId: string;
  readonly mode: 'next' | 'retry';
  /** Required when `mode === 'retry'`. */
  readonly lastChallenge?: SchulteChallenge;
  readonly version?: number;
}

export interface SelectNextMissionResult {
  readonly challenge: SchulteChallenge;
  readonly ladderIndex: number;
  readonly band: SchulteMissionBand;
}

const CALIBRATION_GEOMETRY = [3, 3] as const;
const CALIBRATION_TIME_MS = 45_000;

function buildCalibrationMission(
  missionIndex: 0 | 1 | 2,
  userStableId: string,
  version: number,
): SelectNextMissionResult {
  const seed = buildPersonalMissionSeed(userStableId, missionIndex, version);
  const vector = directorVectorAt(0);

  if (missionIndex === 0) {
    const challenge = buildDirectorChallenge({
      id: `schulte-nexus-director-${userStableId}-0-${seed}-v${version}`,
      version,
      seed,
      vector,
      forcedFamily: 'ascending',
      forcedGeometry: CALIBRATION_GEOMETRY,
      forcedTargetCount: 9,
      forcedTimeLimitMs: CALIBRATION_TIME_MS,
    });
    return { challenge, ladderIndex: 0, band: missionBandFor(challenge.timeLimitMs) };
  }
  if (missionIndex === 1) {
    const challenge = buildDirectorChallenge({
      id: `schulte-nexus-director-${userStableId}-1-${seed}-v${version}`,
      version,
      seed,
      vector,
      forcedFamily: 'descending',
      forcedGeometry: CALIBRATION_GEOMETRY,
      forcedTargetCount: 9,
      forcedTimeLimitMs: CALIBRATION_TIME_MS,
    });
    return { challenge, ladderIndex: 0, band: missionBandFor(challenge.timeLimitMs) };
  }
  const challenge = buildDirectorChallenge({
    id: `schulte-nexus-director-${userStableId}-2-${seed}-v${version}`,
    version,
    seed,
    vector,
    forcedFamily: 'ascending',
    forcedGeometry: [4, 4],
    forcedTargetCount: 13,
    forcedTimeLimitMs: CALIBRATION_TIME_MS,
  });
  return { challenge, ladderIndex: 0, band: missionBandFor(challenge.timeLimitMs) };
}

/** A single mastery scalar for the timer model — averaged across every tracked family. */
function averageMasteryScore(profile: SchultePlayerSkillProfile): number {
  const scores = Object.values(profile.familyMastery)
    .filter((m): m is NonNullable<typeof m> => m != null)
    .map(m => m.currentMasteryScore);
  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

function directionOf(challenge: SchulteChallenge): 'asc' | 'desc' | 'other' {
  if (challenge.family === 'ascending') return 'asc';
  if (challenge.family === 'descending') return 'desc';
  return 'other';
}

function noveltyMetaOf(challenge: SchulteChallenge): SchulteNoveltyMeta {
  const targetCount = challenge.targetSequence.length;
  return {
    family: challenge.family,
    geometry: `${challenge.boardSize}x${challenge.columns ?? challenge.boardSize}`,
    targetCount,
    direction: directionOf(challenge),
    band: missionBandFor(challenge.timeLimitMs),
    semanticKey: createSemanticKey(challenge.family, challenge.targetSequence, targetCount),
  };
}

const CANDIDATE_ATTEMPTS = 6;

/**
 * The one public selection function. `mode: 'retry'` returns the exact same
 * challenge (a failed mission may be retried identically); `mode: 'next'`
 * always requests a fresh one and never re-serves a completed signature.
 */
export function selectNextMission(input: SelectNextMissionInput): SelectNextMissionResult {
  const version = input.version ?? SCHULTE_NEXUS_VERSION;

  if (input.mode === 'retry') {
    if (!input.lastChallenge) throw new Error('selectNextMission: retry requires lastChallenge');
    return {
      challenge: input.lastChallenge,
      ladderIndex: input.profile.ladderIndex,
      band: missionBandFor(input.lastChallenge.timeLimitMs),
    };
  }

  if (input.profile.missionIndex <= 2) {
    return buildCalibrationMission(input.profile.missionIndex as 0 | 1 | 2, input.userStableId, version);
  }

  const perf = interpretRecentPerformance(input.profile.recentAttempts);
  const direction = stepDirectionFor(perf, input.profile.recentAttempts);
  const ladderIndex = clampDirectorLadderIndex(
    input.profile.ladderIndex + (direction === 'advance' ? 1 : direction === 'stepDown' ? -1 : 0),
  );
  let vector = directorVectorAt(ladderIndex);
  if (perf === 'fastMistakeProne') vector = controlOrientedVector(vector);

  const masteryScore = averageMasteryScore(input.profile);

  const recentMeta = input.profile.recentAttempts.slice(0, RECENT_WINDOW).map(a => ({
    family: a.family,
    geometry: `${a.rows}x${a.columns}`,
    targetCount: a.targetCount,
    direction: a.family === 'ascending' ? ('asc' as const) : a.family === 'descending' ? ('desc' as const) : ('other' as const),
    band: missionBandFor(a.timeLimitMs),
    semanticKey: createSemanticKey(a.family, a.targetSequence, a.targetCount),
  }));

  let best: { challenge: SchulteChallenge; score: number } | null = null;
  for (let attempt = 0; attempt < CANDIDATE_ATTEMPTS; attempt++) {
    const seed = buildPersonalMissionSeed(input.userStableId, input.profile.missionIndex, version, attempt);
    const challenge = buildDirectorChallenge({
      id: `schulte-nexus-director-${input.userStableId}-${input.profile.missionIndex}-${seed}-v${version}`,
      version,
      seed,
      vector,
      masteryScore,
    });

    if (shouldRejectCandidate(challenge.signature, input.profile.completedSignatures)) continue;

    const score = calculateNoveltyScore(noveltyMetaOf(challenge), recentMeta);
    if (!best || score > best.score) best = { challenge, score };
    if (score >= 0.8) break;
  }

  if (!best) {
    // Every candidate matched a completed signature (astronomically unlikely
    // with real entropy) — one more deterministic roll rather than fail.
    const seed = buildPersonalMissionSeed(input.userStableId, input.profile.missionIndex, version, CANDIDATE_ATTEMPTS);
    const challenge = buildDirectorChallenge({
      id: `schulte-nexus-director-${input.userStableId}-${input.profile.missionIndex}-${seed}-v${version}`,
      version,
      seed,
      vector,
      masteryScore,
    });
    best = { challenge, score: 0 };
  }

  return { challenge: best.challenge, ladderIndex, band: missionBandFor(best.challenge.timeLimitMs) };
}
