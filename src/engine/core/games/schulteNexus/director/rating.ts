import { SCHULTE_RATING_BANDS, type SchulteMissionAttempt } from './types';
import { averageVectorComplexity } from './ladder';

const MIN_RATING = 0;
const MAX_RATING = 1000;

export function ratingBandFor(rating: number): string {
  const band = SCHULTE_RATING_BANDS.find(b => rating <= b.max);
  return band?.label ?? 'Nexus';
}

/**
 * Deterministic rating update. Failures never lose points — difficulty
 * adaptation (see `missionDirector.ts`) is the mechanism that responds to a
 * bad run, not rating loss, so a player is never punished twice for one
 * mistake-heavy mission.
 */
export function calculateOverallRating(previousRating: number, attempt: SchulteMissionAttempt): number {
  if (attempt.result !== 'completed') return previousRating;

  const remainingRatio = attempt.timeLimitMs > 0 ? attempt.remainingTimeMs / attempt.timeLimitMs : 0;
  const clean = attempt.mistakes === 0;

  let delta = 4;
  if (clean) delta += 4;
  if (remainingRatio >= 0.4) delta += 6;
  else if (remainingRatio >= 0.2) delta += 3;
  else if (remainingRatio < 0.05) delta -= 1;
  delta = Math.max(0, delta);

  const difficultyScale = 0.6 + (averageVectorComplexity(attempt.difficulty) / 100) * 0.8;
  const adjusted = Math.round(delta * difficultyScale);

  return Math.max(MIN_RATING, Math.min(MAX_RATING, previousRating + adjusted));
}
