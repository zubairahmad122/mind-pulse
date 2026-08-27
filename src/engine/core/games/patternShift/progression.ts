import type { PatternShiftProgress, PatternShiftRoundType, PatternShiftSessionRecord, RoundResult } from './types';

export const PATTERN_SHIFT_SCHEMA_VERSION = 1;
export const SESSION_ROUNDS = 13;

export function xpForLevel(level: number): number { return 300 + Math.max(0, level - 1) * 125; }

export function unlockedTypes(level: number): PatternShiftRoundType[] {
  const types: PatternShiftRoundType[] = ['exact'];
  if (level >= 2) types.push('recall');
  if (level >= 4) types.push('missing');
  if (level >= 5) types.push('mirror');
  if (level >= 6) types.push('rotation');
  if (level >= 8) types.push('sequence');
  return types;
}

export function freshPatternShiftProgress(): PatternShiftProgress {
  return { version: PATTERN_SHIFT_SCHEMA_VERSION, playerLevel: 1, xp: 0, lifetimeXp: 0,
    totalSessions: 0, completedSessions: 0, totalRounds: 0, correctRounds: 0,
    highestDifficulty: 1, bestScore: 0, bestStreak: 0, unlockedRoundTypes: ['exact'],
    recentPerformance: [], sessionHistory: [] };
}

export function applyXp(level: number, xp: number, earned: number): { level: number; xp: number } {
  let nextLevel = level;
  let nextXp = xp + earned;
  while (nextXp >= xpForLevel(nextLevel)) { nextXp -= xpForLevel(nextLevel); nextLevel += 1; }
  return { level: nextLevel, xp: nextXp };
}

export function chooseRoundType(index: number, level: number, seed: number): PatternShiftRoundType {
  if (index < 2) return 'exact';
  if (index === SESSION_ROUNDS - 1 && level >= 8) return 'sequence';
  const available = unlockedTypes(level).filter(type => type !== 'sequence');
  if (index >= 10 && level >= 7) return available[1 + ((seed + index) % Math.max(1, available.length - 1))] ?? 'recall';
  return available[(seed + index) % available.length];
}

export function isValidSession(results: RoundResult[]): boolean { return results.length >= 8; }

export function buildSessionRecord(input: {
  id: string; startedAt: string; completedAt: string; results: RoundResult[]; bestStreak: number;
  levelBefore: number; xpBefore: number;
}): PatternShiftSessionRecord {
  const correct = input.results.filter(result => result.correct);
  const score = input.results.reduce((sum, result) => sum + result.score, 0);
  const accuracy = input.results.length ? correct.length / input.results.length : 0;
  const averageResponseMs = Math.round(input.results.reduce((sum, result) => sum + result.responseMs, 0) / Math.max(1, input.results.length));
  const highestDifficulty = Math.max(1, ...input.results.map(result => result.difficulty));
  const xpEarned = Math.round(35 + correct.length * 8 + highestDifficulty * 3 + input.bestStreak * 2 + (input.results.at(-1)?.correct ? 12 : 0));
  const advanced = applyXp(input.levelBefore, input.xpBefore, xpEarned);
  const breakdown: PatternShiftSessionRecord['roundTypeBreakdown'] = {};
  for (const result of input.results) {
    breakdown[result.roundType] ??= { attempted: 0, correct: 0 };
    breakdown[result.roundType].attempted += 1;
    if (result.correct) breakdown[result.roundType].correct += 1;
  }
  return { id: input.id, startedAt: input.startedAt, completedAt: input.completedAt, score, xpEarned,
    accuracy, averageResponseMs, correctRounds: correct.length, totalRounds: input.results.length,
    bestStreak: input.bestStreak, highestDifficulty, playerLevelBefore: input.levelBefore,
    playerLevelAfter: advanced.level, roundTypeBreakdown: breakdown };
}

export function applySession(progress: PatternShiftProgress, record: PatternShiftSessionRecord): PatternShiftProgress {
  if (progress.sessionHistory.some(item => item.id === record.id)) return progress;
  const advanced = applyXp(progress.playerLevel, progress.xp, record.xpEarned);
  const eligible = record.totalRounds >= 8;
  return { ...progress, playerLevel: advanced.level, xp: advanced.xp,
    lifetimeXp: progress.lifetimeXp + record.xpEarned, totalSessions: progress.totalSessions + 1,
    completedSessions: progress.completedSessions + 1, totalRounds: progress.totalRounds + record.totalRounds,
    correctRounds: progress.correctRounds + record.correctRounds,
    highestDifficulty: Math.max(progress.highestDifficulty, record.highestDifficulty),
    bestScore: eligible ? Math.max(progress.bestScore, record.score) : progress.bestScore,
    bestStreak: eligible ? Math.max(progress.bestStreak, record.bestStreak) : progress.bestStreak,
    bestAccuracy: eligible ? Math.max(progress.bestAccuracy ?? 0, record.accuracy) : progress.bestAccuracy,
    bestAverageResponseMs: eligible && record.correctRounds >= 6
      ? Math.min(progress.bestAverageResponseMs ?? Number.MAX_SAFE_INTEGER, record.averageResponseMs) : progress.bestAverageResponseMs,
    unlockedRoundTypes: unlockedTypes(advanced.level), lastPlayedAt: record.completedAt,
    recentPerformance: [...progress.recentPerformance, { accuracy: record.accuracy, averageResponseMs: record.averageResponseMs,
      difficulty: record.highestDifficulty, completedAt: record.completedAt }].slice(-10),
    sessionHistory: [...progress.sessionHistory, record].slice(-40) };
}
