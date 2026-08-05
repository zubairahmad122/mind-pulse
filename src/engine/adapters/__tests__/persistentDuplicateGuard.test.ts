import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPersistentDuplicateGuard } from '../persistentDuplicateGuard';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => {
        store[k] = v;
        return Promise.resolve();
      }),
      __reset: () => {
        store = {};
      },
      __raw: () => store,
    },
  };
});

const storage = AsyncStorage as unknown as {
  __reset: () => void;
  __raw: () => Record<string, string>;
  getItem: jest.Mock;
  setItem: jest.Mock;
};

beforeEach(() => {
  storage.__reset();
  storage.getItem.mockClear();
  storage.setItem.mockClear();
});

describe('createPersistentDuplicateGuard', () => {
  it('claims a fresh id once', async () => {
    const guard = createPersistentDuplicateGuard();
    await expect(guard.claim('a')).resolves.toBe(true);
    await expect(guard.claim('a')).resolves.toBe(false);
  });

  it('survives a process restart', async () => {
    const first = createPersistentDuplicateGuard();
    await first.claim('session-1');

    // A brand-new guard reads the same AsyncStorage the old one wrote.
    const afterRestart = createPersistentDuplicateGuard();
    await expect(afterRestart.claim('session-1')).resolves.toBe(false);
    await expect(afterRestart.claim('session-2')).resolves.toBe(true);
  });

  it('blocks a concurrent double claim in the same tick', async () => {
    const guard = createPersistentDuplicateGuard();
    const [a, b] = await Promise.all([guard.claim('x'), guard.claim('x')]);
    expect([a, b].sort()).toEqual([false, true]);
  });

  it('reads storage only once across concurrent claims', async () => {
    const guard = createPersistentDuplicateGuard();
    await Promise.all([guard.claim('a'), guard.claim('b'), guard.claim('c')]);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });

  it('release allows a retry', async () => {
    const guard = createPersistentDuplicateGuard();
    await guard.claim('a');
    await guard.release('a');
    await expect(guard.claim('a')).resolves.toBe(true);
  });

  it('bounds the stored ring', async () => {
    const guard = createPersistentDuplicateGuard();
    for (let i = 0; i < 90; i++) await guard.claim(`id-${i}`);
    const raw = storage.__raw()['@mindpulse/engine/saved-session-ids'];
    const ids = JSON.parse(raw) as string[];
    expect(ids.length).toBeLessThanOrEqual(60);
    // The most recent sessions are the ones worth protecting.
    expect(ids).toContain('id-89');
  });

  it('degrades to in-memory protection when storage is corrupt', async () => {
    storage.getItem.mockResolvedValueOnce('not json');
    const guard = createPersistentDuplicateGuard();
    await expect(guard.claim('a')).resolves.toBe(true);
    await expect(guard.claim('a')).resolves.toBe(false);
  });
});
