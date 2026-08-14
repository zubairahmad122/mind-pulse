import type { ScreenUsageSnapshot } from '@/types/screenUsage.types';

export type TopAppsSectionState =
  /** Query failed / unsupported OS version — never shown as a fake "no usage" zero. */
  | { kind: 'unavailable' }
  /** Permission granted, query succeeded, genuinely no qualifying usage yet today. */
  | { kind: 'empty' }
  | { kind: 'list' };

/**
 * Pure selector for the Screen Balance Details "Most Used Today" section —
 * mirrors `selectScreenBalanceCardState`'s pattern (kept separate since it
 * answers a different, Details-screen-only question).
 */
export function selectTopAppsSectionState(
  snapshot: Pick<ScreenUsageSnapshot, 'screenTimeTodayMs' | 'topAppsToday'> | null,
): TopAppsSectionState {
  if (!snapshot || snapshot.screenTimeTodayMs == null) return { kind: 'unavailable' };
  if (snapshot.topAppsToday.length === 0) return { kind: 'empty' };
  return { kind: 'list' };
}
