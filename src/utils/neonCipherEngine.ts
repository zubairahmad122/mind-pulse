import { pickRandom, shuffle, type SeededRandom } from './seededRandom';
import { generateGrid, generateDistractor, type DistractorSimilarity } from './neonCipherGrid';
import { generateSymbol, symbolId, type SymbolSpec } from './neonCipherSymbols';

/**
 * Pure round/session engine for Neon Cipher — no React, no rendering, fully
 * deterministic under a seed. Difficulty presets cover all four tiers per
 * the approved difficulty table; Phase A only exposes 'gentle'/'casual' in
 * the UI, but 'sharp'/'elite' are defined now so Phase B doesn't need an
 * engine rewrite.
 */
export type NeonCipherDifficulty = 'gentle' | 'casual' | 'sharp' | 'elite';
export const NEON_CIPHER_DIFFICULTIES: readonly NeonCipherDifficulty[] = [
  'gentle',
  'casual',
  'sharp',
  'elite',
];

/** Phase A UI only offers these two — kept as an explicit allowlist so the
 *  screen layer can't accidentally expose Sharp/Elite before Phase B. */
export const PHASE_A_DIFFICULTIES: readonly NeonCipherDifficulty[] = ['gentle', 'casual'];

export type NeonCipherMode = 'calm-hunt' | 'time-attack';

export interface NeonCipherDifficultyPreset {
  gridSize: number;
  distractorSimilarity: DistractorSimilarity;
  previewMs: number;
  sequenceLength: number;
  searchBudgetMs: number;
  /** Rounds between boss rounds. 0 = never — always 0 in Phase A. */
  bossRoundFrequency: number;
}

export const NEON_CIPHER_DIFFICULTY_PRESETS: Record<NeonCipherDifficulty, NeonCipherDifficultyPreset> = {
  gentle: { gridSize: 3, distractorSimilarity: 'obvious', previewMs: 2000, sequenceLength: 1, searchBudgetMs: 6000, bossRoundFrequency: 0 },
  casual: { gridSize: 4, distractorSimilarity: 'moderate', previewMs: 1500, sequenceLength: 1, searchBudgetMs: 4500, bossRoundFrequency: 0 },
  sharp: { gridSize: 5, distractorSimilarity: 'close', previewMs: 1100, sequenceLength: 2, searchBudgetMs: 3500, bossRoundFrequency: 5 },
  elite: { gridSize: 5, distractorSimilarity: 'close', previewMs: 900, sequenceLength: 3, searchBudgetMs: 2800, bossRoundFrequency: 3 },
};

export const DIFFICULTY_BASE_POINTS: Record<NeonCipherDifficulty, number> = {
  gentle: 60,
  casual: 90,
  sharp: 130,
  elite: 170,
};

export interface RoundConfig {
  roundIndex: number;
  difficulty: NeonCipherDifficulty;
  /** Shown during the preview beat, in the order the player must find them. */
  sequence: SymbolSpec[];
  grid: SymbolSpec[];
  /** `targetIndexes[i]` is the grid index of `sequence[i]`. */
  targetIndexes: number[];
}

/**
 * Builds one round: a preview sequence and a grid containing every sequence
 * member plus distractors, no duplicates. Phase A (`sequenceLength === 1`)
 * delegates to `generateGrid`'s single-target contract directly; the
 * multi-target path exists for Phase B and is exercised by tests now so it
 * doesn't need revalidating later.
 */
export function generateRound(
  rng: SeededRandom,
  difficulty: NeonCipherDifficulty,
  roundIndex: number,
): RoundConfig {
  const preset = NEON_CIPHER_DIFFICULTY_PRESETS[difficulty];
  const cellCount = preset.gridSize * preset.gridSize;
  if (preset.sequenceLength > cellCount) {
    throw new Error(`generateRound: sequence length ${preset.sequenceLength} exceeds grid capacity ${cellCount}`);
  }

  const sequence: SymbolSpec[] = Array.from({ length: preset.sequenceLength }, () => generateSymbol(rng));

  if (sequence.length === 1) {
    const { cells, targetIndex } = generateGrid(rng, preset.gridSize, sequence[0], preset.distractorSimilarity);
    return { roundIndex, difficulty, sequence, grid: cells, targetIndexes: [targetIndex] };
  }

  const indexes = shuffle(rng, Array.from({ length: cellCount }, (_, i) => i)).slice(0, sequence.length);
  const cells: (SymbolSpec | undefined)[] = new Array(cellCount).fill(undefined);
  const usedIds = new Set<string>();
  sequence.forEach((sym, i) => {
    cells[indexes[i]] = sym;
    usedIds.add(symbolId(sym));
  });

  for (let i = 0; i < cellCount; i++) {
    if (cells[i]) continue;
    const anchor = pickRandom(rng, sequence);
    let distractor = generateDistractor(rng, anchor, preset.distractorSimilarity);
    let guard = 0;
    while (usedIds.has(symbolId(distractor)) && guard < 20) {
      distractor = generateDistractor(rng, anchor, preset.distractorSimilarity);
      guard++;
    }
    usedIds.add(symbolId(distractor));
    cells[i] = distractor;
  }

  return { roundIndex, difficulty, sequence, grid: cells as SymbolSpec[], targetIndexes: indexes };
}

