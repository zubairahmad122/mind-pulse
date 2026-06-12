import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

export type EyeSessionType = 'cvs-protocol' | 'eye-reset';

export interface EyeSessionRecord {
  dateKey: string;
  completedAt: number;
  type: EyeSessionType;
}

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}

function sessionKey(uid?: string): string {
  return `@mindpulse/eye-sessions:${uid ?? 'guest'}`;
}

function enforcerKey(uid?: string): string {
  return `@mindpulse/eye-break-enforcer:${uid ?? 'guest'}`;
}

function notifIdKey(uid?: string): string {
  return `@mindpulse/eye-break-notif-id:${uid ?? 'guest'}`;
}

/** Firestore ref for a user's eye sessions subcollection. */
function eyeSessionsRef(uid: string) {
  return firestore().collection('users').doc(uid).collection('eyeSessions');
}

/** Load from local cache (fast). */
async function loadSessions(uid?: string): Promise<EyeSessionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(sessionKey(uid));
    return raw ? (JSON.parse(raw) as EyeSessionRecord[]) : [];
  } catch {
    return [];
  }
}

/** Save to local cache (with 90-day pruning). */
async function saveSessions(uid: string | undefined, records: EyeSessionRecord[]): Promise<void> {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const pruned = records.filter(r => r.completedAt >= cutoff);
  try {
    await AsyncStorage.setItem(sessionKey(uid), JSON.stringify(pruned));
  } catch {
    // ignore
  }
}

export async function recordEyeCompletion(
  uid: string | undefined,
  type: EyeSessionType,
): Promise<void> {
  const record: EyeSessionRecord = {
    dateKey: todayKey(),
    completedAt: Date.now(),
    type,
  };

  // Firestore (cloud backup) — only for logged-in users
  if (uid) {
    try {
      await eyeSessionsRef(uid).add(record);
    } catch {
      // offline — local cache is sufficient
    }
  }

  // Local cache (always)
  const sessions = await loadSessions(uid);
  await saveSessions(uid, [record, ...sessions]);
}

export async function loadEyeSessions(uid?: string): Promise<EyeSessionRecord[]> {
  // For logged-in users: try Firestore first for cross-device sync
  if (uid) {
    try {
      const snap = await eyeSessionsRef(uid)
        .orderBy('completedAt', 'desc')
        .limit(300)
        .get();
      const cloud = snap.docs.map(d => d.data() as EyeSessionRecord);
      if (cloud.length > 0) {
        // Update local cache in background
        void saveSessions(uid, cloud);
        return cloud;
      }
    } catch {
      // offline — fall through to local cache
    }
  }
  return loadSessions(uid);
}

export async function getEyeBreakEnforcerEnabled(uid?: string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(enforcerKey(uid));
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setEyeBreakEnforcerEnabled(
  uid: string | undefined,
  enabled: boolean,
): Promise<void> {
  try {
    await AsyncStorage.setItem(enforcerKey(uid), enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export async function saveEyeBreakNotifId(
  uid: string | undefined,
  id: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(notifIdKey(uid), id);
  } catch {
    // ignore
  }
}

export async function loadEyeBreakNotifId(uid?: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(notifIdKey(uid));
  } catch {
    return null;
  }
}

export async function clearEyeBreakNotifId(uid?: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(notifIdKey(uid));
  } catch {
    // ignore
  }
}
