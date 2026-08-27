import type {
  ScreenHabitRecord,
  ScreenSessionContext,
} from '@/services/eyeScreenHabitPersistence';

export interface ScreenHabitSummary {
  checkIns: number;
  longestMinutes: number | null;
  averageMinutes: number | null;
  mostFrequentContext: ScreenSessionContext | null;
}

export function summarizeScreenHabits(
  records: ScreenHabitRecord[],
  since: number,
): ScreenHabitSummary {
  const recent = records.filter(record => record.recordedAt >= since);
  if (!recent.length) {
    return {
      checkIns: 0,
      longestMinutes: null,
      averageMinutes: null,
      mostFrequentContext: null,
    };
  }
  const contexts = new Map<ScreenSessionContext, number>();
  for (const record of recent) {
    contexts.set(record.context, (contexts.get(record.context) ?? 0) + 1);
  }
  return {
    checkIns: recent.length,
    longestMinutes: Math.max(...recent.map(record => record.continuousMinutes)),
    averageMinutes: Math.round(
      recent.reduce((sum, record) => sum + record.continuousMinutes, 0)
      / recent.length,
    ),
    mostFrequentContext:
      [...contexts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
  };
}
