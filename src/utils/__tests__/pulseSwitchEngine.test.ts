import { createSeededRandom } from '../seededRandom';
import {
  PULSE_MAX_SEQUENCE_LENGTH,
  PULSE_MIN_SEQUENCE_LENGTH,
  PULSE_NODE_COUNT,
  classifyPulseTap,
  generatePulseRound,
  isPulseInputExpired,
  pointsForPulseTap,
  pulseComboMultiplier,
  pulseSpeedBonus,
  sequenceLengthForRound,
} from '../pulseSwitchEngine';

describe('sequenceLengthForRound', () => {
  it('starts at the minimum and grows by 1 per round', () => {
    expect(sequenceLengthForRound(0)).toBe(PULSE_MIN_SEQUENCE_LENGTH);
    expect(sequenceLengthForRound(1)).toBe(PULSE_MIN_SEQUENCE_LENGTH + 1);
    expect(sequenceLengthForRound(2)).toBe(PULSE_MIN_SEQUENCE_LENGTH + 2);
  });

  it('caps at the max sequence length and never exceeds the node count', () => {
    expect(sequenceLengthForRound(50)).toBe(PULSE_MAX_SEQUENCE_LENGTH);
    expect(sequenceLengthForRound(50)).toBeLessThanOrEqual(PULSE_NODE_COUNT);
  });
});

describe('generatePulseRound', () => {
  it('produces a sequence matching the round-scaled length, all distinct node indices in range', () => {
    for (const roundIndex of [0, 1, 2, 3, 10]) {
      const round = generatePulseRound(createSeededRandom(1), roundIndex);
      const expectedLength = sequenceLengthForRound(roundIndex);
      expect(round.sequence).toHaveLength(expectedLength);
      expect(new Set(round.sequence).size).toBe(expectedLength);
      round.sequence.forEach(n => {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(PULSE_NODE_COUNT);
      });
    }
  });

  it('scales the input budget with sequence length (timing pressure grows with difficulty)', () => {
    const shortRound = generatePulseRound(createSeededRandom(1), 0);
    const longRound = generatePulseRound(createSeededRandom(1), 4);
    expect(longRound.sequence.length).toBeGreaterThan(shortRound.sequence.length);
    expect(longRound.inputBudgetMs).toBeGreaterThan(shortRound.inputBudgetMs);
  });

  it('is deterministic under a fixed seed', () => {
    const a = generatePulseRound(createSeededRandom(42), 0);
    const b = generatePulseRound(createSeededRandom(42), 0);
    expect(a).toEqual(b);
  });

  it('produces different sequences across seeds (not always the same order)', () => {
    const seqs = new Set<string>();
    for (let seed = 0; seed < 15; seed++) {
      seqs.add(generatePulseRound(createSeededRandom(seed), 0).sequence.join(','));
    }
    expect(seqs.size).toBeGreaterThan(1);
  });
});

describe('classifyPulseTap', () => {
  it('classifies a tap matching the current sequence position as correct', () => {
    const round = generatePulseRound(createSeededRandom(2), 0);
    expect(classifyPulseTap(round, round.sequence[0], 0)).toBe('correct');
    expect(classifyPulseTap(round, round.sequence[1], 1)).toBe('correct');
  });

  it('classifies a tap on the wrong node for the current position as wrong', () => {
    const round = generatePulseRound(createSeededRandom(2), 0);
    const wrongNode = Array.from({ length: PULSE_NODE_COUNT }, (_, i) => i).find(n => n !== round.sequence[0])!;
    expect(classifyPulseTap(round, wrongNode, 0)).toBe('wrong');
  });

  it('classifies a tap on a future-correct node as wrong if tapped out of order', () => {
    const round = generatePulseRound(createSeededRandom(2), 0);
    expect(classifyPulseTap(round, round.sequence[1], 0)).toBe('wrong');
  });
});

describe('isPulseInputExpired', () => {
  it('is not expired before the budget elapses', () => {
    const round = generatePulseRound(createSeededRandom(1), 0);
    expect(isPulseInputExpired(round, 0)).toBe(false);
    expect(isPulseInputExpired(round, round.inputBudgetMs - 1)).toBe(false);
  });

  it('is expired at/after the budget elapses', () => {
    const round = generatePulseRound(createSeededRandom(1), 0);
    expect(isPulseInputExpired(round, round.inputBudgetMs)).toBe(true);
    expect(isPulseInputExpired(round, round.inputBudgetMs + 5000)).toBe(true);
  });
});

describe('scoring primitives', () => {
  it('pulseSpeedBonus is highest for an instant tap, 0 at/after the budget, never negative', () => {
    expect(pulseSpeedBonus(0)).toBe(25);
    expect(pulseSpeedBonus(1400)).toBe(0);
    expect(pulseSpeedBonus(5000)).toBe(0);
  });

  it('pulseComboMultiplier increases with combo and caps at 1.8x', () => {
    expect(pulseComboMultiplier(0)).toBeCloseTo(1.0);
    expect(pulseComboMultiplier(10)).toBeCloseTo(1.8);
    expect(pulseComboMultiplier(999)).toBe(1.8);
  });

  it('pointsForPulseTap composes base + speed bonus, scaled by combo', () => {
    const noCombo = pointsForPulseTap(0, 0);
    const withCombo = pointsForPulseTap(0, 10);
    expect(withCombo).toBeGreaterThan(noCombo);
  });
});
