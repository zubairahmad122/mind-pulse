import { createSeededRandom } from '../seededRandom';
import { symbolsEqual } from '../neonCipherSymbols';
import {
  DIFFICULTY_BASE_POINTS,
  EMPTY_NEON_CIPHER_METRICS,
  NEON_CIPHER_DIFFICULTIES,
  NEON_CIPHER_DIFFICULTY_PRESETS,
  PHASE_A_DIFFICULTIES,
  applyCorrectTap,
  applyWrongTap,
  classifyTap,
  comboMultiplier,
  completeRound,
  computeAccuracy,
  computeAvgSearchMs,
  generateRound,
  isNewPersonalBest,
  pointsForCorrectTap,
  speedBonus,
  wrongTapPenalty,
} from '../neonCipherEngine';

describe('generateRound', () => {
  it('produces a grid matching the difficulty preset size', () => {
    for (const difficulty of NEON_CIPHER_DIFFICULTIES) {
      const preset = NEON_CIPHER_DIFFICULTY_PRESETS[difficulty];
      const round = generateRound(createSeededRandom(1), difficulty, 0);
      expect(round.grid).toHaveLength(preset.gridSize * preset.gridSize);
      expect(round.sequence).toHaveLength(preset.sequenceLength);
      expect(round.targetIndexes).toHaveLength(preset.sequenceLength);
    }
  });

  it('places every sequence symbol at its declared target index', () => {
    for (const difficulty of NEON_CIPHER_DIFFICULTIES) {
      const round = generateRound(createSeededRandom(2), difficulty, 0);
      round.sequence.forEach((symbol, i) => {
        expect(symbolsEqual(round.grid[round.targetIndexes[i]], symbol)).toBe(true);
      });
    }
  });

  it('never places two target indexes on the same cell', () => {
    const round = generateRound(createSeededRandom(3), 'elite', 0);
    expect(new Set(round.targetIndexes).size).toBe(round.targetIndexes.length);
  });

  it('is fully deterministic for a fixed seed (identical rounds)', () => {
    const a = generateRound(createSeededRandom(77), 'casual', 0);
    const b = generateRound(createSeededRandom(77), 'casual', 0);
    expect(a).toEqual(b);
  });

  it('Phase A only exposes gentle and casual', () => {
    expect(PHASE_A_DIFFICULTIES).toEqual(['gentle', 'casual']);
  });
});

describe('classifyTap', () => {
  it('classifies a tap on the expected target index as correct', () => {
    const round = generateRound(createSeededRandom(5), 'gentle', 0);
    expect(classifyTap(round, round.targetIndexes[0], 0)).toBe('correct');
  });

  it('classifies a tap anywhere else as wrong', () => {
    const round = generateRound(createSeededRandom(5), 'gentle', 0);
    const wrongIndex = round.grid.findIndex((_, i) => i !== round.targetIndexes[0]);
    expect(classifyTap(round, wrongIndex, 0)).toBe('wrong');
  });

  it('advances correctly through a multi-symbol sequence', () => {
    const round = generateRound(createSeededRandom(6), 'elite', 0);
    round.targetIndexes.forEach((idx, progress) => {
      expect(classifyTap(round, idx, progress)).toBe('correct');
    });
  });
});

describe('scoring primitives', () => {
  it('speedBonus is highest for an instant tap and 0 at/after the budget', () => {
    expect(speedBonus(0, 4000)).toBe(30);
    expect(speedBonus(4000, 4000)).toBe(0);
    expect(speedBonus(9000, 4000)).toBe(0); // never negative
  });

  it('comboMultiplier increases with streak and caps at 2.0x', () => {
    expect(comboMultiplier(0)).toBeCloseTo(1.0);
    expect(comboMultiplier(5)).toBeCloseTo(1.5);
    expect(comboMultiplier(100)).toBe(2.0);
  });

  it('pointsForCorrectTap scales with difficulty base points', () => {
    const gentle = pointsForCorrectTap('gentle', 0, 6000, 0);
    const elite = pointsForCorrectTap('elite', 0, 2800, 0);
    expect(elite).toBeGreaterThan(gentle);
    expect(gentle).toBe(Math.round((DIFFICULTY_BASE_POINTS.gentle + 30) * 1.0));
  });

  it('wrongTapPenalty is half of the difficulty base points', () => {
    expect(wrongTapPenalty('casual')).toBe(Math.round(DIFFICULTY_BASE_POINTS.casual * 0.5));
  });
});

