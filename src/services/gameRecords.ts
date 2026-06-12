import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

export type GameId = 'saccade-sniper' | 'focus-sprint' | 'comet-trace' | 'dichoptic-reaction';

export interface GameRecord {
  value: number;    // ms (saccade, lower=better) or % (others, higher=better) or score
  updatedAt: number;
}

// For saccade-sniper: lower ms = better. For all others: higher = better.
function isImprovement(gameId: GameId, newVal: number, oldVal: number): boolean {
  return gameId === 'saccade-sniper' ? newVal < oldVal : newVal > oldVal;
}

function storageKey(uid: string | undefined, gameId: GameId): string {
  return `@mindpulse/game-record:${uid ?? 'guest'}:${gameId}`;
}

/** Firestore doc ref for a specific game's best record. */
function gameRecordRef(uid: string, gameId: GameId) {
  return firestore()
    .collection('users')
    .doc(uid)
    .collection('gameRecords')
    .doc(gameId);
}

export async function getGameRecord(
  uid: string | undefined,
  gameId: GameId,
): Promise<GameRecord | null> {
  // For logged-in users: try Firestore first for cross-device sync
  if (uid) {
    try {
      const snap = await gameRecordRef(uid, gameId).get();
      if (snap.exists()) {
        const data = snap.data() as GameRecord;
        // Update local cache in background
        void AsyncStorage.setItem(storageKey(uid, gameId), JSON.stringify(data));
        return data;
      }
    } catch {
      // offline — fall through to local cache
    }
  }

  // Local cache fallback
  try {
    const raw = await AsyncStorage.getItem(storageKey(uid, gameId));
    return raw ? (JSON.parse(raw) as GameRecord) : null;
  } catch {
    return null;
  }
}

/** Returns true if this is a new personal best. */
export async function submitGameScore(
  uid: string | undefined,
  gameId: GameId,
  value: number,
): Promise<boolean> {
  try {
    const existing = await getGameRecord(uid, gameId);
    const isNew = existing === null || isImprovement(gameId, value, existing.value);
    if (isNew) {
      const record: GameRecord = { value, updatedAt: Date.now() };

      // Local cache (always)
      await AsyncStorage.setItem(storageKey(uid, gameId), JSON.stringify(record));

      // Firestore (cloud backup) — only for logged-in users
      if (uid) {
        try {
          await gameRecordRef(uid, gameId).set(record);
        } catch {
          // offline — local cache is sufficient
        }
      }
    }
    return isNew;
  } catch {
    return false;
  }
}
