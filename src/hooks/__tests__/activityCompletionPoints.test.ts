/* eslint-disable import/first, @typescript-eslint/no-require-imports -- TZ is pinned before any Date-dependent import; jest.mock factories use require. */
process.env.TZ = 'Asia/Karachi';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/services/analytics', () => ({ trackActivityCompleted: jest.fn() }));
jest.mock('@/services/focusDndSync', () => ({ syncFocusDnd: jest.fn(() => Promise.resolve()) }));
const mockAuth: { user: { uid: string } | null } = { user: { uid: 'userA' } };
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockAuth }));

import { useFocusBlockSession } from '../useFocusBlockSession';
import { useRelaxSessionCompletion } from '../useRelaxSessionCompletion';
import { recordMindGameActivity } from '@/services/mindGameActivity';
import { loadActivityLog } from '@/services/activityPersistence';

const NOW = new Date('2026-10-08T05:00:00.000Z').getTime(); // 10:00 PKT

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Focus Block completion', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick', 'queueMicrotask'] });
    jest.setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  test('records FOCUS_SESSION_COMPLETED once when the block runs out — never on start or early end', async () => {
    const { result } = renderHook(() => useFocusBlockSession('userA'));
    await waitFor(() => expect(result.current.phase).toBe('setup'));
    await act(async () => {
      await result.current.start(15 * 60, 'Write the chapter');
    });
    expect(await loadActivityLog('userA')).toEqual([]); // starting is not completing

    jest.setSystemTime(NOW + 16 * 60_000);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(result.current.phase).toBe('completed'));

    await waitFor(async () => expect(await loadActivityLog('userA')).toHaveLength(1));
    const [event] = await loadActivityLog('userA');
    expect(event).toMatchObject({
      type: 'FOCUS_SESSION_COMPLETED',
      source: 'focus-block',
      durationSeconds: 900,
      date: '2026-10-08',
      id: expect.stringMatching(/^focus-\d+$/),
    });
    expect(JSON.stringify(event)).not.toContain('Write the chapter'); // goal text never logged
  });

  test('ending a block early records nothing', async () => {
    const { result } = renderHook(() => useFocusBlockSession('userA'));
    await waitFor(() => expect(result.current.phase).toBe('setup'));
    await act(async () => {
      await result.current.start(25 * 60, 'Deep work block');
    });
    await act(async () => {
      await result.current.endEarly();
    });
    expect(await loadActivityLog('userA')).toEqual([]);
  });
});

describe('voice-guided Relax completion (Body Scan / Muscle Release / Grounding)', () => {
  test('records only on reaching the finished state, once per run', async () => {
    const { rerender } = renderHook(
      ({ started, finished }: { started: boolean; finished: boolean }) => useRelaxSessionCompletion('body-scan', 'body-scan', started, finished),
      { initialProps: { started: false, finished: false } },
    );
    rerender({ started: true, finished: false });
    await act(async () => {});
    expect(await loadActivityLog('userA')).toEqual([]); // started ≠ completed

    rerender({ started: true, finished: true });
    await waitFor(async () => expect(await loadActivityLog('userA')).toHaveLength(1));
    rerender({ started: true, finished: true });
    await act(async () => {});
    expect(await loadActivityLog('userA')).toHaveLength(1);

    const [event] = await loadActivityLog('userA');
    expect(event).toMatchObject({ type: 'RELAX_SESSION_COMPLETED', source: 'body-scan', metadata: { sessionId: 'body-scan' } });
  });

  test('backing out before the end records nothing', async () => {
    const { rerender, unmount } = renderHook(
      ({ started, finished }: { started: boolean; finished: boolean }) => useRelaxSessionCompletion('5-4-3-2-1', 'grounding', started, finished),
      { initialProps: { started: true, finished: false } },
    );
    rerender({ started: false, finished: false });
    unmount();
    await act(async () => {});
    expect(await loadActivityLog('userA')).toEqual([]);
  });
});

describe('Mind game completion', () => {
  test('uses the game session id, so the same session can never be counted twice', async () => {
    const startedAt = '2026-10-08T05:00:00.000Z';
    const completedAt = '2026-10-08T05:03:00.000Z';
    await recordMindGameActivity('userA', 'pattern-shift', 'sess-1', startedAt, completedAt, 870, { accuracy: 0.8 });
    await recordMindGameActivity('userA', 'pattern-shift', 'sess-1', startedAt, completedAt, 870, { accuracy: 0.8 });
    const events = await loadActivityLog('userA');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'mind-pattern-shift-sess-1',
      type: 'MIND_GAME_COMPLETED',
      durationSeconds: 180,
      score: 870,
      metadata: { game: 'pattern-shift', accuracy: 0.8 },
    });
  });
});
