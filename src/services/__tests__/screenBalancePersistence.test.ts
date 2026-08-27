import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadScreenBalanceStats,
  recordResetCompleted,
  startOfflineSession,
  loadOfflineSession,
  clearOfflineSession,
} from '../screenBalancePersistence';

jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory (matches desktopCompanion test)
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});

const STATS_KEY = '@mindpulse/screen-balance-stats:guest';

describe('screenBalancePersistence — stats', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts at zero with no fabricated data', async () => {
    const stats = await loadScreenBalanceStats(undefined);
    expect(stats).toEqual({
      resetsCompletedToday: 0,
      offlineMinutesToday: 0,
      lastResetType: null,
      lastResetCompletedAt: null,
    });
  });

  it('records a completed reset and accumulates offline minutes', async () => {
    await recordResetCompleted(undefined, 'eye-break');
    const afterEyeBreak = await loadScreenBalanceStats(undefined);
    expect(afterEyeBreak.resetsCompletedToday).toBe(1);
    expect(afterEyeBreak.lastResetType).toBe('eye-break');
    expect(afterEyeBreak.offlineMinutesToday).toBe(0);

    await recordResetCompleted(undefined, 'offline', 5);
    const afterOffline = await loadScreenBalanceStats(undefined);
    expect(afterOffline.resetsCompletedToday).toBe(2);
    expect(afterOffline.offlineMinutesToday).toBe(5);
    expect(afterOffline.lastResetType).toBe('offline');
  });

  it('rolls daily counters over on a new day but keeps the last-reset memory', async () => {
    await AsyncStorage.setItem(
      STATS_KEY,
      JSON.stringify({
        resetsCompletedToday: 3,
        offlineMinutesToday: 15,
        lastResetType: 'move',
        lastResetCompletedAt: 1,
        statsDate: '2000-01-01', // long-past day
      }),
    );

    const stats = await loadScreenBalanceStats(undefined);
    expect(stats.resetsCompletedToday).toBe(0);
    expect(stats.offlineMinutesToday).toBe(0);
    // Last reset stays visible across the day boundary — it's not "today's count".
    expect(stats.lastResetType).toBe('move');
    expect(stats.lastResetCompletedAt).toBe(1);
  });
});

describe('screenBalancePersistence — offline session', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('computes expectedEndAt from the real start time, not a countdown', async () => {
    const before = Date.now();
    const session = await startOfflineSession(undefined, 300);
    const after = Date.now();

    expect(session.status).toBe('active');
    expect(session.durationSeconds).toBe(300);
    expect(session.startedAt).toBeGreaterThanOrEqual(before);
    expect(session.startedAt).toBeLessThanOrEqual(after);
    expect(session.expectedEndAt).toBe(session.startedAt + 300_000);
  });

  it('persists and reloads the session', async () => {
    await startOfflineSession(undefined, 900);
    const loaded = await loadOfflineSession(undefined);
    expect(loaded?.durationSeconds).toBe(900);
    expect(loaded?.status).toBe('active');
  });

  it('clears the session', async () => {
    await startOfflineSession(undefined, 300);
    await clearOfflineSession(undefined);
    expect(await loadOfflineSession(undefined)).toBeNull();
  });
});
