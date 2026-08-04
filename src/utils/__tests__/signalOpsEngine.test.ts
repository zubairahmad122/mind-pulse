import { createSeededRandom } from '../seededRandom';
import { classifyPathLockTap } from '../pathLockEngine';
import { classifyPeripheralTap } from '../peripheralAlertEngine';
import { classifyPulseTap } from '../pulseSwitchEngine';
import {
  BOSS_WAVE_PHASE_ORDER,
  BOSS_WAVE_SECONDS,
  CIPHER_SCAN_SECONDS,
  EMPTY_MISSION_METRICS,
  ENERGY_MAX,
  MISSION_DURATION_SECONDS,
  MVP_STAGE_SEQUENCE,
  PATH_LOCK_SECONDS,
  PERIPHERAL_ALERT_SECONDS,
  PULSE_SWITCH_SECONDS,
  STAGE_DURATION_SECONDS,
  applyMissionCorrect,
  applyMissionWrong,
  computeMissionAccuracy,
  computeMissionRating,
  generateBossWaveRound,
  isNewMissionBest,
  isStageTimeUp,
} from '../signalOpsEngine';

describe('mission stage time budget', () => {
  it('every stage in the sequence has a positive duration', () => {
    MVP_STAGE_SEQUENCE.forEach(stage => {
      expect(STAGE_DURATION_SECONDS[stage]).toBeGreaterThan(0);
    });
  });

  it('stage durations sum with the intro to the full mission duration (Boss Wave absorbs the remainder)', () => {
    const sum = CIPHER_SCAN_SECONDS + PULSE_SWITCH_SECONDS + PERIPHERAL_ALERT_SECONDS + PATH_LOCK_SECONDS + BOSS_WAVE_SECONDS;
    expect(sum + 10 /* intro */).toBe(MISSION_DURATION_SECONDS);
  });

  it('Cipher Scan never exceeds 20-25 seconds per spec', () => {
    expect(CIPHER_SCAN_SECONDS).toBeLessThanOrEqual(25);
  });

  it('Cipher Scan represents less than 20% of the full mission', () => {
    expect(CIPHER_SCAN_SECONDS / MISSION_DURATION_SECONDS).toBeLessThan(0.2);
  });

  it('isStageTimeUp is false before the budget and true at/after it', () => {
    const stage = 'pulse-switch' as const;
    const budgetMs = STAGE_DURATION_SECONDS[stage] * 1000;
    expect(isStageTimeUp(stage, budgetMs - 1)).toBe(false);
    expect(isStageTimeUp(stage, budgetMs)).toBe(true);
  });
});

describe('mission metrics reducer', () => {
  it('accumulates score/combo on correct taps and regenerates energy, capped at ENERGY_MAX', () => {
    let m = EMPTY_MISSION_METRICS;
    m = applyMissionCorrect(m, 'cipher-scan', 100);
    m = applyMissionCorrect(m, 'cipher-scan', 100);
    expect(m.score).toBe(200);
    expect(m.combo).toBe(2);
    expect(m.bestCombo).toBe(2);
    expect(m.energy).toBeLessThanOrEqual(ENERGY_MAX);
    expect(m.stageResults['cipher-scan'].correct).toBe(2);
  });

  it('resets combo and drains energy on a wrong tap, never below 0', () => {
    let m = EMPTY_MISSION_METRICS;
    m = applyMissionCorrect(m, 'pulse-switch', 50);
    m = applyMissionWrong(m, 'pulse-switch');
    expect(m.combo).toBe(0);
    expect(m.energy).toBeLessThan(ENERGY_MAX);
    expect(m.stageResults['pulse-switch'].wrong).toBe(1);

    for (let i = 0; i < 20; i++) m = applyMissionWrong(m, 'pulse-switch');
    expect(m.energy).toBe(0);
  });

  it('never hard-fails the mission — metrics stay usable at 0 energy', () => {
    let m = EMPTY_MISSION_METRICS;
    for (let i = 0; i < 50; i++) m = applyMissionWrong(m, 'boss-wave');
    expect(m.energy).toBe(0);
    expect(() => computeMissionRating(m)).not.toThrow();
  });

  it('tracks all five stages independently, including the three new ones', () => {
    let m = EMPTY_MISSION_METRICS;
    m = applyMissionCorrect(m, 'peripheral-alert', 10);
    m = applyMissionWrong(m, 'path-lock');
    m = applyMissionCorrect(m, 'boss-wave', 10);
    expect(m.stageResults['peripheral-alert']).toEqual({ correct: 1, wrong: 0 });
    expect(m.stageResults['path-lock']).toEqual({ correct: 0, wrong: 1 });
    expect(m.stageResults['boss-wave']).toEqual({ correct: 1, wrong: 0 });
    expect(m.stageResults['cipher-scan']).toEqual({ correct: 0, wrong: 0 });
    expect(m.stageResults['pulse-switch']).toEqual({ correct: 0, wrong: 0 });
  });
});

