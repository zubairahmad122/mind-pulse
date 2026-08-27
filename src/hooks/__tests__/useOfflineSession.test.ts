import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useOfflineSession } from '../useOfflineSession';

jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory (matches desktopCompanion test)
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});

const SESSION_KEY = '@mindpulse/screen-balance-offline-session:guest';
const STATS_KEY = '@mindpulse/screen-balance-stats:guest';

describe('useOfflineSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.useRealTimers();
    await AsyncStorage.clear();
  });

  it('starts a fresh session and counts down from the full duration', async () => {
    const { result } = renderHook(() => useOfflineSession(undefined, 300));

    await waitFor(() => expect(result.current.phase).toBe('active'));
    expect(result.current.remainingSeconds).toBe(300);

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingSeconds).toBe(290);
  });

  it('resumes a persisted active session reflecting real elapsed time (survives backgrounding)', async () => {
    const now = Date.now();
    const startedAt = now - 120_000; // started 2 minutes ago
    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        startedAt,
        durationSeconds: 300,
        expectedEndAt: startedAt + 300_000,
        status: 'active',
      }),
    );

    // No initialDurationSeconds — the hook must resume from the persisted
    // session rather than starting a new one, exactly like re-mounting after
    // the app returns from the background.
    const { result } = renderHook(() => useOfflineSession(undefined));

    await waitFor(() => expect(result.current.phase).toBe('active'));
    // 300 - 120 elapsed = 180 remaining, computed from real elapsed time —
    // not from a decrement-only counter that would have kept ticking at 300.
    expect(result.current.remainingSeconds).toBe(180);
    expect(result.current.durationSeconds).toBe(300);
  });

  it('completes and records stats when the persisted session already expired', async () => {
    const now = Date.now();
    const startedAt = now - 400_000;
    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        startedAt,
        durationSeconds: 300,
        expectedEndAt: startedAt + 300_000, // ended 100s ago
        status: 'active',
      }),
    );

    const { result } = renderHook(() => useOfflineSession(undefined));

    await waitFor(() => expect(result.current.phase).toBe('completed'));

    const rawStats = await AsyncStorage.getItem(STATS_KEY);
    expect(rawStats).not.toBeNull();
    const stats = JSON.parse(rawStats!);
    expect(stats.resetsCompletedToday).toBe(1);
    expect(stats.offlineMinutesToday).toBe(5);
    expect(stats.lastResetType).toBe('offline');

    const rawSession = await AsyncStorage.getItem(SESSION_KEY);
    expect(rawSession).toBeNull();
  });

  it('cancel clears the persisted session and returns to idle', async () => {
    const { result } = renderHook(() => useOfflineSession(undefined, 300));
    await waitFor(() => expect(result.current.phase).toBe('active'));

    await act(async () => {
      await result.current.cancel();
    });

    expect(result.current.phase).toBe('idle');
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
