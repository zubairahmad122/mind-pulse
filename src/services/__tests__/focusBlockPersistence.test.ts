import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  completeFocusBlock,
  endFocusBlockEarly,
  isMeaningfulFocusGoal,
  loadFocusBlockState,
  startFocusBlock,
} from '../focusBlockPersistence';

jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory (matches existing persistence tests)
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});

const FOCUS_KEY = '@mindpulse/screen-balance-focus-block:guest';
const JAN_1 = new Date('2026-01-01T10:00:00.000Z').getTime();
const JAN_2 = new Date('2026-01-02T10:00:00.000Z').getTime();

describe('focusBlockPersistence — session and goal', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts a 25-minute focus block from real timestamps', async () => {
    const session = await startFocusBlock(undefined, 25 * 60, '  Finish   the report  ', JAN_1);

    expect(session).toEqual({
      startedAt: JAN_1,
      durationSeconds: 1500,
      expectedEndAt: JAN_1 + 1_500_000,
      pausedAt: null,
      accumulatedPausedMs: 0,
      status: 'active',
      goal: 'Finish the report',
    });

    const restored = await loadFocusBlockState(undefined, JAN_1);
    expect(restored.activeFocusSession?.goal).toBe('Finish the report');
  });

  it('requires meaningful goal text', async () => {
    expect(isMeaningfulFocusGoal('   ')).toBe(false);
    expect(await startFocusBlock(undefined, 25 * 60, '   ', JAN_1)).toBeNull();
    expect((await loadFocusBlockState(undefined, JAN_1)).activeFocusSession).toBeNull();
  });

  it('handles corrupted persisted state safely', async () => {
    await AsyncStorage.setItem(FOCUS_KEY, '{bad json');
    const state = await loadFocusBlockState(undefined, JAN_1);

    expect(state.activeFocusSession).toBeNull();
    expect(state.todayStats.focusBlocksToday).toBe(0);
  });
});

describe('focusBlockPersistence — stats', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('complete 15 min increments blocks and minutes', async () => {
    const session = await startFocusBlock(undefined, 15 * 60, 'Read 10 pages', JAN_1);
    expect(session).not.toBeNull();

    const { stats } = await completeFocusBlock(undefined, session!, JAN_1 + 900_000);

    expect(stats.focusBlocksToday).toBe(1);
    expect(stats.focusMinutesToday).toBe(15);
    expect(stats.longestFocusBlockMinutes).toBe(15);
    expect(stats.lastFocusGoal).toBe('Read 10 pages');
  });

  it('complete 25 min accumulates and updates longest', async () => {
    const first = await startFocusBlock(undefined, 15 * 60, 'Read 10 pages', JAN_1);
    await completeFocusBlock(undefined, first!, JAN_1 + 900_000);

    const second = await startFocusBlock(undefined, 25 * 60, 'Study one chapter', JAN_1 + 1_000_000);
    const { stats } = await completeFocusBlock(undefined, second!, JAN_1 + 2_500_000);

    expect(stats.focusBlocksToday).toBe(2);
    expect(stats.focusMinutesToday).toBe(40);
    expect(stats.longestFocusBlockMinutes).toBe(25);
    expect(stats.lastFocusGoal).toBe('Study one chapter');
  });

  it('shorter later block leaves longest unchanged', async () => {
    const first = await startFocusBlock(undefined, 25 * 60, 'Study one chapter', JAN_1);
    await completeFocusBlock(undefined, first!, JAN_1 + 1_500_000);

    const second = await startFocusBlock(undefined, 15 * 60, 'Reply to important emails', JAN_1 + 2_000_000);
    const { stats } = await completeFocusBlock(undefined, second!, JAN_1 + 2_900_000);

    expect(stats.focusBlocksToday).toBe(2);
    expect(stats.focusMinutesToday).toBe(40);
    expect(stats.longestFocusBlockMinutes).toBe(25);
  });

  it('end early clears active session without completed stats', async () => {
    await startFocusBlock(undefined, 25 * 60, 'Finish the report', JAN_1);
    const stats = await endFocusBlockEarly(undefined, JAN_1 + 300_000);
    const state = await loadFocusBlockState(undefined, JAN_1 + 300_000);

    expect(stats.focusBlocksToday).toBe(0);
    expect(stats.focusMinutesToday).toBe(0);
    expect(state.activeFocusSession).toBeNull();
    expect(state.pendingCompletion).toBeNull();
  });

  it('daily rollover resets today stats and keeps last completed memory', async () => {
    const session = await startFocusBlock(undefined, 25 * 60, 'Study one chapter', JAN_1);
    await completeFocusBlock(undefined, session!, JAN_1 + 1_500_000);

    const nextDay = await loadFocusBlockState(undefined, JAN_2);

    expect(nextDay.todayStats.focusBlocksToday).toBe(0);
    expect(nextDay.todayStats.focusMinutesToday).toBe(0);
    expect(nextDay.todayStats.longestFocusBlockMinutes).toBe(0);
    expect(nextDay.todayStats.lastFocusGoal).toBe('Study one chapter');
    expect(nextDay.todayStats.lastFocusCompletedAt).toBe(JAN_1 + 1_500_000);
  });
});
