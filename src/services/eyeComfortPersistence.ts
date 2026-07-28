import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, getFirestore } from '@react-native-firebase/firestore';
import { withTimeout } from '@/utils/withTimeout';
import type { EyeComfortValue } from '@/utils/eyeComfort';

const db = getFirestore();
const MAX_LOCAL_RECORDS = 180;

export type EyeComfortRating = EyeComfortValue;

export interface EyeComfortRecord {
  completedAt: number;
  sessionType: 'eye-reset';
  before: EyeComfortRating | null;
  after: EyeComfortRating | null;
}

function comfortKey(uid?: string): string {
  return `@mindpulse/eye-comfort:${uid ?? 'guest'}`;
}

export async function saveEyeComfortRecord(
  uid: string | undefined,
  record: EyeComfortRecord,
): Promise<void> {
  try {
    const key = comfortKey(uid);
    const raw = await AsyncStorage.getItem(key);
    const existing: EyeComfortRecord[] = raw ? JSON.parse(raw) : [];
    const next = [record, ...existing].slice(0, MAX_LOCAL_RECORDS);
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch {
    // A check-in must never block session completion.
  }

  if (!uid) return;
  try {
    await withTimeout(
      addDoc(collection(db, 'users', uid, 'eyeComfortCheckIns'), record),
      8000,
    );
  } catch {
    // The local record remains available when offline.
  }
}

export async function loadEyeComfortRecords(uid?: string): Promise<EyeComfortRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(comfortKey(uid));
    return raw ? (JSON.parse(raw) as EyeComfortRecord[]) : [];
  } catch {
    return [];
  }
}
