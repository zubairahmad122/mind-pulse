/**
 * Characterization tests for useEyeScore — written BEFORE the lint fix so the
 * refactor (silencing react-hooks/set-state-in-effect) cannot change any
 * observable output. If any of these assertions must change, the behavior
 * changed and the refactor needs rethinking.
 */
import { act, renderHook } from '@testing-library/react-native';
import { calculateEyeScore } from '@/utils/scoring';
import { useEyeScore } from '../useEyeScore';
import {
  getBreaksTaken,
  getGamePlayedToday,
} from '@/services/dailyEyeGoalsPersistence';
import {
  loadEyeSessions,
  getEyeBreakEnforcerEnabled,
} from '@/services/eyeProgressPersistence';
// jest.mock is hoisted above imports by babel-jest, so the order is safe.
jest.mock('@/services/dailyEyeGoalsPersistence', () => ({
  getBreaksTaken: jest.fn(),
  getGamePlayedToday: jest.fn(),
}));
jest.mock('@/services/eyeProgressPersistence', () => ({
  loadEyeSessions: jest.fn(),
  getEyeBreakEnforcerEnabled: jest.fn(),
}));

const mockedLoad = loadEyeSessions as jest.Mock;
const mockedBreaks = getBreaksTaken as jest.Mock;
const mockedGame = getGamePlayedToday as jest.Mock;
const mockedEnforcer = getEyeBreakEnforcerEnabled as jest.Mock;

const TODAY = new Date().toLocaleDateString('sv');

describe('useEyeScore — characterization (pinned pre-lint-fix)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoad.mockResolvedValue([]);
    mockedBreaks.mockResolvedValue(0);
    mockedGame.mockResolvedValue(false);
    mockedEnforcer.mockResolvedValue(false);
  });

  it('starts loading true and resolves with the computed score + flags', async () => {
    const { result } = renderHook(() => useEyeScore('u1'));
    expect(result.current.loading).toBe(true);

    await act(async () => {});

    expect(result.current.loading).toBe(false);
    const expected = calculateEyeScore({
      breaksTaken: 0,
      recoverySessionsToday: 0,
      gamePlayedToday: false,
      breakEnforcerEnabled: false,
    });
    expect(result.current.score).toBe(expected.score);
    expect(result.current.theme.label).toBe(expected.theme.label);
    expect(result.current.hasAnySessions).toBe(false);
    expect(result.current.completedToday).toEqual([]);
    expect(result.current.gamePlayedToday).toBe(false);
  });

  it('resolves legacy "eye-reset" and new "cvs-protocol" records to one recovery id', async () => {
    mockedLoad.mockResolvedValue([
      { dateKey: TODAY, type: 'eye-reset', completedAt: 1 },
      { dateKey: TODAY, type: 'cvs-protocol', completedAt: 2 },
      { dateKey: '2026-01-01', type: 'cvs-protocol', completedAt: 3 },
    ]);
    mockedBreaks.mockResolvedValue(3);
    mockedGame.mockResolvedValue(true);
    mockedEnforcer.mockResolvedValue(true);

    const { result } = renderHook(() => useEyeScore('u1'));
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    // Characterized: BOTH today records count as recovery sessions (legacy +
    // new), while the displayed activity list dedupes them to one id.
    const expected = calculateEyeScore({
      breaksTaken: 3,
      recoverySessionsToday: 2,
      gamePlayedToday: true,
      breakEnforcerEnabled: true,
    });
    expect(result.current.score).toBe(expected.score);
    expect(result.current.completedToday).toEqual(['cvs-protocol']);
    expect(result.current.hasAnySessions).toBe(true);
    expect(result.current.gamePlayedToday).toBe(true);
  });

  it('falls back to a zero-input score on load failure but still finishes loading', async () => {
    mockedLoad.mockRejectedValue(new Error('firestore down'));

    const { result } = renderHook(() => useEyeScore('u1'));
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    const fallback = calculateEyeScore({
      breaksTaken: 0,
      recoverySessionsToday: 0,
      gamePlayedToday: false,
      breakEnforcerEnabled: false,
    });
    expect(result.current.score).toBe(fallback.score);
  });

  it('refresh() recomputes from fresh data (loading flips true during refresh)', async () => {
    const { result } = renderHook(() => useEyeScore('u1'));
    await act(async () => {});

    mockedBreaks.mockResolvedValue(2);
    let refreshPromise: Promise<void>;
    act(() => {
      refreshPromise = result.current.refresh();
    });
    await act(async () => { await refreshPromise; });

    const expected = calculateEyeScore({
      breaksTaken: 2,
      recoverySessionsToday: 0,
      gamePlayedToday: false,
      breakEnforcerEnabled: false,
    });
    expect(result.current.score).toBe(expected.score);
    expect(result.current.loading).toBe(false);
  });
});
