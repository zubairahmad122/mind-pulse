import type {
  TimeFlowProgress,
  TimeFlowRoundResult,
  TimeFlowSessionRecord,
} from "./types";
import { mechanicsForLevel } from "./engine";
export const TIME_FLOW_SCHEMA_VERSION = 3;
export const TIME_FLOW_ROUNDS = 12;
export function xpForLevel(level: number) {
  return 300 + Math.max(0, level - 1) * 125;
}
export function freshTimeFlowProgress(): TimeFlowProgress {
  return {
    version: TIME_FLOW_SCHEMA_VERSION,
    level: 1,
    xp: 0,
    lifetimeXp: 0,
    totalSessions: 0,
    completedSessions: 0,
    bestScore: 0,
    bestStreak: 0,
    highestTier: 1,
    highestSequenceLength: 3,
    highestGridSize: 3,
    preferredGrid: { rows: 3, columns: 3 },
    stableSequenceLength: 3,
    accuracyWindow: [],
    currentAdaptiveTier: 1,
    unlockedMechanics: ["sequence"],
    seenModeIntros: ["sequence"],
    recentPerformance: [],
    sessionHistory: [],
  };
}
export function applyXp(level: number, xp: number, earned: number) {
  let nextLevel = level,
    nextXp = xp + earned;
  while (nextXp >= xpForLevel(nextLevel)) {
    nextXp -= xpForLevel(nextLevel);
    nextLevel++;
  }
  return { level: nextLevel, xp: nextXp };
}
export function validSession(results: TimeFlowRoundResult[]) {
  return results.length >= 8;
}
export function buildSessionRecord(input: {
  id: string;
  startedAt: string;
  completedAt: string;
  results: TimeFlowRoundResult[];
  bestStreak: number;
  levelBefore: number;
  xpBefore: number;
}): TimeFlowSessionRecord {
  const correct = input.results.filter((r) => r.correct),
    score = input.results.reduce((s, r) => s + r.score, 0),
    accuracy = correct.length / Math.max(1, input.results.length),
    averageRecallMs = Math.round(
      input.results.reduce((s, r) => s + r.responseMs, 0) /
        Math.max(1, input.results.length),
    ),
    highestTier = Math.max(1, ...input.results.map((r) => r.tier)),
    highestSequenceLength = Math.max(
      3,
      ...correct.map((r) => r.sequenceLength),
    ),
    highestGridSize = Math.max(3, ...input.results.map((r) => r.gridSize)),
    mechanicsPlayed = [...new Set(input.results.map((r) => r.mechanic))],
    largestGrid = input.results.reduce(
      (largest, result) =>
        result.gridSize > largest.gridSize ? result : largest,
      input.results[0]!,
    ),
    xpEarned = Math.round(
      32 +
        correct.length * 8 +
        highestTier * 3 +
        input.bestStreak * 2 +
        (input.results.at(-1)?.correct ? 12 : 0),
    ),
    advanced = applyXp(input.levelBefore, input.xpBefore, xpEarned);
  return {
    id: input.id,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    score,
    xpEarned,
    accuracy,
    averageRecallMs,
    correctRounds: correct.length,
    totalRounds: input.results.length,
    bestStreak: input.bestStreak,
    highestTier,
    highestSequenceLength,
    highestGridSize,
    highestGridRows: largestGrid?.gridRows ?? 3,
    highestGridColumns: largestGrid?.gridColumns ?? 3,
    mechanicsPlayed,
    levelBefore: input.levelBefore,
    levelAfter: advanced.level,
  };
}
export function applySession(
  progress: TimeFlowProgress,
  record: TimeFlowSessionRecord,
) {
  if (progress.sessionHistory.some((r) => r.id === record.id)) return progress;
  const advanced = applyXp(progress.level, progress.xp, record.xpEarned),
    eligible = record.totalRounds >= 8;
  return {
    ...progress,
    level: advanced.level,
    xp: advanced.xp,
    lifetimeXp: progress.lifetimeXp + record.xpEarned,
    totalSessions: progress.totalSessions + 1,
    completedSessions: progress.completedSessions + 1,
    bestScore: eligible
      ? Math.max(progress.bestScore, record.score)
      : progress.bestScore,
    bestStreak: eligible
      ? Math.max(progress.bestStreak, record.bestStreak)
      : progress.bestStreak,
    bestAccuracy: eligible
      ? Math.max(progress.bestAccuracy ?? 0, record.accuracy)
      : progress.bestAccuracy,
    bestRecallMs:
      eligible && record.correctRounds >= 6
        ? Math.min(
            progress.bestRecallMs ?? Number.MAX_SAFE_INTEGER,
            record.averageRecallMs,
          )
        : progress.bestRecallMs,
    highestTier: Math.max(progress.highestTier, record.highestTier),
    highestSequenceLength: Math.max(
      progress.highestSequenceLength,
      record.highestSequenceLength,
    ),
    highestGridSize: Math.max(
      progress.highestGridSize,
      record.highestGridSize ?? 3,
    ),
    preferredGrid:
      record.accuracy >= 0.7
        ? {
            rows: (record.highestGridRows ?? 3) as 3 | 4,
            columns: (record.highestGridColumns ?? 3) as 3 | 4,
          }
        : progress.preferredGrid,
    stableSequenceLength:
      record.accuracy >= 0.75
        ? Math.max(progress.stableSequenceLength, record.highestSequenceLength)
        : record.accuracy < 0.55
          ? Math.max(3, progress.stableSequenceLength - 1)
          : progress.stableSequenceLength,
    accuracyWindow: [...progress.accuracyWindow, record.accuracy].slice(-5),
    currentAdaptiveTier: record.highestTier,
    unlockedMechanics: mechanicsForLevel(advanced.level),
    seenModeIntros: [
      ...new Set([
        ...progress.seenModeIntros,
        ...(record.mechanicsPlayed ?? []),
      ]),
    ],
    lastPlayedAt: record.completedAt,
    recentPerformance: [
      ...progress.recentPerformance,
      {
        accuracy: record.accuracy,
        averageRecallMs: record.averageRecallMs,
        tier: record.highestTier,
        completedAt: record.completedAt,
      },
    ].slice(-10),
    sessionHistory: [...progress.sessionHistory, record].slice(-40),
  } satisfies TimeFlowProgress;
}
