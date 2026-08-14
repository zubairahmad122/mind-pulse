import { SCREEN_BALANCE_LONG_SESSION_MINUTES } from '@/constants/screenBalance';
import type { ScreenUsageSnapshot } from '@/types/screenUsage.types';

export type ScreenBalanceCardState =
  /**
   * Unsupported platform (non-Android, or the native module isn't linked),
   * or a snapshot hasn't loaded yet — renders the original reset-only card
   * copy so reset access is never blocked on device usage data.
   */
  | { kind: 'legacy' }
  /** Android, native module present, Usage Access not yet granted. */
  | { kind: 'enable' }
  | {
      kind: 'data';
      screenTimeTodayMs: number | null;
      sessionMs: number | null;
      sessionKind: 'current' | 'last' | null;
      /** Session is live and at/above SCREEN_BALANCE_LONG_SESSION_MINUTES. */
      longSession: boolean;
    };

/**
 * Pure selector from (platform support, permission, usage snapshot) to the
 * Home Screen Balance card's render state. Kept free of React/native calls
 * so it's directly unit-testable.
 */
export function selectScreenBalanceCardState(params: {
  supported: boolean;
  snapshot: ScreenUsageSnapshot | null;
}): ScreenBalanceCardState {
  const { supported, snapshot } = params;
  if (!supported || !snapshot) return { kind: 'legacy' };
  if (!snapshot.hasPermission) return { kind: 'enable' };

  const sessionKind: 'current' | 'last' | null =
    snapshot.currentSessionAvailable && snapshot.currentSessionMs != null
      ? 'current'
      : snapshot.lastSessionMs != null
        ? 'last'
        : null;

  const sessionMs =
    sessionKind === 'current' ? snapshot.currentSessionMs
    : sessionKind === 'last' ? snapshot.lastSessionMs
    : null;

  const longSession =
    sessionKind === 'current' &&
    sessionMs != null &&
    sessionMs >= SCREEN_BALANCE_LONG_SESSION_MINUTES * 60_000;

  return {
    kind: 'data',
    screenTimeTodayMs: snapshot.screenTimeTodayMs,
    sessionMs,
    sessionKind,
    longSession,
  };
}
