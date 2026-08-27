import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useFocusBlockSession } from '../useFocusBlockSession';

jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory (matches existing hook tests)
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});

const FOCUS_KEY = '@mindpulse/screen-balance-focus-block:guest';
const NOW = new Date('2026-01-01T10:00:00.000Z').getTime();

function storedActiveSession(overrides: Record<string, unknown> = {}) {
  return {
    startedAt: NOW,
    durationSeconds: 25 * 60,
    expectedEndAt: NOW + 25 * 60_000,
    pausedAt: null,
    accumulatedPausedMs: 0,
    status: 'active',
    goal: 'Finish the report',
    ...overrides,
  };
}

async function writeFocusState(activeFocusSession: Record<string, unknown> | null) {
  await AsyncStorage.setItem(
    FOCUS_KEY,
    JSON.stringify({
      version: 1,
      statsDate: '2026-01-01',
      activeFocusSession,
      todayStats: {
        focusBlocksToday: 0,
        focusMinutesToday: 0,
        longestFocusBlockMinutes: 0,
        lastFocusCompletedAt: null,
        lastFocusGoal: null,
      },
      pendingCompletion: null,
    }),
  );
}

describe('useFocusBlockSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(async () => {
    jest.useRealTimers();
    await AsyncStorage.clear();
  });

  it('starts a 25-minute session correctly and persists the goal', async () => {
    const { result } = renderHook(() => useFocusBlockSession(undefined));
    await waitFor(() => expect(result.current.phase).toBe('setup'));

    await act(async () => {
      await result.current.start(25 * 60, 'Finish the report');
    });

    expect(result.current.phase).toBe('active');
    expect(result.current.remainingSeconds).toBe(1500);
    expect(result.current.session?.goal).toBe('Finish the report');
  });

  it('background 5 min reconciles remaining time from timestamps', async () => {
    const { result } = renderHook(() => useFocusBlockSession(undefined));
    await waitFor(() => expect(result.current.phase).toBe('setup'));

    await act(async () => {
      await result.current.start(25 * 60, 'Finish the report');
    });

    jest.setSystemTime(NOW + 5 * 60_000);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.remainingSeconds).toBe(1200);
  });

  it('session finishes while away and shows completion on return', async () => {
    const { result } = renderHook(() => useFocusBlockSession(undefined));
    await waitFor(() => expect(result.current.phase).toBe('setup'));

    await act(async () => {
      await result.current.start(15 * 60, 'Read 10 pages');
    });

    jest.setSystemTime(NOW + 16 * 60_000);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(result.current.phase).toBe('completed'));
    expect(result.current.completion?.goal).toBe('Read 10 pages');
    expect(result.current.stats?.focusBlocksToday).toBe(1);
    expect(result.current.stats?.focusMinutesToday).toBe(15);
  });

  it('pause excludes paused time from focus elapsed', async () => {
    const { result } = renderHook(() => useFocusBlockSession(undefined));
    await waitFor(() => expect(result.current.phase).toBe('setup'));

    await act(async () => {
      await result.current.start(25 * 60, 'Finish the report');
    });

    jest.setSystemTime(NOW + 2 * 60_000);
    await act(async () => {
      await result.current.pause();
    });
    expect(result.current.phase).toBe('paused');
    const pausedRemaining = result.current.remainingSeconds;
    expect(pausedRemaining).toBeGreaterThanOrEqual(1379);
    expect(pausedRemaining).toBeLessThanOrEqual(1381);

    jest.setSystemTime(NOW + 7 * 60_000);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.remainingSeconds).toBe(pausedRemaining);

    await act(async () => {
      await result.current.resume();
    });
    expect(result.current.phase).toBe('active');
    expect(result.current.remainingSeconds).toBe(pausedRemaining);

    jest.setSystemTime(NOW + 8 * 60_000);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.remainingSeconds).toBeGreaterThanOrEqual(pausedRemaining - 61);
    expect(result.current.remainingSeconds).toBeLessThanOrEqual(pausedRemaining - 59);
  });

  it('restores an active session after reload', async () => {
    await writeFocusState(storedActiveSession({
      startedAt: NOW - 5 * 60_000,
      expectedEndAt: NOW + 20 * 60_000,
    }));

    const { result } = renderHook(() => useFocusBlockSession(undefined));

    await waitFor(() => expect(result.current.phase).toBe('active'));
    expect(result.current.remainingSeconds).toBe(1200);
    expect(result.current.session?.goal).toBe('Finish the report');
  });

  it('restores a paused session after reload without counting paused time', async () => {
    await writeFocusState(storedActiveSession({
      expectedEndAt: NOW + 20 * 60_000,
      pausedAt: NOW - 5 * 60_000,
      accumulatedPausedMs: 0,
      status: 'paused',
    }));

    const { result } = renderHook(() => useFocusBlockSession(undefined));

    await waitFor(() => expect(result.current.phase).toBe('paused'));
    expect(result.current.remainingSeconds).toBe(1500);

    jest.setSystemTime(NOW + 10 * 60_000);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.remainingSeconds).toBe(1500);
  });

  it('restores an elapsed active session as completed', async () => {
    await writeFocusState(storedActiveSession({
      startedAt: NOW - 30 * 60_000,
      expectedEndAt: NOW - 5 * 60_000,
    }));

    const { result } = renderHook(() => useFocusBlockSession(undefined));

    await waitFor(() => expect(result.current.phase).toBe('completed'));
    expect(result.current.completion?.goal).toBe('Finish the report');
    expect(result.current.stats?.focusBlocksToday).toBe(1);
  });
});
