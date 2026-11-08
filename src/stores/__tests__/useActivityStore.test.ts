/* eslint-disable import/first, @typescript-eslint/no-require-imports -- TZ is pinned before any Date-dependent import; jest.mock factories use require. */
process.env.TZ = 'Asia/Karachi';

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockSetDoc = jest.fn(() => Promise.resolve());
const mockGetDocs = jest.fn(() => Promise.resolve({ docs: [] as { data: () => unknown }[] }));
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn((_db: unknown, ...path: string[]) => path.join('/')),
  setDoc: (...args: unknown[]) => mockSetDoc(...(args as [])),
  collection: jest.fn((_db: unknown, ...path: string[]) => path.join('/')),
  getDocs: (...args: unknown[]) => mockGetDocs(...(args as [])),
  query: jest.fn((c: unknown) => c),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

const mockTrack = jest.fn((_event: unknown) => undefined);
const mockFirstSession = jest.fn((_type: unknown) => undefined);
jest.mock('@/services/analytics', () => ({
  trackActivityCompleted: (event: unknown) => mockTrack(event),
  trackFirstSessionDone: (type: unknown) => mockFirstSession(type),
}));

import { hydrateActivityLog, recordActivity, useActivityStore } from '../useActivityStore';
import { loadActivityLog, migrateGuestActivityLog } from '@/services/activityPersistence';
import type { ActivityInput } from '@/types/activity.types';

const flush = () => new Promise<void>(r => setImmediate(r));

function input(id: string, overrides: Partial<ActivityInput> = {}): ActivityInput {
  return {
    id,
    type: 'MIND_GAME_COMPLETED',
    source: 'pattern-shift',
    durationSeconds: 120,
    timestamp: new Date('2026-10-08T05:00:00Z').getTime(),
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  useActivityStore.setState({ ownerKey: null, hydrated: false, events: [] });
  jest.clearAllMocks();
});

describe('unified activity store', () => {
  test('records a completion with a derived local date and completed flag', async () => {
    await hydrateActivityLog('userA');
    const event = await recordActivity('userA', input('e1', { timestamp: new Date('2026-10-07T19:30:00Z').getTime() }));
    expect(event).toMatchObject({ id: 'e1', date: '2026-10-08', completed: true, durationSeconds: 120 });
    expect(useActivityStore.getState().events.map(e => e.id)).toEqual(['e1']);
  });

  test('is idempotent by id — the same completion is never stored twice', async () => {
    await hydrateActivityLog('userA');
    await recordActivity('userA', input('dup'));
    const second = await recordActivity('userA', input('dup'));
    expect(second).toBeNull();
    expect(await loadActivityLog('userA')).toHaveLength(1);
    await flush();
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  test('sends one activity_completed analytics event per new completion, without user text', async () => {
    await recordActivity('userA', input('a1', { score: 42 }));
    await flush();
    expect(mockTrack).toHaveBeenCalledWith(expect.objectContaining({ type: 'MIND_GAME_COMPLETED', source: 'pattern-shift', score: 42 }));
  });

  test('sends first_session_done only for the first completion on an account', async () => {
    await recordActivity('userA', input('first'));
    await recordActivity('userA', input('first'));
    await recordActivity('userA', input('second'));
    expect(mockFirstSession).toHaveBeenCalledTimes(1);
    expect(mockFirstSession).toHaveBeenCalledWith('MIND_GAME_COMPLETED');
  });

  test('activity is scoped per account — switching accounts never shows the other log', async () => {
    await hydrateActivityLog('userA');
    await recordActivity('userA', input('a-only'));
    await hydrateActivityLog('userB');
    expect(useActivityStore.getState()).toMatchObject({ ownerKey: 'userB', hydrated: true, events: [] });
    await recordActivity('userB', input('b-only'));
    expect((await loadActivityLog('userA')).map(e => e.id)).toEqual(['a-only']);
    expect((await loadActivityLog('userB')).map(e => e.id)).toEqual(['b-only']);
  });

  test('a write for a different account does not leak into the loaded one', async () => {
    await hydrateActivityLog('userB');
    await recordActivity('userA', input('late-a'));
    expect(useActivityStore.getState().events).toEqual([]);
  });

  test('a completion recorded while the log is still loading is not lost', async () => {
    await recordActivity('userA', input('existing'));
    const hydrating = hydrateActivityLog('userA');
    const recording = recordActivity('userA', input('during-load'));
    await Promise.all([hydrating, recording]);
    expect(useActivityStore.getState().events.map(e => e.id).sort()).toEqual(['during-load', 'existing']);
  });

  test('device-only guest log uses its own key and mirrors nothing to the cloud', async () => {
    await recordActivity(undefined, input('g1'));
    expect(await AsyncStorage.getItem('@mindpulse/activity-log:guest')).toContain('g1');
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  test('signed-in completions are mirrored to users/{uid}/activities/{id}', async () => {
    await recordActivity('userA', input('m1'));
    await flush();
    expect(mockSetDoc).toHaveBeenCalledWith('users/userA/activities/m1', expect.objectContaining({ id: 'm1' }));
  });

  test('guest → account migration moves the guest log into the new account', async () => {
    await recordActivity(undefined, input('guest-1'));
    await recordActivity('newUser', input('acct-1'));
    await migrateGuestActivityLog('newUser');
    expect((await loadActivityLog('newUser')).map(e => e.id).sort()).toEqual(['acct-1', 'guest-1']);
    expect(await AsyncStorage.getItem('@mindpulse/activity-log:guest')).toBeNull();
  });

  test('restores from Firestore only when the local log is empty', async () => {
    const cloudEvent = { ...input('cloud-1'), date: '2026-10-08', completed: true, timestamp: 1 };
    mockGetDocs.mockResolvedValueOnce({ docs: [{ data: () => cloudEvent }] });
    expect((await loadActivityLog('restored')).map(e => e.id)).toEqual(['cloud-1']);
    // Now local is non-empty — no further cloud reads.
    await loadActivityLog('restored');
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });

  test('ignores malformed stored entries', async () => {
    await AsyncStorage.setItem('@mindpulse/activity-log:userA', JSON.stringify([{ id: 'x', type: 'NOT_A_TYPE' }, null]));
    expect(await loadActivityLog('userA')).toEqual([]);
  });
});