describe('computeMissionAccuracy / computeMissionRating', () => {
  it('handles zero attempts safely', () => {
    expect(computeMissionAccuracy(EMPTY_MISSION_METRICS)).toBe(0);
    expect(computeMissionRating(EMPTY_MISSION_METRICS)).toBe(1);
  });

  it('awards 3 stars only for high accuracy AND healthy energy', () => {
    let high = EMPTY_MISSION_METRICS;
    for (let i = 0; i < 10; i++) high = applyMissionCorrect(high, 'cipher-scan', 10);
    expect(computeMissionRating(high)).toBe(3);

    const highAccuracyLowEnergy = { ...EMPTY_MISSION_METRICS, correctTaps: 9, wrongTaps: 1, energy: 30 };
    expect(computeMissionAccuracy(highAccuracyLowEnergy)).toBeGreaterThanOrEqual(0.85);
    expect(computeMissionRating(highAccuracyLowEnergy)).toBeLessThan(3);
  });

  it('awards 1 star for poor accuracy', () => {
    let low = EMPTY_MISSION_METRICS;
    low = applyMissionCorrect(low, 'cipher-scan', 10);
    for (let i = 0; i < 5; i++) low = applyMissionWrong(low, 'cipher-scan');
    expect(computeMissionRating(low)).toBe(1);
  });
});

describe('isNewMissionBest', () => {
  it('treats no previous best as automatic', () => {
    expect(isNewMissionBest(1, null)).toBe(true);
  });
  it('requires strictly greater', () => {
    expect(isNewMissionBest(100, 100)).toBe(false);
    expect(isNewMissionBest(101, 100)).toBe(true);
  });
});

describe('Boss Wave — genuine composite of Pulse Switch + Peripheral Alert + Path Lock, never a symbol grid', () => {
  it('bundles one real round from each of the three primary-stage engines', () => {
    const round = generateBossWaveRound(createSeededRandom(1), 0);
    expect(round.pulse.sequence.length).toBeGreaterThan(0);
    expect(round.peripheral.threatPosition).toBeGreaterThanOrEqual(0);
    expect(['circle', 'figure-eight']).toContain(round.pathLock.shape);
  });

  it('never references any symbol/grid concept — Boss Wave has no SymbolSpec, no grid field', () => {
    const round = generateBossWaveRound(createSeededRandom(1), 0);
    expect('grid' in round).toBe(false);
    expect('sequence' in round).toBe(false); // that's Pulse's own field, nested under round.pulse
    expect(round).not.toHaveProperty('targetIndexes');
  });

  it('phase order is pulse, then peripheral, then lock', () => {
    expect(BOSS_WAVE_PHASE_ORDER).toEqual(['pulse', 'peripheral', 'lock']);
  });

  it('is deterministic under a fixed seed', () => {
    const a = generateBossWaveRound(createSeededRandom(77), 0);
    const b = generateBossWaveRound(createSeededRandom(77), 0);
    expect(a).toEqual(b);
  });

  it('each embedded round classifies taps correctly using its own mechanic\'s real classifier', () => {
    const round = generateBossWaveRound(createSeededRandom(5), 0);
    expect(classifyPulseTap(round.pulse, round.pulse.sequence[0], 0)).toBe('correct');
    expect(classifyPeripheralTap(round.peripheral, round.peripheral.threatPosition)).toBe('correct');
    const lockedElapsed = round.pathLock.cycleMs - 5;
    expect(classifyPathLockTap(round.pathLock, lockedElapsed)).toBe('correct');
  });
});