export type TapClassification = 'correct' | 'wrong';

/**
 * `sequenceProgress` is how many sequence members have already been found
 * this round (0-indexed pointer to the next expected target).
 */
export function classifyTap(
  round: RoundConfig,
  cellIndex: number,
  sequenceProgress: number,
): TapClassification {
  const expectedIndex = round.targetIndexes[sequenceProgress];
  return cellIndex === expectedIndex ? 'correct' : 'wrong';
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** 0-30 bonus points for tapping well inside the search-time budget. */
export function speedBonus(searchMs: number, budgetMs: number): number {
  if (budgetMs <= 0) return 0;
  return Math.round(clamp01(1 - searchMs / budgetMs) * 30);
}

/** +0.1x per consecutive correct tap, capped at 2.0x. */
export function comboMultiplier(combo: number): number {
  return Math.min(1 + 0.1 * combo, 2.0);
}

export function pointsForCorrectTap(
  difficulty: NeonCipherDifficulty,
  searchMs: number,
  budgetMs: number,
  comboBeforeThisTap: number,
): number {
  const base = DIFFICULTY_BASE_POINTS[difficulty];
  return Math.round((base + speedBonus(searchMs, budgetMs)) * comboMultiplier(comboBeforeThisTap));
}

/** Half of the difficulty's base points — a real but not crushing setback. */
export function wrongTapPenalty(difficulty: NeonCipherDifficulty): number {
  return Math.round(0.5 * DIFFICULTY_BASE_POINTS[difficulty]);
}

export interface NeonCipherSessionMetrics {
  correctTaps: number;
  wrongTaps: number;
  /** Always 0 for Calm Hunt — that mode never scores. */
  score: number;
  combo: number;
  bestCombo: number;
  /** Correct-tap search times only, in ms. */
  searchTimesMs: number[];
  roundsCompleted: number;
}

export const EMPTY_NEON_CIPHER_METRICS: NeonCipherSessionMetrics = {
  correctTaps: 0,
  wrongTaps: 0,
  score: 0,
  combo: 0,
  bestCombo: 0,
  searchTimesMs: [],
  roundsCompleted: 0,
};

export function applyCorrectTap(
  metrics: NeonCipherSessionMetrics,
  mode: NeonCipherMode,
  difficulty: NeonCipherDifficulty,
  searchMs: number,
  budgetMs: number,
): NeonCipherSessionMetrics {
  const combo = metrics.combo + 1;
  const points = mode === 'time-attack' ? pointsForCorrectTap(difficulty, searchMs, budgetMs, metrics.combo) : 0;
  return {
    ...metrics,
    correctTaps: metrics.correctTaps + 1,
    combo,
    bestCombo: Math.max(metrics.bestCombo, combo),
    score: metrics.score + points,
    searchTimesMs: [...metrics.searchTimesMs, searchMs],
  };
}

export function applyWrongTap(
  metrics: NeonCipherSessionMetrics,
  mode: NeonCipherMode,
  difficulty: NeonCipherDifficulty,
): NeonCipherSessionMetrics {
  const penalty = mode === 'time-attack' ? wrongTapPenalty(difficulty) : 0;
  return {
    ...metrics,
    wrongTaps: metrics.wrongTaps + 1,
    combo: 0,
    score: Math.max(0, metrics.score - penalty),
  };
}

export function completeRound(metrics: NeonCipherSessionMetrics): NeonCipherSessionMetrics {
  return { ...metrics, roundsCompleted: metrics.roundsCompleted + 1 };
}

export function computeAccuracy(metrics: NeonCipherSessionMetrics): number {
  const total = metrics.correctTaps + metrics.wrongTaps;
  return total === 0 ? 0 : metrics.correctTaps / total;
}

export function computeAvgSearchMs(metrics: NeonCipherSessionMetrics): number {
  if (metrics.searchTimesMs.length === 0) return 0;
  return metrics.searchTimesMs.reduce((a, b) => a + b, 0) / metrics.searchTimesMs.length;
}

/** Higher score wins — same "is this better" contract as gameRecords.ts. */
export function isNewPersonalBest(score: number, previousBest: number | null): boolean {
  return previousBest === null || score > previousBest;
}
