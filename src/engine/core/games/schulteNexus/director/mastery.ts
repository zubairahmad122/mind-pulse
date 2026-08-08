import type { SchulteFamilyMastery, SchulteMissionAttempt } from './types';

const EMPTY_MASTERY: SchulteFamilyMastery = {
  plays: 0,
  completions: 0,
  failures: 0,
  averageAccuracy: 0,
  averageCompletionRatio: 0,
  averageRemainingTimeRatio: 0,
  bestTimeMs: null,
  cleanCompletions: 0,
  currentMasteryScore: 0,
};

/** Rolling per-family stats, updated one attempt at a time. Pure and deterministic. */
export function calculateFamilyMastery(
  previous: SchulteFamilyMastery | undefined,
  attempt: SchulteMissionAttempt,
): SchulteFamilyMastery {
  const prev = previous ?? EMPTY_MASTERY;
  const plays = prev.plays + 1;
  const completed = attempt.result === 'completed';
  const completions = prev.completions + (completed ? 1 : 0);
  const failures = prev.failures + (completed ? 0 : 1);

  const completionRatio = attempt.totalRequiredTaps > 0 ? attempt.correctTaps / attempt.totalRequiredTaps : 0;
  const averageAccuracy = (prev.averageAccuracy * prev.plays + attempt.accuracy) / plays;
  const averageCompletionRatio = (prev.averageCompletionRatio * prev.plays + completionRatio) / plays;

  const remainingRatio = attempt.timeLimitMs > 0 ? attempt.remainingTimeMs / attempt.timeLimitMs : 0;
  const averageRemainingTimeRatio = completed
    ? (prev.averageRemainingTimeRatio * prev.completions + remainingRatio) / Math.max(1, completions)
    : prev.averageRemainingTimeRatio;

  const bestTimeMs = completed
    ? prev.bestTimeMs === null
      ? attempt.completionTimeMs
      : Math.min(prev.bestTimeMs, attempt.completionTimeMs)
    : prev.bestTimeMs;

  const cleanCompletions = prev.cleanCompletions + (completed && attempt.mistakes === 0 ? 1 : 0);

  const currentMasteryScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        averageAccuracy * 40 +
          averageCompletionRatio * 30 +
          averageRemainingTimeRatio * 20 +
          (cleanCompletions / Math.max(1, plays)) * 10,
      ),
    ),
  );

  return {
    plays,
    completions,
    failures,
    averageAccuracy,
    averageCompletionRatio,
    averageRemainingTimeRatio,
    bestTimeMs,
    cleanCompletions,
    currentMasteryScore,
  };
}
