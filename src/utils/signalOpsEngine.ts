import { generatePathLockRound, type PathLockRound } from './pathLockEngine';
import { generatePeripheralRound, type PeripheralRound } from './peripheralAlertEngine';
import { generatePulseRound, type PulseRound } from './pulseSwitchEngine';
import type { SeededRandom } from './seededRandom';

/**
 * Pure mission engine for Signal Ops. Composes the three primary-stage
 * engines (pulseSwitchEngine, peripheralAlertEngine, pathLockEngine)
 * without modifying them — Boss Wave is a genuine composite of all three,
 * not a fourth mechanic. Cipher Scan reuses Neon Cipher's own session
 * engine directly at the call site (in SignalOps.tsx), not through this
 * file, since it's kept intentionally identical and deliberately minor.
 */
export type SignalOpsStage = 'cipher-scan' | 'pulse-switch' | 'peripheral-alert' | 'path-lock' | 'boss-wave';

export const MVP_STAGE_SEQUENCE: SignalOpsStage[] = [
  'cipher-scan',
  'pulse-switch',
  'peripheral-alert',
  'path-lock',
  'boss-wave',
];

export const MISSION_DURATION_SECONDS = 180;
export const INTRO_DURATION_SECONDS = 10;

/**
 * Time-budget-driven stages, not round-count-driven — a stage ends when its
 * clock runs out, not after N rounds, so Cipher Scan genuinely can't
 * dominate the mission regardless of how fast rounds are cleared. Boss
 * Wave gets whatever's left of the 180s budget (~15s), matching the spec's
 * "remaining time" instruction.
 */
export const CIPHER_SCAN_SECONDS = 20;
export const PULSE_SWITCH_SECONDS = 45;
export const PERIPHERAL_ALERT_SECONDS = 45;
export const PATH_LOCK_SECONDS = 45;
export const BOSS_WAVE_SECONDS = Math.max(
  0,
  MISSION_DURATION_SECONDS -
    INTRO_DURATION_SECONDS -
    CIPHER_SCAN_SECONDS -
    PULSE_SWITCH_SECONDS -
    PERIPHERAL_ALERT_SECONDS -
    PATH_LOCK_SECONDS,
);

export const STAGE_DURATION_SECONDS: Record<SignalOpsStage, number> = {
  'cipher-scan': CIPHER_SCAN_SECONDS,
  'pulse-switch': PULSE_SWITCH_SECONDS,
  'peripheral-alert': PERIPHERAL_ALERT_SECONDS,
  'path-lock': PATH_LOCK_SECONDS,
  'boss-wave': BOSS_WAVE_SECONDS,
};

/** True once a stage's own time budget has elapsed — the orchestrator
 *  tracks elapsed-time-in-stage itself; this is the pure boundary check. */
export function isStageTimeUp(stage: SignalOpsStage, elapsedMsInStage: number): boolean {
  return elapsedMsInStage >= STAGE_DURATION_SECONDS[stage] * 1000;
}

export const ENERGY_MAX = 100;
const ENERGY_WRONG_PENALTY = 18;
const ENERGY_CORRECT_REGEN = 4;

/** Cipher Scan is kept, reused as-is per instruction — these are its scoring
 *  and preview-timing constants (the stage itself now ends by time budget,
 *  not a fixed round count). */
export const CIPHER_SCAN_BASE_POINTS = 100;
export const CIPHER_SCAN_PREVIEW_MS = 1500;

export interface StageTally {
  correct: number;
  wrong: number;
}

export interface MissionMetrics {
  score: number;
  combo: number;
  bestCombo: number;
  energy: number;
  correctTaps: number;
  wrongTaps: number;
  stageResults: Record<SignalOpsStage, StageTally>;
}

export const EMPTY_MISSION_METRICS: MissionMetrics = {
  score: 0,
  combo: 0,
  bestCombo: 0,
  energy: ENERGY_MAX,
  correctTaps: 0,
  wrongTaps: 0,
  stageResults: {
    'cipher-scan': { correct: 0, wrong: 0 },
    'pulse-switch': { correct: 0, wrong: 0 },
    'peripheral-alert': { correct: 0, wrong: 0 },
    'path-lock': { correct: 0, wrong: 0 },
    'boss-wave': { correct: 0, wrong: 0 },
  },
};

export function applyMissionCorrect(
  metrics: MissionMetrics,
  stage: SignalOpsStage,
  points: number,
): MissionMetrics {
  const combo = metrics.combo + 1;
  return {
    ...metrics,
    score: metrics.score + points,
    combo,
    bestCombo: Math.max(metrics.bestCombo, combo),
    energy: Math.min(ENERGY_MAX, metrics.energy + ENERGY_CORRECT_REGEN),
    correctTaps: metrics.correctTaps + 1,
    stageResults: {
      ...metrics.stageResults,
      [stage]: { ...metrics.stageResults[stage], correct: metrics.stageResults[stage].correct + 1 },
    },
  };
}

export function applyMissionWrong(metrics: MissionMetrics, stage: SignalOpsStage): MissionMetrics {
  return {
    ...metrics,
    combo: 0,
    // Energy is a soft signal, never a hard fail — floors at 0, mission
    // always continues to completion.
    energy: Math.max(0, metrics.energy - ENERGY_WRONG_PENALTY),
    wrongTaps: metrics.wrongTaps + 1,
    stageResults: {
      ...metrics.stageResults,
      [stage]: { ...metrics.stageResults[stage], wrong: metrics.stageResults[stage].wrong + 1 },
    },
  };
}

export function computeMissionAccuracy(metrics: MissionMetrics): number {
  const total = metrics.correctTaps + metrics.wrongTaps;
  return total === 0 ? 0 : metrics.correctTaps / total;
}

/** 3-star rating: accuracy is the primary signal, energy remaining is the
 *  tiebreaker for the top rating (rewards steady play, not just lucky end). */
export function computeMissionRating(metrics: MissionMetrics): 1 | 2 | 3 {
  const accuracy = computeMissionAccuracy(metrics);
  if (accuracy >= 0.85 && metrics.energy >= 50) return 3;
  if (accuracy >= 0.6) return 2;
  return 1;
}

export function isNewMissionBest(score: number, previousBest: number | null): boolean {
  return previousBest === null || score > previousBest;
}

// ─── Boss Wave — a genuine composite of Pulse Switch + Peripheral Alert +
// Path Lock, never a symbol grid. Each boss round bundles one instance of
// each mechanic's own round shape, generated by that mechanic's own
// (untouched) engine function — this file only composes them. ────────────

export const BOSS_WAVE_POINT_MULTIPLIER = 1.5;

export type BossWavePhase = 'pulse' | 'peripheral' | 'lock';
export const BOSS_WAVE_PHASE_ORDER: BossWavePhase[] = ['pulse', 'peripheral', 'lock'];

export interface BossWaveRound {
  roundIndex: number;
  pulse: PulseRound;
  peripheral: PeripheralRound;
  pathLock: PathLockRound;
}

export function generateBossWaveRound(rng: SeededRandom, roundIndex: number): BossWaveRound {
  // Each sub-round uses a fixed, fair difficulty (round 0 of its own
  // mechanic) — a boss round is already three mechanics back to back;
  // stacking each mechanic's own difficulty ramp on top would risk an
  // unfair combination, which the spec explicitly rules out.
  const pulse = generatePulseRound(rng, 0);
  const peripheral = generatePeripheralRound(rng, 0);
  const pathLock = generatePathLockRound(rng, roundIndex);
  return { roundIndex, pulse, peripheral, pathLock };
}
