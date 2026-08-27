import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, getFirestore, setDoc } from '@react-native-firebase/firestore';
import { createPersistentDuplicateGuard } from '@/engine/adapters/persistentDuplicateGuard';
import { withTimeout } from '@/utils/withTimeout';
import {
  applySession,
  freshPatternShiftProgress,
  PATTERN_SHIFT_SCHEMA_VERSION,
  type PatternShiftProgress,
  type PatternShiftSessionRecord,
} from '@/engine/core/games/patternShift';

const db = getFirestore();
const guard = createPersistentDuplicateGuard();
const memoryCache = new Map<string, PatternShiftProgress>();

function key(uid?: string) { return `@mindpulse/pattern-shift:${uid ?? 'guest'}`; }
function cacheKey(uid?: string) { return uid ?? 'guest'; }
function cloudRef(uid: string) { return doc(db, 'users', uid, 'gameProgress', 'pattern-shift'); }

export function migratePatternShiftProgress(value: unknown): PatternShiftProgress {
  const fresh = freshPatternShiftProgress();
  if (!value || typeof value !== 'object') return fresh;
  const stored = value as Partial<PatternShiftProgress>;
  if (typeof stored.version !== 'number' || stored.version > PATTERN_SHIFT_SCHEMA_VERSION) return fresh;
  return {
    ...fresh,
    ...stored,
    version: PATTERN_SHIFT_SCHEMA_VERSION,
    recentPerformance: Array.isArray(stored.recentPerformance) ? stored.recentPerformance.slice(-10) : [],
    sessionHistory: Array.isArray(stored.sessionHistory) ? stored.sessionHistory.slice(-40) : [],
    unlockedRoundTypes: Array.isArray(stored.unlockedRoundTypes) ? stored.unlockedRoundTypes : fresh.unlockedRoundTypes,
  };
}

async function readLocal(uid?: string): Promise<PatternShiftProgress | null> {
  try { const raw = await AsyncStorage.getItem(key(uid)); return raw ? migratePatternShiftProgress(JSON.parse(raw)) : null; }
  catch { return null; }
}

export async function loadPatternShiftProgress(uid?: string): Promise<PatternShiftProgress> {
  const cached = memoryCache.get(cacheKey(uid));
  if (cached) return cached;
  const local = await readLocal(uid);
  // Prime immediately so navigation from overview → game never repeats a
  // cloud wait, including for brand-new users without a local payload.
  const baseline = local ?? freshPatternShiftProgress();
  memoryCache.set(cacheKey(uid), baseline);
  if (uid) {
    try {
      // A slow/offline Firestore client must never hold the game on its
      // preparation screen. The intro normally primes the in-memory cache;
      // direct/deep links get a short bounded cloud reconciliation window.
      const snapshot = await withTimeout(getDoc(cloudRef(uid)), 900);
      if (snapshot.exists()) {
        const cloud = migratePatternShiftProgress(snapshot.data());
        const chosen = (cloud.lastPlayedAt ?? '') >= (local?.lastPlayedAt ?? '') ? cloud : local ?? cloud;
        memoryCache.set(cacheKey(uid), chosen);
        void AsyncStorage.setItem(key(uid), JSON.stringify(chosen)).catch(() => {});
        return chosen;
      }
    } catch { /* offline: local fallback */ }
  }
  const progress = baseline;
  memoryCache.set(cacheKey(uid), progress);
  return progress;
}

export async function savePatternShiftSession(
  uid: string | undefined,
  record: PatternShiftSessionRecord,
): Promise<{ saved: boolean; progress: PatternShiftProgress }> {
  if (!(await guard.claim(record.id))) return { saved: false, progress: await loadPatternShiftProgress(uid) };
  try {
    const current = await loadPatternShiftProgress(uid);
    const progress = applySession(current, record);
    await AsyncStorage.setItem(key(uid), JSON.stringify(progress));
    memoryCache.set(cacheKey(uid), progress);
    if (uid) {
      try {
        await withTimeout(setDoc(cloudRef(uid), progress), 1200);
      } catch { /* local state remains authoritative offline */ }
    }
    return { saved: true, progress };
  } catch (error) {
    await guard.release(record.id);
    throw error;
  }
}
