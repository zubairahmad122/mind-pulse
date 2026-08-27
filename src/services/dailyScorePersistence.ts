import { getFirestore, collection, doc, getDoc, getDocs, setDoc, query, orderBy, limit } from '@react-native-firebase/firestore';

const db = getFirestore();

export interface DailyScoreData {
  mindPulseScore: number;
  eyesScore: number;
  sleepScore: number;
  mindScore: number;
  savedAt: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function scoresRef(uid: string) {
  return collection(db, 'users', uid, 'dailyScores');
}

export async function saveDailyScore(uid: string, data: DailyScoreData): Promise<void> {
  try {
    await setDoc(doc(scoresRef(uid), todayKey()), data, { merge: true });
  } catch {
    // Best-effort snapshot — a transient Firestore error here shouldn't surface to the user.
  }
}

export async function getDailyScore(uid: string, dateKey: string): Promise<DailyScoreData | null> {
  try {
    const snap = await getDoc(doc(scoresRef(uid), dateKey));
    if (!snap.exists()) return null;
    return snap.data() as DailyScoreData;
  } catch {
    return null;
  }
}

export async function getYesterdayScore(uid: string): Promise<DailyScoreData | null> {
  return getDailyScore(uid, yesterdayKey());
}

export async function getLastNDayScores(
  uid: string,
  n = 7,
): Promise<({ date: string; mindPulseScore: number } | null)[]> {
  const results: ({ date: string; mindPulseScore: number } | null)[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const data = await getDailyScore(uid, key);
    results.push(data ? { date: key, mindPulseScore: data.mindPulseScore } : null);
  }
  return results;
}

export async function getDailyScoreStreak(uid: string): Promise<number> {
  try {
    const snap = await getDocs(query(scoresRef(uid), orderBy('savedAt', 'desc'), limit(90)));
    if (snap.empty) return 0;

    const keys = snap.docs.map(d => d.id).sort().reverse();
    let streak = 0;
    const current = new Date();
    current.setHours(0, 0, 0, 0);

    for (const key of keys) {
      const expected = new Date(current);
      expected.setDate(expected.getDate() - streak);
      const expectedKey = expected.toISOString().slice(0, 10);
      if (key === expectedKey) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  } catch {
    return 0;
  }
}
