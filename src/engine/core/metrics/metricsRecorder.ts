import { clamp01 } from '../types';

/**
 * Shared session bookkeeping.
 *
 * The split here is deliberate: **the recorder is shared, the curve is not.**
 * Every game counts hits, misses, combo and reaction time identically, and
 * reimplementing that per game is how the current prototypes ended up with
 * three subtly different definitions of "accuracy". But how many points a
 * fast hit is worth is a game-design decision, so that lives behind
 * `ScoreRules`, injected per game.
 *
 * Reaction times are only meaningful when they exclude paused time, which is
 * why callers pass the lifecycle's `activeMs`-derived value rather than
 * wall-clock.
 */
export type MissReason = 'wrong-target' | 'timeout' | 'decoy' | 'out-of-bounds';

export interface ScoreRules {
  pointsForHit(reactionMs: number, comboBefore: number, difficulty01: number): number;
  penaltyForMiss(reason: MissReason): number;
  comboMultiplier(combo: number): number;
  /** Combo tolerance — how many misses before the combo resets. Most games
   *  want 0 (any miss breaks it); a forgiving mode can raise it. */
  missesToBreakCombo?: number;
}

export interface StageResult {
  id: string;
  hits: number;
  misses: number;
  durationMs: number;
  outcome: 'complete' | 'failed';
}

export interface MetricsSnapshot {
  score: number;
  combo: number;
  bestCombo: number;
  hits: number;
  misses: number;
  accuracy01: number;
  avgReactionMs: number;
  bestReactionMs: number;
  durationMs: number;
  stages: readonly StageResult[];
}

export interface MetricsRecorder {
  /** Records a hit and returns the points awarded. */
  hit(reactionMs: number, difficulty01?: number): number;
  miss(reason: MissReason): void;

  beginStage(id: string): void;
  endStage(outcome: 'complete' | 'failed'): void;

  /** Advances the session duration. Call once per fixed step while running. */
  tick(dtMs: number): void;

  snapshot(): MetricsSnapshot;
  reset(): void;
}

export function createMetricsRecorder(rules: ScoreRules): MetricsRecorder {
  const missesToBreak = rules.missesToBreakCombo ?? 0;

  let score = 0;
  let combo = 0;
  let bestCombo = 0;
  let hits = 0;
  let misses = 0;
  let reactionSum = 0;
  let bestReactionMs = Number.POSITIVE_INFINITY;
  let durationMs = 0;
  let missesSinceHit = 0;

  const stages: StageResult[] = [];
  let openStage: StageResult | null = null;
  let openStageStartMs = 0;

  return {
    hit(reactionMs, difficulty01 = 0) {
      const points = Math.max(0, Math.round(rules.pointsForHit(reactionMs, combo, difficulty01)));
      score += points;
      hits++;
      combo++;
      missesSinceHit = 0;
      if (combo > bestCombo) bestCombo = combo;
      reactionSum += reactionMs;
      if (reactionMs < bestReactionMs) bestReactionMs = reactionMs;
      if (openStage) openStage.hits++;
      return points;
    },

    miss(reason) {
      misses++;
      missesSinceHit++;
      // Score floors at zero: a player having a bad run should see a small
      // number, never a negative one.
      score = Math.max(0, score - Math.abs(rules.penaltyForMiss(reason)));
      if (missesSinceHit > missesToBreak) combo = 0;
      if (openStage) openStage.misses++;
    },

    beginStage(id) {
      // An unclosed stage is a bug in the caller, not a reason to lose data —
      // close it as failed and move on.
      if (openStage) this.endStage('failed');
      openStage = { id, hits: 0, misses: 0, durationMs: 0, outcome: 'complete' };
      openStageStartMs = durationMs;
    },

    endStage(outcome) {
      if (!openStage) return;
      openStage.durationMs = durationMs - openStageStartMs;
      openStage.outcome = outcome;
      stages.push(openStage);
      openStage = null;
    },

    tick(dtMs) {
      durationMs += dtMs;
    },

    snapshot() {
      const attempts = hits + misses;
      return {
        score,
        combo,
        bestCombo,
        hits,
        misses,
        accuracy01: attempts === 0 ? 0 : clamp01(hits / attempts),
        avgReactionMs: hits === 0 ? 0 : Math.round(reactionSum / hits),
        bestReactionMs: Number.isFinite(bestReactionMs) ? Math.round(bestReactionMs) : 0,
        durationMs,
        stages: stages.slice(),
      };
    },

    reset() {
      score = 0;
      combo = 0;
      bestCombo = 0;
      hits = 0;
      misses = 0;
      reactionSum = 0;
      bestReactionMs = Number.POSITIVE_INFINITY;
      durationMs = 0;
      missesSinceHit = 0;
      stages.length = 0;
      openStage = null;
      openStageStartMs = 0;
    },
  };
}

/** Star rating from accuracy and combo — shared so every game's results
 *  screen means the same thing. Games choose the thresholds they pass in. */
export function starRating(snapshot: MetricsSnapshot): 1 | 2 | 3 {
  const { accuracy01 } = snapshot;
  if (accuracy01 >= 0.9) return 3;
  if (accuracy01 >= 0.7) return 2;
  return 1;
}
