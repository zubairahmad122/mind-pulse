import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

export interface RecoverySessionData {
  type: string;
  durationSeconds: number;
  completedAt: number;
}

function recoveryCacheKey(uid: string): string {
  return `@mindpulse/recovery:${uid}`;
}

/**
 * Save a recovery session to both Firestore (cloud backup) and AsyncStorage
 * (local cache for Mind Score & Achievement calculations).
 */
export async function saveRecoverySession(
  uid: string,
  data: RecoverySessionData,
): Promise<void> {
  // Always persist locally for Mind Score & Achievements
  const cacheKey = recoveryCacheKey(uid);
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    const existing: RecoverySessionData[] = raw ? JSON.parse(raw) : [];
    existing.push(data);
    // Keep max 500 entries to avoid unbounded growth
    const pruned = existing.length > 500 ? existing.slice(-500) : existing;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(pruned));
  } catch {
    // AsyncStorage write failed — non-critical, Firestore will be the source of truth
  }

  // Cloud backup (fire-and-forget — errors caught by caller)
  await firestore()
    .collection('users')
    .doc(uid)
    .collection('recoverySessions')
    .add(data);
}
