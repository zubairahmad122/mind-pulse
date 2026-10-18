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
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));
jest.mock('@/services/analytics', () => ({
  trackActivityCompleted: jest.fn(),
  trackChallengeCompleted: jest.fn(),
}));

const mockAuth: { user: { uid: string } | null } = { user: { uid: 'userA' } };
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockAuth }));

import { useActivitySync, useDailyActivityProgress, useWeeklyActivity } from '../useActivity';
import { useStreakSync } from '../useStreakSync';
import { useTodayProgress } from '../useTodayProgress';
import { useDailyChallengeStatus } from '@/components/home/DailyChallenge';
import { recordActivity, useActivityStore } from '@/stores/useActivityStore';
import { useWellnessStore } from '@/stores/useWellnessStore';
import type { ActivityInput } from '@/types/activity.types';

function at(iso: string) {
  jest.setSystemTime(new Date(iso));
}

function input(id: string, type: ActivityInput['type'], extra: Partial<ActivityInput> = {}): ActivityInput {
  return { id, type, source: 'pattern-shift', durationSeconds: 60, ...extra };
}

function useHarness() {
  useActivitySync();
  useStreakSync();
  return {
    today: useDailyActivityProgress(),
    week: useWeeklyActivity(),
    journey: useTodayProgress(),
    streak: useWellnessStore(s => s.streak),
  };
}

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick', 'queueMicrotask'] });
  await AsyncStorage.clear();
  mockAuth.user = { uid: 'userA' };
  useActivityStore.setState({ ownerKey: null, hydrated: false, events: [] });
  useWellnessStore.setState({
    streak: 0, longestStreak: 0, lastActiveDate: null, streakFreezeAvailable: true,
    freezeWeekStart: null, activityLog: [], lastStreakEvent: null, assignedChallenge: null,
  });
});

afterEach(() => jest.useRealTimers());

test('Mind-only, Sleep-only and Relax-only days each extend the streak; extra same-day activity never double-counts', async () => {
  at('2026-10-05T06:00:00Z'); // Mon 11:00 PKT
  const { result, rerender } = renderHook(() => useHarness());
  await waitFor(() => expect(result.current.today.ready).toBe(true));
  expect(result.current.streak).toBe(0);

  // Day 1 — Mind only
  await act(() => recordActivity('userA', input('m1', 'MIND_GAME_COMPLETED')));
  await waitFor(() => expect(result.current.streak).toBe(1));
  await act(() => recordActivity('userA', input('m2', 'MIND_GAME_COMPLETED')));
  expect(result.current.today.count).toBe(2);
  expect(result.current.streak).toBe(1);

  // Day 2 — Sleep only (saved in the morning)
  at('2026-10-06T02:00:00Z');
  rerender({});
  await act(() => recordActivity('userA', input('s1', 'SLEEP_SESSION_COMPLETED', { source: 'sleep-tracker' })));
  await waitFor(() => expect(result.current.streak).toBe(2));

  // Day 3 — Relax only, twice
  at('2026-10-07T13:00:00Z');
  rerender({});
  await act(() => recordActivity('userA', input('r1', 'RELAX_SESSION_COMPLETED', { source: 'relax-player' })));
  await act(() => recordActivity('userA', input('r2', 'RELAX_SESSION_COMPLETED', { source: 'body-scan' })));
  await waitFor(() => expect(result.current.streak).toBe(3));
  expect(useWellnessStore.getState().activityLog).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
  expect(result.current.week.activeDayCount).toBe(3);
  expect(result.current.week.activities).toHaveLength(5);
});

test('opening the app with nothing completed does not credit the streak or the journey', async () => {
  at('2026-10-05T06:00:00Z');
  const { result } = renderHook(() => useHarness());
  await waitFor(() => expect(result.current.today.ready).toBe(true));
  expect(result.current.streak).toBe(0);
  expect(result.current.today.isActive).toBe(false);
  expect(result.current.journey).toMatchObject({ eyeDone: false, mindDone: false, sleepDone: false, everCompletedAny: false });
});

test("Today's Journey can now reach Mind and Sleep steps from real completions", async () => {
  at('2026-10-05T06:00:00Z');
  const { result } = renderHook(() => useHarness());
  await waitFor(() => expect(result.current.today.ready).toBe(true));
  await act(() => recordActivity('userA', input('f', 'FOCUS_SESSION_COMPLETED', { source: 'focus-block' })));
  await act(() => recordActivity('userA', input('s', 'SLEEP_SESSION_COMPLETED', { source: 'sleep-tracker' })));
  await act(() => recordActivity('userA', input('e', 'EYE_BREAK_COMPLETED', { source: 'eye-break' })));
  expect(result.current.journey).toMatchObject({ eyeDone: true, mindDone: true, sleepDone: true, everCompletedAny: true });
});

test('daily challenges complete only from the activity they ask for', async () => {
  at('2026-10-05T06:00:00Z');
  useWellnessStore.setState({ assignedChallenge: { date: '2026-10-05', feature: 'mind' } });
  const { result } = renderHook(() => {
    useActivitySync();
    return useDailyChallengeStatus('Mind');
  });
  await waitFor(() => expect(useActivityStore.getState().hydrated).toBe(true));
  await act(() => recordActivity('userA', input('calm', 'RELAX_SESSION_COMPLETED', { metadata: { sessionId: 'calm-flow' } })));
  expect(result.current.done).toBe(false); // Box Breathing challenge, not any relax session
  await act(() => recordActivity('userA', input('box', 'RELAX_SESSION_COMPLETED', { metadata: { sessionId: 'box-breathing' } })));
  expect(result.current.done).toBe(true);
});

test("switching accounts never shows the previous account's activity", async () => {
  at('2026-10-05T06:00:00Z');
  const { result, rerender } = renderHook(() => useHarness());
  await waitFor(() => expect(result.current.today.ready).toBe(true));
  await act(() => recordActivity('userA', input('a1', 'MIND_GAME_COMPLETED')));
  expect(result.current.today.count).toBe(1);

  mockAuth.user = { uid: 'userB' };
  rerender({});
  // Immediately — even before userB's log finishes loading — nothing of userA's shows.
  expect(result.current.today.count).toBe(0);
  await waitFor(() => expect(result.current.today.ready).toBe(true));
  expect(result.current.today.count).toBe(0);

  mockAuth.user = { uid: 'userA' };
  rerender({});
  await waitFor(() => expect(result.current.today.count).toBe(1));
});
