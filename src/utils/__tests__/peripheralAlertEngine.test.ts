import { createSeededRandom } from '../seededRandom';
import {
  PERIPHERAL_FALSE_ALERT_FROM_ROUND,
  PERIPHERAL_POSITION_COUNT,
  classifyPeripheralTap,
  generatePeripheralRound,
  peripheralSpeedBonus,
  pointsForPeripheralTap,
} from '../peripheralAlertEngine';

describe('generatePeripheralRound', () => {
  it('produces a threat position within the valid range', () => {
    const round = generatePeripheralRound(createSeededRandom(1), 0);
    expect(round.threatPosition).toBeGreaterThanOrEqual(0);
    expect(round.threatPosition).toBeLessThan(PERIPHERAL_POSITION_COUNT);
  });

  it('has no false alerts before the introduction round', () => {
    for (let round = 0; round < PERIPHERAL_FALSE_ALERT_FROM_ROUND; round++) {
      expect(generatePeripheralRound(createSeededRandom(round + 1), round).falseAlertPositions).toHaveLength(0);
    }
  });

  it('introduces exactly one false alert from the configured round onward, never colliding with the threat', () => {
    const round = generatePeripheralRound(createSeededRandom(5), PERIPHERAL_FALSE_ALERT_FROM_ROUND);
    expect(round.falseAlertPositions).toHaveLength(1);
    expect(round.falseAlertPositions[0]).not.toBe(round.threatPosition);
  });

  it('is deterministic under a fixed seed', () => {
    const a = generatePeripheralRound(createSeededRandom(42), 3);
    const b = generatePeripheralRound(createSeededRandom(42), 3);
    expect(a).toEqual(b);
  });
});

describe('classifyPeripheralTap', () => {
  it('classifies a tap on the threat position as correct', () => {
    const round = generatePeripheralRound(createSeededRandom(1), 0);
    expect(classifyPeripheralTap(round, round.threatPosition)).toBe('correct');
  });

  it('classifies a tap on a false alert as wrong', () => {
    const round = generatePeripheralRound(createSeededRandom(9), PERIPHERAL_FALSE_ALERT_FROM_ROUND);
    expect(classifyPeripheralTap(round, round.falseAlertPositions[0])).toBe('wrong');
  });

  it('classifies a tap on any other unrelated position as wrong', () => {
    const round = generatePeripheralRound(createSeededRandom(1), 0);
    const unrelated = Array.from({ length: PERIPHERAL_POSITION_COUNT }, (_, i) => i)
      .find(p => p !== round.threatPosition && !round.falseAlertPositions.includes(p))!;
    expect(classifyPeripheralTap(round, unrelated)).toBe('wrong');
  });
});

describe('scoring primitives', () => {
  it('peripheralSpeedBonus is highest for instant reaction, 0 at/after expiry, never negative', () => {
    expect(peripheralSpeedBonus(0)).toBe(25);
    expect(peripheralSpeedBonus(1300)).toBe(0);
    expect(peripheralSpeedBonus(9999)).toBe(0);
  });

  it('pointsForPeripheralTap composes base + speed bonus', () => {
    expect(pointsForPeripheralTap(0)).toBeGreaterThan(pointsForPeripheralTap(1300));
  });
});
