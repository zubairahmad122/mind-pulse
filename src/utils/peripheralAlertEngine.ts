import { pickRandom, shuffle, type SeededRandom } from './seededRandom';

/**
 * Pure engine for the Peripheral Alert stage: a central "mission core" stays
 * visually present (decorative framing only — this does not detect where
 * the player is actually looking; no gaze/fixation claim is made anywhere
 * in this file), while a signal briefly appears at one of eight fixed edge
 * positions and must be tapped before it expires. At higher rounds, a false
 * alert may appear alongside the real one — tapping it is wrong.
 */
export const PERIPHERAL_POSITION_COUNT = 8;
export const PERIPHERAL_EXPIRY_MS = 1300;
export const PERIPHERAL_BASE_POINTS = 90;
/** False alerts start appearing from this round index onward (0-based). */
export const PERIPHERAL_FALSE_ALERT_FROM_ROUND = 2;

export interface PeripheralRound {
  roundIndex: number;
  /** 0..PERIPHERAL_POSITION_COUNT-1 — the position that must be tapped. */
  threatPosition: number;
  /** Decoy positions present this round — tapping any of these is wrong. */
  falseAlertPositions: number[];
  expiryMs: number;
}

export function generatePeripheralRound(rng: SeededRandom, roundIndex: number): PeripheralRound {
  const positions = Array.from({ length: PERIPHERAL_POSITION_COUNT }, (_, i) => i);
  const shuffled = shuffle(rng, positions);
  const threatPosition = shuffled[0];

  const includeFalseAlert = roundIndex >= PERIPHERAL_FALSE_ALERT_FROM_ROUND;
  const falseAlertPositions = includeFalseAlert ? [shuffled[1]] : [];

  return { roundIndex, threatPosition, falseAlertPositions, expiryMs: PERIPHERAL_EXPIRY_MS };
}

export type PeripheralTapClassification = 'correct' | 'wrong';

export function classifyPeripheralTap(round: PeripheralRound, position: number): PeripheralTapClassification {
  return position === round.threatPosition ? 'correct' : 'wrong';
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function peripheralSpeedBonus(reactionMs: number): number {
  return Math.round(clamp01(1 - reactionMs / PERIPHERAL_EXPIRY_MS) * 25);
}

export function pointsForPeripheralTap(reactionMs: number): number {
  return PERIPHERAL_BASE_POINTS + peripheralSpeedBonus(reactionMs);
}

/** Exported for tests/UI that need one arbitrary non-threat position (e.g.
 *  to render a demo state) without duplicating the "any position but this
 *  one" logic. */
export function anyOtherPosition(rng: SeededRandom, exclude: number): number {
  const options = Array.from({ length: PERIPHERAL_POSITION_COUNT }, (_, i) => i).filter(p => p !== exclude);
  return pickRandom(rng, options);
}
