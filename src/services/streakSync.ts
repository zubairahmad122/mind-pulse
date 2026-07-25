import { doc, getDoc, getFirestore, setDoc } from '@react-native-firebase/firestore';

const db = getFirestore();

/** The subset of useWellnessStore's streak slice that's worth mirroring to
 * Firestore — deliberately excludes in-memory-only fields (scores, daily
 * challenge, badges, surprise-badge flags) that aren't the "don't lose my
 * streak on reinstall" safeguard this exists for. */
export interface WellnessSnapshot {
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  streakFreezeAvailable: boolean;
  freezeWeekStart: string | null;
  activityLog: string[];
}

function wellnessDocRef(uid: string) {
  return doc(db, 'users', uid, 'meta', 'wellness');
}

export async function fetchWellnessSnapshot(uid: string): Promise<WellnessSnapshot | null> {
  try {
    const snap = await getDoc(wellnessDocRef(uid));
    if (!snap.exists()) return null;
    return snap.data() as WellnessSnapshot;
  } catch {
    return null;
  }
}

/** Best-effort — a transient Firestore error here shouldn't surface to the
 * user; AsyncStorage remains the source of truth until the next sync. */
export async function pushWellnessSnapshot(uid: string, snapshot: WellnessSnapshot): Promise<void> {
  try {
    await setDoc(wellnessDocRef(uid), snapshot, { merge: true });
  } catch {
    // ignore
  }
}
