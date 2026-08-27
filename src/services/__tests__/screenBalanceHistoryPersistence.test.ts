import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDailyHistory,
  recordDailyFocusMinutes,
  recordDailyOfflineMinutes,
  recordDailyReset,
  SCREEN_BALANCE_HISTORY_RETENTION_DAYS,
} from '../screenBalanceHistoryPersistence';

jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory (matches sibling tests)
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});

const HISTORY_KEY = '@mindpulse/screen-balance-history:guest';

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const TODAY = localDateKey(new Date());

describe('screenBalanceHistoryPersistence', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns 7 zero-valued days ending on today when nothing is stored', async () => {
    const days = await getDailyHistory(undefined, 7);
    expect(days).toHaveLength(7);
    expect(days[6].date).toBe(TODAY);
    expect(days.every(d => d.focusMinutes === 0 && d.offlineMinutes === 0 && d.resetsCompleted === 0)).toBe(true);
  });

  it('records a reset for today and it shows up in the daily history', async () => {
    await recordDailyReset(undefined);
    const days = await getDailyHistory(undefined, 1);
    expect(days[0].resetsCompleted).toBe(1);
  });

  it('accumulates multiple actions on the same day rather than overwriting', async () => {
    await recordDailyReset(undefined);
    await recordDailyReset(undefined);
    await recordDailyOfflineMinutes(undefined, 5);
    await recordDailyFocusMinutes(undefined, 25);
    const days = await getDailyHistory(undefined, 1);
    expect(days[0]).toMatchObject({ resetsCompleted: 2, offlineMinutes: 5, focusMinutes: 25 });
  });

  it('keeps a different day separate from today', async () => {
    const yesterday = localDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    await recordDailyReset(undefined, yesterday);
    await recordDailyReset(undefined); // today

    const days = await getDailyHistory(undefined, 2);
    expect(days[0].date).toBe(yesterday);
    expect(days[0].resetsCompleted).toBe(1);
    expect(days[1].date).toBe(TODAY);
    expect(days[1].resetsCompleted).toBe(1);
  });

  it('a zero-minute action is a no-op — never records a zero-value day', async () => {
    await recordDailyOfflineMinutes(undefined, 0);
    await recordDailyFocusMinutes(undefined, -5);
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    expect(raw).toBeNull();
  });

  it('prunes entries older than the retention window on the next write', async () => {
    const old = localDateKey(new Date(Date.now() - (SCREEN_BALANCE_HISTORY_RETENTION_DAYS + 5) * 24 * 60 * 60 * 1000));
    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({ version: 1, days: { [old]: { focusMinutes: 10, offlineMinutes: 0, resetsCompleted: 0 } } }),
    );
    // Any write triggers a prune pass.
    await recordDailyReset(undefined);
    const raw = JSON.parse((await AsyncStorage.getItem(HISTORY_KEY)) ?? '{}');
    expect(raw.days[old]).toBeUndefined();
    expect(raw.days[TODAY]).toBeDefined();
  });

  it('recovers safely from corrupt JSON instead of throwing', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, 'not valid json{{{');
    const days = await getDailyHistory(undefined, 1);
    expect(days[0]).toMatchObject({ focusMinutes: 0, offlineMinutes: 0, resetsCompleted: 0 });
  });

  it('drops malformed individual day entries but keeps well-formed ones (schema migration safety)', async () => {
    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({
        version: 1,
        days: {
          [TODAY]: { focusMinutes: 12, offlineMinutes: 0, resetsCompleted: 0 },
          'not-a-date': { focusMinutes: 99, offlineMinutes: 0, resetsCompleted: 0 },
          '2026-08-10': { focusMinutes: 'not-a-number' },
        },
      }),
    );
    const days = await getDailyHistory(undefined, 1);
    expect(days[0].focusMinutes).toBe(12);
  });

  it('recovers a pre-versioning shape (no `version` field) by treating it as a bare day map', async () => {
    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({ [TODAY]: { focusMinutes: 7, offlineMinutes: 0, resetsCompleted: 0 } }),
    );
    const days = await getDailyHistory(undefined, 1);
    expect(days[0].focusMinutes).toBe(7);
  });

  it('keeps separate users on separate keys', async () => {
    await recordDailyReset('user-a');
    const daysA = await getDailyHistory('user-a', 1);
    const daysB = await getDailyHistory('user-b', 1);
    expect(daysA[0].resetsCompleted).toBe(1);
    expect(daysB[0].resetsCompleted).toBe(0);
  });
});
