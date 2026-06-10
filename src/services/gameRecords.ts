import AsyncStorage from '@react-native-async-storage/async-storage';

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

export async function getGameRecord(
  uid: string | undefined,
  gameId: GameId,
): Promise<GameRecord | null> {
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
      await AsyncStorage.setItem(
        storageKey(uid, gameId),
        JSON.stringify({ value, updatedAt: Date.now() }),
      );
    }
    return isNew;
  } catch {
    return false;
  }
}
