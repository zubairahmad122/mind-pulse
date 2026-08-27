import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from "@react-native-firebase/firestore";
import { createPersistentDuplicateGuard } from "@/engine/adapters/persistentDuplicateGuard";
import {
  applySession,
  freshTimeFlowProgress,
  TIME_FLOW_SCHEMA_VERSION,
  mechanicsForLevel,
  type TimeFlowProgress,
  type TimeFlowSessionRecord,
} from "@/engine/core/games/timeFlow";
import { withTimeout } from "@/utils/withTimeout";

const db = getFirestore(),
  guard = createPersistentDuplicateGuard(),
  cache = new Map<string, TimeFlowProgress>();
const key = (uid?: string) => `@mindpulse/time-flow:${uid ?? "guest"}`,
  cacheKey = (uid?: string) => uid ?? "guest";
const cloudRef = (uid: string) =>
  doc(db, "users", uid, "gameProgress", "time-flow");

export function migrateTimeFlowProgress(value: unknown): TimeFlowProgress {
  const fresh = freshTimeFlowProgress();
  if (!value || typeof value !== "object") return fresh;
  const stored = value as Partial<TimeFlowProgress>;
  if (
    typeof stored.version !== "number" ||
    stored.version > TIME_FLOW_SCHEMA_VERSION
  )
    return fresh;
  return {
    ...fresh,
    ...stored,
    version: TIME_FLOW_SCHEMA_VERSION,
    highestGridSize: Math.max(3, stored.highestGridSize ?? 3),
    preferredGrid: stored.preferredGrid ?? fresh.preferredGrid,
    stableSequenceLength: Math.max(
      3,
      stored.stableSequenceLength ?? stored.highestSequenceLength ?? 3,
    ),
    accuracyWindow: Array.isArray(stored.accuracyWindow)
      ? stored.accuracyWindow.slice(-5)
      : [],
    currentAdaptiveTier: Math.max(
      1,
      stored.currentAdaptiveTier ?? stored.highestTier ?? 1,
    ),
    unlockedMechanics: mechanicsForLevel(stored.level ?? fresh.level),
    seenModeIntros: Array.isArray(stored.seenModeIntros)
      ? [...new Set(["sequence" as const, ...stored.seenModeIntros])]
      : fresh.seenModeIntros,
    recentPerformance: Array.isArray(stored.recentPerformance)
      ? stored.recentPerformance.slice(-10)
      : [],
    sessionHistory: Array.isArray(stored.sessionHistory)
      ? stored.sessionHistory.slice(-40)
      : [],
  };
}
async function local(uid?: string) {
  try {
    const raw = await AsyncStorage.getItem(key(uid));
    return raw ? migrateTimeFlowProgress(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
export async function loadTimeFlowProgress(uid?: string) {
  const cached = cache.get(cacheKey(uid));
  if (cached) return cached;
  const stored = await local(uid),
    baseline = stored ?? freshTimeFlowProgress();
  cache.set(cacheKey(uid), baseline);
  if (uid) {
    try {
      const snapshot = await withTimeout(getDoc(cloudRef(uid)), 900);
      if (snapshot.exists()) {
        const cloud = migrateTimeFlowProgress(snapshot.data()),
          chosen =
            (cloud.lastPlayedAt ?? "") >= (stored?.lastPlayedAt ?? "")
              ? cloud
              : (stored ?? cloud);
        cache.set(cacheKey(uid), chosen);
        void AsyncStorage.setItem(key(uid), JSON.stringify(chosen)).catch(
          () => {},
        );
        return chosen;
      }
    } catch {
      /* local-first */
    }
  }
  return baseline;
}
export async function saveTimeFlowSession(
  uid: string | undefined,
  record: TimeFlowSessionRecord,
) {
  if (!(await guard.claim(record.id)))
    return { saved: false, progress: await loadTimeFlowProgress(uid) };
  try {
    const current = await loadTimeFlowProgress(uid),
      progress = applySession(current, record);
    await AsyncStorage.setItem(key(uid), JSON.stringify(progress));
    cache.set(cacheKey(uid), progress);
    if (uid) {
      try {
        // Local progress is authoritative for the session transition. A
        // stalled offline Firestore client must not leave the game parked on
        // "Securing your progress…" indefinitely.
        await withTimeout(setDoc(cloudRef(uid), progress), 1200);
      } catch {
        /* local remains authoritative */
      }
    }
    return { saved: true, progress };
  } catch (error) {
    await guard.release(record.id);
    throw error;
  }
}
