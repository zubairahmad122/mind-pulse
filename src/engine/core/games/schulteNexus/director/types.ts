import type { SchulteFamily } from '../types';

/**
 * Mission Director — additive types layered on top of the existing
 * `SchulteChallenge`/`SchulteNexusProfile` model. Nothing here replaces the
 * daily/ladder generator; it is a second, richer selection layer that reuses
 * the same low-level building blocks (see `challengeBuilder.ts`).
 */

export type SchulteMissionBand = 'quick' | 'normal' | 'advanced';

/** Multi-dimensional difficulty — deliberately not a single "level" number. */
export interface SchulteDirectorVector {
  readonly searchSpeed: number;
  readonly targetCount: number;
  readonly gridComplexity: number;
  readonly sequenceComplexity: number;
  readonly ruleSwitching: number;
  readonly visualComplexity: number;
  readonly timePressure: number;
}

export const SCHULTE_DIRECTOR_DIMENSIONS = [
  'searchSpeed',
  'targetCount',
  'gridComplexity',
  'sequenceComplexity',
  'ruleSwitching',
  'visualComplexity',
  'timePressure',
] as const;

export type SchulteDirectorDimension = (typeof SCHULTE_DIRECTOR_DIMENSIONS)[number];

export type SchulteMissionResult = 'completed' | 'failedMistakes' | 'timedOut' | 'abandoned';

/** One completed-or-not attempt at a mission — the durable record. */
export interface SchulteMissionAttempt {
  readonly challengeId: string;
  readonly challengeSignature: string;
  readonly generatorVersion: number;
  readonly seed: number;
  readonly family: SchulteFamily;
  readonly rows: number;
  readonly columns: number;
  readonly targetCount: number;
  readonly activeValueCount: number;
  readonly targetSequence: readonly number[];
  readonly timeLimitMs: number;
  readonly completionTimeMs: number;
  readonly remainingTimeMs: number;
  readonly mistakes: number;
  readonly allowedMistakes: number;
  readonly correctTaps: number;
  readonly totalRequiredTaps: number;
  /** 0..1 */
  readonly accuracy: number;
  readonly result: SchulteMissionResult;
  readonly difficulty: SchulteDirectorVector;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly wasPersonalBest: boolean;
}

/** Per-family experience — tracked separately so mastery in one family never inflates another. */
export interface SchulteFamilyMastery {
  readonly plays: number;
  readonly completions: number;
  readonly failures: number;
  readonly averageAccuracy: number;
  readonly averageCompletionRatio: number;
  readonly averageRemainingTimeRatio: number;
  readonly bestTimeMs: number | null;
  readonly cleanCompletions: number;
  /** 0..100 */
  readonly currentMasteryScore: number;
}

export interface SchultePersonalBestEntry {
  readonly classKey: string;
  readonly timeMs: number;
  readonly signature: string;
  readonly achievedAt: number;
}

export const SCHULTE_RATING_BANDS = [
  { max: 149, label: 'Starter' },
  { max: 299, label: 'Steady' },
  { max: 449, label: 'Sharp' },
  { max: 649, label: 'Advanced' },
  { max: 799, label: 'Expert' },
  { max: Infinity, label: 'Nexus' },
] as const;

/** Everything the Mission Director needs to know about one returning player. */
export interface SchultePlayerSkillProfile {
  /** 0..1000 internal gameplay rating — not IQ, used only for matchmaking difficulty. */
  readonly rating: number;
  readonly missionIndex: number;
  readonly ladderIndex: number;
  readonly familyMastery: Readonly<Partial<Record<SchulteFamily, SchulteFamilyMastery>>>;
  readonly personalBests: Readonly<Record<string, SchultePersonalBestEntry>>;
  /** Newest first, bounded. */
  readonly recentAttempts: readonly SchulteMissionAttempt[];
  readonly completedSignatures: readonly string[];
  /** Newest first, bounded — used for anti-repetition. */
  readonly recentFamilies: readonly SchulteFamily[];
  readonly recentGeometries: readonly string[];
  /**
   * Architecture hook for future expert/negative-number content. Normal
   * mission selection never sets this true on its own — see
   * `missionDirector.ts`.
   */
  readonly allowNegativeNumbers: boolean;
}

export interface SchulteNumberRangeConfig {
  readonly allowNegative: boolean;
  readonly origin: number;
}

export const SCHULTE_DEFAULT_NUMBER_RANGE: SchulteNumberRangeConfig = {
  allowNegative: false,
  origin: 1,
};
