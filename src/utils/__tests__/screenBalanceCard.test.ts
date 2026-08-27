import { SCREEN_BALANCE_LONG_SESSION_MINUTES } from '@/constants/screenBalance';
import type { ScreenUsageSnapshot } from '@/types/screenUsage.types';
import { selectScreenBalanceCardState } from '../screenBalanceCard';

function snapshot(overrides: Partial<ScreenUsageSnapshot> = {}): ScreenUsageSnapshot {
  return {
    hasPermission: true,
    screenTimeTodayMs: null,
    currentSessionMs: null,
    lastSessionMs: null,
    currentSessionAvailable: false,
    topAppsToday: [],
    appSwitchesLast60Min: null,
    appSwitchingAvailable: false,
    calculatedAt: Date.now(),
    ...overrides,
  };
}

describe('selectScreenBalanceCardState', () => {
  it('falls back to legacy on an unsupported platform, regardless of snapshot', () => {
    const state = selectScreenBalanceCardState({ supported: false, snapshot: snapshot() });
    expect(state.kind).toBe('legacy');
  });

  it('falls back to legacy while no snapshot has loaded yet', () => {
    const state = selectScreenBalanceCardState({ supported: true, snapshot: null });
    expect(state.kind).toBe('legacy');
  });

  it('shows the enable state when supported but permission is not granted', () => {
    const state = selectScreenBalanceCardState({
      supported: true,
      snapshot: snapshot({ hasPermission: false }),
    });
    expect(state.kind).toBe('enable');
  });

  it('shows real screen time once permission is granted and usage is known', () => {
    const twoHours = 2 * 60 * 60_000 + 18 * 60_000;
    const state = selectScreenBalanceCardState({
      supported: true,
      snapshot: snapshot({ hasPermission: true, screenTimeTodayMs: twoHours }),
    });
    expect(state).toMatchObject({ kind: 'data', screenTimeTodayMs: twoHours, longSession: false });
  });

  it('flags a long session once the current session reaches the threshold', () => {
    const overMs = SCREEN_BALANCE_LONG_SESSION_MINUTES * 60_000 + 8 * 60_000; // 38 min
    const state = selectScreenBalanceCardState({
      supported: true,
      snapshot: snapshot({
        hasPermission: true,
        currentSessionMs: overMs,
        currentSessionAvailable: true,
      }),
    });
    expect(state).toMatchObject({ kind: 'data', sessionKind: 'current', sessionMs: overMs, longSession: true });
  });

  it('does not flag a long session below the threshold', () => {
    const underMs = (SCREEN_BALANCE_LONG_SESSION_MINUTES - 1) * 60_000;
    const state = selectScreenBalanceCardState({
      supported: true,
      snapshot: snapshot({
        hasPermission: true,
        currentSessionMs: underMs,
        currentSessionAvailable: true,
      }),
    });
    expect(state).toMatchObject({ kind: 'data', longSession: false });
  });

  it('falls back to the last completed session when there is no session live right now', () => {
    const state = selectScreenBalanceCardState({
      supported: true,
      snapshot: snapshot({
        hasPermission: true,
        currentSessionAvailable: false,
        currentSessionMs: null,
        lastSessionMs: 24 * 60_000,
      }),
    });
    expect(state).toMatchObject({ kind: 'data', sessionKind: 'last', sessionMs: 24 * 60_000, longSession: false });
  });

  it('still shows daily usage when session data is unavailable on this device', () => {
    const state = selectScreenBalanceCardState({
      supported: true,
      snapshot: snapshot({
        hasPermission: true,
        screenTimeTodayMs: 45 * 60_000,
        currentSessionAvailable: false,
        currentSessionMs: null,
        lastSessionMs: null,
      }),
    });
    expect(state).toMatchObject({
      kind: 'data',
      screenTimeTodayMs: 45 * 60_000,
      sessionKind: null,
      sessionMs: null,
      longSession: false,
    });
  });

  it('never fabricates a screen-time number when usage itself is unavailable', () => {
    const state = selectScreenBalanceCardState({
      supported: true,
      snapshot: snapshot({ hasPermission: true, screenTimeTodayMs: null }),
    });
    expect(state).toMatchObject({ kind: 'data', screenTimeTodayMs: null });
  });
});
