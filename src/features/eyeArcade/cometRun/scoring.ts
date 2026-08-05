import type { ScoreRules } from '@/engine/core/metrics/metricsRecorder';

/**
 * How much a base value is worth before the combo multiplier — the divisor
 * used to encode an event's points in the shared recorder's `difficulty01`
 * slot. See `COMET_RUN_SCORE` for why that slot is used this way.
 */
export const SCORE_UNIT = 2000;

/**
 * Comet Run's score curve.
 *
 * The `MetricsRecorder` is shared across every game and takes one number per
 * hit; this game has five kinds of hit worth wildly different amounts (a
 * gate, a scout, a turret, the boss, the checkpoint). Rather than fork the
 * recorder, an event's **base value rides in the `difficulty01` slot,
 * normalised by `SCORE_UNIT`** — so `metrics.hit(reaction, 200 / SCORE_UNIT)`
 * banks a 200-point scout. Reaction time still travels separately and still
 * means what the results screen thinks it means.
 *
 * That is a deliberate reading of a deliberately loose parameter, and it is
 * documented here rather than at the twelve call sites that use it.
 *
 * **No accessibility setting can move a score in this game.** Comet Run is
 * free-flight: there are no tap targets to enlarge and no reaction windows to
 * stretch, so the policy touches contrast, particles, shake and popup travel
 * and nothing else. `__tests__/accessibility.test.ts` replays one input
 * stream under every combination and compares the full metrics snapshot.
 */
export const COMET_RUN_SCORE: ScoreRules = {
  pointsForHit(reactionMs, comboBefore, value01) {
    void reactionMs;
    return value01 * SCORE_UNIT * this.comboMultiplier(comboBefore);
  },

  penaltyForMiss(reason) {
    // Taking a hit costs points as well as shield, so a run that survives by
    // bulldozing through the corridor does not out-score one that flies it.
    return reason === 'timeout' ? 150 : 80;
  },

  comboMultiplier(combo) {
    // Caps at 12 so a long clean run stays worth chasing without the last
    // kill being worth more than the first thirty.
    return 1 + Math.min(combo, 12) * 0.1;
  },

  missesToBreakCombo: 0,
};
