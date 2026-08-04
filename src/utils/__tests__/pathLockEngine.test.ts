import { createSeededRandom } from '../seededRandom';
import {
  classifyPathLockTap,
  generatePathLockRound,
  isPathLocked,
  pathLockSpeedBonus,
  pathPosition,
  pointsForPathLockTap,
} from '../pathLockEngine';

describe('generatePathLockRound', () => {
  it('produces a valid shape and positive timing values', () => {
    const round = generatePathLockRound(createSeededRandom(1), 0);
    expect(['circle', 'figure-eight']).toContain(round.shape);
    expect(round.cycleMs).toBeGreaterThan(0);
    expect(round.lockWindowMs).toBeGreaterThan(0);
    expect(round.lockWindowMs).toBeLessThan(round.cycleMs);
  });

  it('is deterministic under a fixed seed', () => {
    const a = generatePathLockRound(createSeededRandom(7), 0);
    const b = generatePathLockRound(createSeededRandom(7), 0);
    expect(a).toEqual(b);
  });
});

describe('isPathLocked / classifyPathLockTap', () => {
  it('is unlocked at the start of a cycle', () => {
    const round = generatePathLockRound(createSeededRandom(1), 0);
    expect(isPathLocked(round, 0)).toBe(false);
    expect(classifyPathLockTap(round, 0)).toBe('wrong');
  });

  it('is locked in the final window of a cycle', () => {
    const round = generatePathLockRound(createSeededRandom(1), 0);
    const justInsideWindow = round.cycleMs - 10;
    expect(isPathLocked(round, justInsideWindow)).toBe(true);
    expect(classifyPathLockTap(round, justInsideWindow)).toBe('correct');
  });

  it('wraps correctly across multiple cycles', () => {
    const round = generatePathLockRound(createSeededRandom(1), 0);
    const secondCycleLocked = round.cycleMs * 2 - 10;
    expect(isPathLocked(round, secondCycleLocked)).toBe(true);
    const secondCycleUnlocked = round.cycleMs * 2 + 5;
    expect(isPathLocked(round, secondCycleUnlocked)).toBe(false);
  });

  it('handles the exact boundary between locked and unlocked consistently', () => {
    const round = generatePathLockRound(createSeededRandom(1), 0);
    const boundary = round.cycleMs - round.lockWindowMs;
    expect(isPathLocked(round, boundary)).toBe(true); // inclusive start of window
  });
});

describe('pathPosition', () => {
  it('stays within the normalized [0,1] canvas for both shapes across a full cycle', () => {
    (['circle', 'figure-eight'] as const).forEach(shape => {
      for (let i = 0; i <= 20; i++) {
        const { x, y } = pathPosition(shape, i / 20);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe('scoring primitives', () => {
  it('pathLockSpeedBonus is highest for an instant tap at window-open, 0 by window-close', () => {
    const round = generatePathLockRound(createSeededRandom(1), 0);
    expect(pathLockSpeedBonus(0, round)).toBe(20);
    expect(pathLockSpeedBonus(round.lockWindowMs, round)).toBe(0);
  });

  it('pointsForPathLockTap composes base + speed bonus', () => {
    const round = generatePathLockRound(createSeededRandom(1), 0);
    expect(pointsForPathLockTap(0, round)).toBeGreaterThan(pointsForPathLockTap(round.lockWindowMs, round));
  });
});
