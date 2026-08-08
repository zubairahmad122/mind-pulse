import type { SchulteMissionAttempt } from './types';

/**
 * Progress *within* a level — separate from the Mission Director's own
 * `ladderIndex`/rating, which keep governing per-mission difficulty. Leveling
 * up never touches those; it only widens which envelope `resolveNextSchulteLevelMission`
 * may draw the next mission from.
 */
export interface SchulteLevelState {
  readonly currentLevel: number;
  /** 0..100+ progress toward the next level; never negative. */
  readonly levelProgress: number;
  readonly highestUnlockedLevel: number;
  readonly missionsCompletedAtCurrentLevel: number;
  /** Which mission slot within the current level (0, 1, 2, ...). Controls envelope expansion. */
  readonly missionInLevel: number;
}

export function createStartingLevelState(): SchulteLevelState {
  return { currentLevel: 1, levelProgress: 0, highestUnlockedLevel: 1, missionsCompletedAtCurrentLevel: 0, missionInLevel: 0 };
}

const LEVEL_UP_THRESHOLD = 100;

/**
 * Progress granted by one attempt, 0–40. A single clean/fast completion can
 * never reach the threshold alone (max 40 < 100), so leveling up always
 * takes multiple missions by construction. Failure grants 0 — never a
 * regression, only a pause.
 */
export function calculateSchulteLevelProgress(attempt: SchulteMissionAttempt): number {
  if (attempt.result !== 'completed') return 0;

  const remainingRatio = attempt.timeLimitMs > 0 ? attempt.remainingTimeMs / attempt.timeLimitMs : 0;
  const clean = attempt.mistakes === 0;

  if (clean && remainingRatio >= 0.35) return 40;
  if (clean && remainingRatio >= 0.15) return 32;
  if (attempt.mistakes <= 1 && remainingRatio >= 0.1) return 24;
  return 14;
}

export function applySchulteLevelProgress(state: SchulteLevelState, attempt: SchulteMissionAttempt): SchulteLevelState {
  const delta = calculateSchulteLevelProgress(attempt);
  const missionsCompletedAtCurrentLevel =
    attempt.result === 'completed' ? state.missionsCompletedAtCurrentLevel + 1 : state.missionsCompletedAtCurrentLevel;
  const missionInLevel = attempt.result === 'completed' ? state.missionInLevel + 1 : state.missionInLevel;

  const rawProgress = state.levelProgress + delta;
  if (rawProgress < LEVEL_UP_THRESHOLD) {
    return { ...state, levelProgress: rawProgress, missionsCompletedAtCurrentLevel, missionInLevel };
  }

  const nextLevel = state.currentLevel + 1;
  return {
    currentLevel: nextLevel,
    levelProgress: rawProgress - LEVEL_UP_THRESHOLD,
    highestUnlockedLevel: Math.max(state.highestUnlockedLevel, nextLevel),
    missionsCompletedAtCurrentLevel: 0,
    missionInLevel: 0,
  };
}
