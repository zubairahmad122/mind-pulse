import { useWellnessStore } from '../useWellnessStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/** Resets the streak-related slice between tests — the store is a module
 * singleton, so tests must not leak state into each other. */
function resetStreakState() {
  useWellnessStore.setState({
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    streakFreezeAvailable: true,
    freezeWeekStart: null,
    activityLog: [],
    lastStreakEvent: null,
    everComeback: false,
    watchingComeback: false,
  });
}

describe('checkAndUpdateStreak — freeze across a month boundary', () => {
  beforeEach(() => {
    resetStreakState();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('spends the weekly freeze when exactly one day is missed spanning July -> August', () => {
    // All four dates below fall in the same week (Mon 2026-07-27 – Sun 2026-08-02).
    jest.useFakeTimers();

    jest.setSystemTime(new Date(2026, 6, 30, 9, 0)); // Thu 2026-07-30
    useWellnessStore.getState().checkAndUpdateStreak(true);
    expect(useWellnessStore.getState().streak).toBe(1);

    jest.setSystemTime(new Date(2026, 6, 31, 9, 0)); // Fri 2026-07-31 (consecutive)
    useWellnessStore.getState().checkAndUpdateStreak(true);
    expect(useWellnessStore.getState().streak).toBe(2);

    // Sat 2026-08-01 is skipped entirely — no session logged that day.

    jest.setSystemTime(new Date(2026, 7, 2, 9, 0)); // Sun 2026-08-02 — gap of 2 days
    useWellnessStore.getState().checkAndUpdateStreak(true);

    const state = useWellnessStore.getState();
    expect(state.streak).toBe(3);
    expect(state.lastStreakEvent).toBe('frozen');
    expect(state.streakFreezeAvailable).toBe(false);
    expect(state.lastActiveDate).toBe('2026-08-02');
  });

  it('resets the streak on a 2-day gap if the freeze was already spent this week', () => {
    jest.useFakeTimers();

    jest.setSystemTime(new Date(2026, 6, 30, 9, 0)); // Thu 2026-07-30
    useWellnessStore.getState().checkAndUpdateStreak(true);
    expect(useWellnessStore.getState().streak).toBe(1);

    // Simulate the freeze having already been spent earlier this same week.
    useWellnessStore.setState({ streakFreezeAvailable: false });

    // Fri 2026-07-31 is skipped.
    jest.setSystemTime(new Date(2026, 7, 1, 9, 0)); // Sat 2026-08-01 — gap of 2 days
    useWellnessStore.getState().checkAndUpdateStreak(true);

    const state = useWellnessStore.getState();
    expect(state.streak).toBe(1);
    expect(state.lastStreakEvent).toBe('reset');
  });
});

describe('assignDailyChallengeIfNeeded', () => {
  beforeEach(() => {
    useWellnessStore.setState({ assignedChallenge: null });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('assigns once per day and ignores later calls with a different feature the same day', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 24, 9, 0));

    useWellnessStore.getState().assignDailyChallengeIfNeeded('sleep');
    expect(useWellnessStore.getState().assignedChallenge).toEqual({ date: '2026-07-24', feature: 'sleep' });

    // Score shifts later the same day — should NOT overwrite today's assignment.
    useWellnessStore.getState().assignDailyChallengeIfNeeded('eye');
    expect(useWellnessStore.getState().assignedChallenge).toEqual({ date: '2026-07-24', feature: 'sleep' });
  });

  it('re-assigns on a new day', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 24, 9, 0));
    useWellnessStore.getState().assignDailyChallengeIfNeeded('sleep');

    jest.setSystemTime(new Date(2026, 6, 25, 9, 0));
    useWellnessStore.getState().assignDailyChallengeIfNeeded('mind');
    expect(useWellnessStore.getState().assignedChallenge).toEqual({ date: '2026-07-25', feature: 'mind' });
  });
});

describe('Comeback badge — arms on a reset, fires once streak reaches 3', () => {
  beforeEach(() => {
    resetStreakState();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not fire on a plain 3-day streak with no prior reset', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 20, 9, 0));
    useWellnessStore.getState().checkAndUpdateStreak(true);
    jest.setSystemTime(new Date(2026, 6, 21, 9, 0));
    useWellnessStore.getState().checkAndUpdateStreak(true);
    jest.setSystemTime(new Date(2026, 6, 22, 9, 0));
    useWellnessStore.getState().checkAndUpdateStreak(true);

    expect(useWellnessStore.getState().streak).toBe(3);
    expect(useWellnessStore.getState().everComeback).toBe(false);
  });

  it('fires once a fresh streak rebuilds to 3 after a reset', () => {
    jest.useFakeTimers();
    // Build streak to 2, then break it (skip several days -> reset).
    jest.setSystemTime(new Date(2026, 6, 20, 9, 0));
    useWellnessStore.getState().checkAndUpdateStreak(true);
    jest.setSystemTime(new Date(2026, 6, 21, 9, 0));
    useWellnessStore.getState().checkAndUpdateStreak(true);
    expect(useWellnessStore.getState().streak).toBe(2);

    jest.setSystemTime(new Date(2026, 6, 25, 9, 0)); // big gap -> reset
    useWellnessStore.getState().checkAndUpdateStreak(true);
    expect(useWellnessStore.getState().streak).toBe(1);
    expect(useWellnessStore.getState().lastStreakEvent).toBe('reset');
    expect(useWellnessStore.getState().watchingComeback).toBe(true);
    expect(useWellnessStore.getState().everComeback).toBe(false);

    jest.setSystemTime(new Date(2026, 6, 26, 9, 0));
    useWellnessStore.getState().checkAndUpdateStreak(true);
    jest.setSystemTime(new Date(2026, 6, 27, 9, 0));
    useWellnessStore.getState().checkAndUpdateStreak(true);

    expect(useWellnessStore.getState().streak).toBe(3);
    expect(useWellnessStore.getState().everComeback).toBe(true);
    expect(useWellnessStore.getState().watchingComeback).toBe(false);
  });
});

describe('recordPerfectDayIfApplicable / recordNightOwlIfApplicable', () => {
  beforeEach(() => {
    useWellnessStore.setState({
      everPerfectDay: false,
      lastPerfectDayDate: null,
      everNightOwlSession: false,
      lastStreakEvent: null,
    });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('records a Perfect Day once per day and fires the toast event', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 24, 20, 0));

    useWellnessStore.getState().recordPerfectDayIfApplicable();
    expect(useWellnessStore.getState().everPerfectDay).toBe(true);
    expect(useWellnessStore.getState().lastStreakEvent).toBe('perfectDay');

    useWellnessStore.getState().acknowledgeStreakEvent();
    useWellnessStore.getState().recordPerfectDayIfApplicable(); // same day — no-op
    expect(useWellnessStore.getState().lastStreakEvent).toBeNull();
  });

  it('records the Night Owl badge permanently once set', () => {
    useWellnessStore.getState().recordNightOwlIfApplicable();
    expect(useWellnessStore.getState().everNightOwlSession).toBe(true);
  });
});
