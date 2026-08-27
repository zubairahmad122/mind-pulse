/**
 * Characterization tests for useDailyEyeGoals — written BEFORE the lint fix so
 * the refactor (silencing react-hooks/set-state-in-effect) cannot change any
 * observable output. If any assertion must change, behavior changed.
 */
import { act, renderHook } from '@testing-library/react-native';
import { useDailyEyeGoals } from '../useDailyEyeGoals';
import {
  getBreaksTaken,
  getGamePlayedToday,
} from '@/services/dailyEyeGoalsPersistence';
import { loadEyeSessions } from '@/services/eyeProgressPersistence';
// jest.mock is hoisted above imports by babel-jest, so the order is safe.
jest.mock('@/services/dailyEyeGoalsPersistence', () => ({
  getBreaksTaken: jest.fn(),
  getGamePlayedToday: jest.fn(),
}));
jest.mock('@/services/eyeProgressPersistence', () => ({
  loadEyeSessions: jest.fn(),
}));

const mockedLoad = loadEyeSessions as jest.Mock;
const mockedBreaks = getBreaksTaken as jest.Mock;
const mockedGame = getGamePlayedToday as jest.Mock;

const TODAY = new Date().toLocaleDateString('sv');

describe('useDailyEyeGoals — characterization (pinned pre-lint-fix)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoad.mockResolvedValue([]);
    mockedBreaks.mockResolvedValue(0);
    mockedGame.mockResolvedValue(false);
  });

  it('starts loading true and resolves to zeroed goals with no sessions', async () => {
    const { result } = renderHook(() => useDailyEyeGoals('u1'));
    expect(result.current.loading).toBe(true);

    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.protocolDone).toBe(false);
    expect(result.current.breaksTaken).toBe(0);
    expect(result.current.gamePlayed).toBe(false);
    expect(result.current.completedCount).toBe(0);
    expect(result.current.recoveryPct).toBe(0);
  });

  it('counts legacy "eye-reset" records as the protocol done today', async () => {
    mockedLoad.mockResolvedValue([
      { dateKey: TODAY, type: 'eye-reset', completedAt: 1 },
    ]);

    const { result } = renderHook(() => useDailyEyeGoals('u1'));
    await act(async () => {});

    expect(result.current.protocolDone).toBe(true);
    expect(result.current.completedCount).toBe(1);
    expect(result.current.recoveryPct).toBe(Math.round((1 / 3) * 100));
  });

  it('counts new "cvs-protocol" records as the protocol done today', async () => {
    mockedLoad.mockResolvedValue([
      { dateKey: TODAY, type: 'cvs-protocol', completedAt: 1 },
    ]);

    const { result } = renderHook(() => useDailyEyeGoals('u1'));
    await act(async () => {});

    expect(result.current.protocolDone).toBe(true);
  });

  it('combines protocol + breaks + game into completedCount/recoveryPct', async () => {
    mockedLoad.mockResolvedValue([
      { dateKey: TODAY, type: 'cvs-protocol', completedAt: 1 },
    ]);
    mockedBreaks.mockResolvedValue(4);
    mockedGame.mockResolvedValue(true);

    const { result } = renderHook(() => useDailyEyeGoals('u1'));
    await act(async () => {});

    expect(result.current.protocolDone).toBe(true);
    expect(result.current.breaksTaken).toBe(4);
    expect(result.current.gamePlayed).toBe(true);
    expect(result.current.completedCount).toBe(3);
    expect(result.current.recoveryPct).toBe(100);
  });

  it('ignores sessions from other days', async () => {
    mockedLoad.mockResolvedValue([
      { dateKey: '2026-01-01', type: 'cvs-protocol', completedAt: 1 },
    ]);

    const { result } = renderHook(() => useDailyEyeGoals('u1'));
    await act(async () => {});

    expect(result.current.protocolDone).toBe(false);
    expect(result.current.completedCount).toBe(0);
  });

  it('reload() recomputes from fresh data', async () => {
    const { result } = renderHook(() => useDailyEyeGoals('u1'));
    await act(async () => {});

    mockedLoad.mockResolvedValue([
      { dateKey: TODAY, type: 'cvs-protocol', completedAt: 1 },
    ]);
    act(() => {
      result.current.reload();
    });
    await act(async () => {});

    expect(result.current.protocolDone).toBe(true);
  });
});
