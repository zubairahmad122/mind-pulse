import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityEvent } from '@/types/activity.types';
import { isActivityType } from '@/utils/activityQueries';

/**
 * Unified activity log persistence — one AsyncStorage list per account
 * (`@mindpulse/activity-log:<uid>`, or `:guest` when there is no Firebase
 * user at all), so one account's activity can never be read by another.
 *
 * AsyncStorage is the source of truth (works offline, read synchronously by
 * the store after hydration). Signed-in accounts (including anonymous ones,
 * which have a real uid) are additionally mirrored to Firestore
 * `users/{uid}/activities/{id}` best-effort, and restored from there only when
 * the local log is empty (fresh install / new device).
 *
 * Firestore is required lazily (inside try) so this module — and every
 * completion point that records through it — stays importable where the
 * native Firebase module isn't available (unit tests, first run before a
 * rebuild); a failure there only skips the best-effort cloud copy.
 */

type FirestoreModule = typeof import('@react-native-firebase/firestore');
function firestore(): FirestoreModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native module, see above
  return require('@react-native-firebase/firestore') as FirestoreModule;
}

const MAX_EVENTS = 2000;
const CLOUD_RESTORE_LIMIT = 500;
const GUEST_KEY = 'guest';

export function activityOwnerKey(uid?: string | null): string {
  return uid || GUEST_KEY;
}

function storageKey(ownerKey: string): string {
  return `@mindpulse/activity-log:${ownerKey}`;
}

function isActivityEvent(value: unknown): value is ActivityEvent {
  if (!value || typeof value !== 'object') return false;
  const e = value as Partial<ActivityEvent>;
  return (
    typeof e.id === 'string' &&
    isActivityType(e.type) &&
    typeof e.timestamp === 'number' &&
    typeof e.date === 'string' &&
    typeof e.durationSeconds === 'number' &&
    typeof e.source === 'string'
  );
}

/** Merge by id (first occurrence wins), oldest→newest, capped. */
export function mergeActivityEvents(...lists: readonly ActivityEvent[][]): ActivityEvent[] {
  const byId = new Map<string, ActivityEvent>();
  for (const list of lists) for (const e of list) if (!byId.has(e.id)) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-MAX_EVENTS);
}

// Per-account write queue: every read-modify-write (and every load) for the
// same key runs strictly in order, so a completion recorded while the log is
// still loading can never be overwritten by the load.
const queues = new Map<string, Promise<unknown>>();
function enqueue<T>(ownerKey: string, task: () => Promise<T>): Promise<T> {
  const prev = queues.get(ownerKey) ?? Promise.resolve();
  const next = prev.then(task, task);
  queues.set(ownerKey, next.catch(() => undefined));
  return next;
}

async function readLocal(ownerKey: string): Promise<ActivityEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(ownerKey));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isActivityEvent) : [];
  } catch {
    return [];
  }
}

async function writeLocal(ownerKey: string, events: ActivityEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(ownerKey), JSON.stringify(events));
  } catch {
    // Storage full/unavailable — in-memory state still reflects the event.
  }
}

async function mirrorToCloud(uid: string, event: ActivityEvent): Promise<void> {
  try {
    const { getFirestore, doc, setDoc } = firestore();
    await setDoc(doc(getFirestore(), 'users', uid, 'activities', event.id), event);
  } catch {
    // Best-effort backup — local copy is authoritative.
  }
}

async function restoreFromCloud(uid: string): Promise<ActivityEvent[]> {
  try {
    const { getFirestore, collection, getDocs, query, orderBy, limit } = firestore();
    const snap = await getDocs(
      query(
        collection(getFirestore(), 'users', uid, 'activities'),
        orderBy('timestamp', 'desc'),
        limit(CLOUD_RESTORE_LIMIT),
      ),
    );
    return snap.docs.map(d => d.data()).filter(isActivityEvent);
  } catch {
    return [];
  }
}

/** Loads one account's log. Restores from Firestore only if the local log is empty. */
export function loadActivityLog(uid?: string | null): Promise<ActivityEvent[]> {
  const ownerKey = activityOwnerKey(uid);
  return enqueue(ownerKey, async () => {
    const local = await readLocal(ownerKey);
    if (local.length > 0 || !uid) return local;
    const cloud = await restoreFromCloud(uid);
    if (cloud.length === 0) return local;
    const merged = mergeActivityEvents(cloud);
    await writeLocal(ownerKey, merged);
    return merged;
  });
}

/**
 * Appends one completed activity. Idempotent by `event.id`: returns
 * `added: false` (and writes nothing) if that id is already logged.
 */
export function appendActivityEvent(
  uid: string | null | undefined,
  event: ActivityEvent,
): Promise<{ added: boolean; events: ActivityEvent[] }> {
  const ownerKey = activityOwnerKey(uid);
  return enqueue(ownerKey, async () => {
    const current = await readLocal(ownerKey);
    if (current.some(e => e.id === event.id)) return { added: false, events: current };
    const events = mergeActivityEvents(current, [event]);
    await writeLocal(ownerKey, events);
    if (uid) void mirrorToCloud(uid, event);
    return { added: true, events };
  });
}

/**
 * Guest → account migration (called from `migrateGuestData`, the existing
 * path for a device-only guest who creates an account). Anonymous Firebase
 * guests keep their uid when linked, so their log needs no migration.
 */
export async function migrateGuestActivityLog(uid: string): Promise<void> {
  const guest = await enqueue(GUEST_KEY, () => readLocal(GUEST_KEY));
  if (guest.length === 0) return;
  // Write into the account first; only drop the guest copy once that landed.
  await enqueue(uid, async () => {
    const merged = mergeActivityEvents(await readLocal(uid), guest);
    await AsyncStorage.setItem(storageKey(uid), JSON.stringify(merged));
  });
  await enqueue(GUEST_KEY, () => AsyncStorage.removeItem(storageKey(GUEST_KEY)));
  for (const event of guest) void mirrorToCloud(uid, event);
}