describe('session metrics reducer', () => {
  it('accumulates score, combo, and search times on correct taps (Time Attack)', () => {
    let metrics = EMPTY_NEON_CIPHER_METRICS;
    metrics = applyCorrectTap(metrics, 'time-attack', 'casual', 1000, 4500);
    metrics = applyCorrectTap(metrics, 'time-attack', 'casual', 1000, 4500);
    expect(metrics.correctTaps).toBe(2);
    expect(metrics.combo).toBe(2);
    expect(metrics.bestCombo).toBe(2);
    expect(metrics.score).toBeGreaterThan(0);
    expect(metrics.searchTimesMs).toEqual([1000, 1000]);
  });

  it('Calm Hunt never scores, even on correct taps', () => {
    let metrics = EMPTY_NEON_CIPHER_METRICS;
    metrics = applyCorrectTap(metrics, 'calm-hunt', 'gentle', 500, 6000);
    expect(metrics.score).toBe(0);
    expect(metrics.correctTaps).toBe(1);
  });

  it('a wrong tap resets combo and applies a penalty in Time Attack only', () => {
    let metrics = applyCorrectTap(EMPTY_NEON_CIPHER_METRICS, 'time-attack', 'casual', 500, 4500);
    const scoreBeforeWrong = metrics.score;
    metrics = applyWrongTap(metrics, 'time-attack', 'casual');
    expect(metrics.combo).toBe(0);
    expect(metrics.wrongTaps).toBe(1);
    expect(metrics.score).toBeLessThan(scoreBeforeWrong);

    let calmMetrics = applyCorrectTap(EMPTY_NEON_CIPHER_METRICS, 'calm-hunt', 'gentle', 500, 6000);
    calmMetrics = applyWrongTap(calmMetrics, 'calm-hunt', 'gentle');
    expect(calmMetrics.score).toBe(0); // no penalty in Calm Hunt
  });

  it('score never goes negative', () => {
    let metrics = EMPTY_NEON_CIPHER_METRICS;
    metrics = applyWrongTap(metrics, 'time-attack', 'elite');
    expect(metrics.score).toBe(0);
  });

  it('completeRound increments roundsCompleted only', () => {
    const before = EMPTY_NEON_CIPHER_METRICS;
    const after = completeRound(before);
    expect(after.roundsCompleted).toBe(1);
    expect(after.correctTaps).toBe(before.correctTaps);
  });

  it('computeAccuracy and computeAvgSearchMs handle the zero-attempts case safely', () => {
    expect(computeAccuracy(EMPTY_NEON_CIPHER_METRICS)).toBe(0);
    expect(computeAvgSearchMs(EMPTY_NEON_CIPHER_METRICS)).toBe(0);
  });

  it('computeAccuracy and computeAvgSearchMs compute correctly with data', () => {
    let metrics = EMPTY_NEON_CIPHER_METRICS;
    metrics = applyCorrectTap(metrics, 'time-attack', 'casual', 1000, 4500);
    metrics = applyCorrectTap(metrics, 'time-attack', 'casual', 2000, 4500);
    metrics = applyWrongTap(metrics, 'time-attack', 'casual');
    expect(computeAccuracy(metrics)).toBeCloseTo(2 / 3);
    expect(computeAvgSearchMs(metrics)).toBe(1500);
  });
});

describe('isNewPersonalBest', () => {
  it('treats no previous best as an automatic new best', () => {
    expect(isNewPersonalBest(1, null)).toBe(true);
  });
  it('requires strictly greater to count as new best', () => {
    expect(isNewPersonalBest(100, 100)).toBe(false);
    expect(isNewPersonalBest(101, 100)).toBe(true);
    expect(isNewPersonalBest(99, 100)).toBe(false);
  });
});

describe('accessibility non-penalty contract', () => {
  // Accessibility settings (large target, high contrast, reduced motion)
  // must never change scoring — they're not modeled as engine inputs at
  // all, which is the structural guarantee: there is no code path in this
  // file that reads an accessibility flag, so it's impossible for one to
  // affect pointsForCorrectTap/accuracy by construction.
  it('pointsForCorrectTap has no accessibility-related parameter', () => {
    expect(pointsForCorrectTap.length).toBe(4); // difficulty, searchMs, budgetMs, combo
  });
});
