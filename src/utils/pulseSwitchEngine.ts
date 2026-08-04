import { shuffle, type SeededRandom } from './seededRandom';

/**
 * Pure engine for the Pulse Switch stage of Signal Ops — one of the
 * mission's primary stages. A fixed layout of nodes lights up a sequence,
 * the player taps them back in order, against a real time-pressure budget
 * for the whole sequence (not just a per-tap reaction bonus). No React, no
 * rendering, fully deterministic under a seed.
 */
export const PULSE_NODE_COUNT = 6;
export const PULSE_MIN_SEQUENCE_LENGTH = 2;
export const PULSE_MAX_SEQUENCE_LENGTH = 6;
export const PULSE_BASE_POINTS = 70;
export const PULSE_REACTION_BUDGET_MS = 1400;
/** Whole-sequence input budget scales with length — this is the "timing
 *  pressure" requirement: a longer sequence gets more total time, but not
 *  proportionally generous, so longer sequences are genuinely harder. */
const PULSE_INPUT_BUDGET_PER_NODE_MS = 950;

export interface PulseRound {
  roundIndex: number;
  /** Node indices (0..PULSE_NODE_COUNT-1), in the order to reproduce. */
  sequence: number[];
  /** Total time allowed to complete the whole sequence, from first input. */
  inputBudgetMs: number;
}

/** Sequence length ramps with round index — fair pattern variation, not a
 *  fixed length every round. Starts at 2, grows by 1 per round, caps at 6. */
export function sequenceLengthForRound(roundIndex: number): number {
  return Math.min(PULSE_MIN_SEQUENCE_LENGTH + roundIndex, PULSE_MAX_SEQUENCE_LENGTH);
}

export function generatePulseRound(rng: SeededRandom, roundIndex: number): PulseRound {
  const length = sequenceLengthForRound(roundIndex);
  const nodes = Array.from({ length: PULSE_NODE_COUNT }, (_, i) => i);
  const sequence = shuffle(rng, nodes).slice(0, length);
  return { roundIndex, sequence, inputBudgetMs: length * PULSE_INPUT_BUDGET_PER_NODE_MS };
}

export type PulseTapClassification = 'correct' | 'wrong';

/** `progress` is how many sequence entries have already been tapped correctly. */
export function classifyPulseTap(round: PulseRound, nodeIndex: number, progress: number): PulseTapClassification {
  return round.sequence[progress] === nodeIndex ? 'correct' : 'wrong';
}

/** True once the whole-sequence input budget has run out — a timing-pressure
 *  failure distinct from a wrong tap (the player simply ran out of time). */
export function isPulseInputExpired(round: PulseRound, elapsedMsSinceInputStart: number): boolean {
  return elapsedMsSinceInputStart >= round.inputBudgetMs;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function pulseSpeedBonus(reactionMs: number): number {
  return Math.round(clamp01(1 - reactionMs / PULSE_REACTION_BUDGET_MS) * 25);
}

export function pulseComboMultiplier(combo: number): number {
  return Math.min(1 + 0.08 * combo, 1.8);
}

export function pointsForPulseTap(reactionMs: number, comboBeforeThisTap: number): number {
  return Math.round((PULSE_BASE_POINTS + pulseSpeedBonus(reactionMs)) * pulseComboMultiplier(comboBeforeThisTap));
}
