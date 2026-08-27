import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@mindpulse/engine/saved-session-ids';
const RING_SIZE = 60;

/**
 * Duplicate-save protection that survives a process restart.
 *
 * The existing `createDuplicateSaveGuard` in `utils/sessionResultId.ts` is
 * in-memory only, which covers the common case (a double-fired completion
 * callback, a retried write within one app session) but not the one that
 * actually corrupts a personal best: the app is killed *after* the score
 * writes but *before* the UI settles, the user reopens and the results
 * screen re-fires its save. In-memory state is gone, so the session records
 * twice.
 *
 * So recently-saved ids are kept in AsyncStorage as a bounded ring. Sixty
 * entries is far more than a single device will produce between restarts,
 * and the whole list is a few kilobytes.
 *
 * `claim` marks the id in memory **synchronously before awaiting the write**.
 * Two saves firing in the same tick both hit the in-memory set, so the second
 * loses even though neither has finished persisting.
 */
export interface DuplicateGuard {
  /** True if this id is new (and now claimed); false if already saved. */
  claim(sessionResultId: string): Promise<boolean>;
  /** Drops a claim after a failed write, so a retry is allowed. */
  release(sessionResultId: string): Promise<void>;
}

export function createPersistentDuplicateGuard(): DuplicateGuard {
  const seen = new Set<string>();
  let loaded: Promise<void> | null = null;

  const ensureLoaded = (): Promise<void> => {
    // Single-flight: concurrent claims share one read.
    if (!loaded) {
      loaded = AsyncStorage.getItem(KEY)
        .then(raw => {
          if (!raw) return;
          const ids = JSON.parse(raw) as unknown;
          if (Array.isArray(ids)) {
            for (const id of ids) if (typeof id === 'string') seen.add(id);
          }
        })
        // A corrupt or unreadable cache must not block saving — degrade to
        // in-memory-only protection rather than refusing to record a session.
        .catch(() => {});
    }
    return loaded;
  };

  const persist = async (): Promise<void> => {
    const ids = Array.from(seen).slice(-RING_SIZE);
    // Trim the in-memory set alongside the stored one so they can't drift.
    if (ids.length < seen.size) {
      seen.clear();
      for (const id of ids) seen.add(id);
    }
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      // Storage full or unavailable — the in-memory guard still holds for
      // this process, which is the case that matters most.
    }
  };

  return {
    async claim(sessionResultId) {
      await ensureLoaded();
      if (seen.has(sessionResultId)) return false;
      seen.add(sessionResultId);
      await persist();
      return true;
    },

    async release(sessionResultId) {
      seen.delete(sessionResultId);
      await persist();
    },
  };
}
