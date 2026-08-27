import AsyncStorage from '@react-native-async-storage/async-storage';
import { deserializeGameState, serializeGameState, type GameState } from '@/engine/core/games/mills';

// v1 saves could contain recursively nested undo arrays. Never read that key:
// Android AsyncStorage must materialize the value before JS can reject it,
// which can OOM the process. v2 stores bounded, flat turn snapshots.
const KEY = '@mindpulse/mills/local-match-v2';
const POISONED_V1_KEY = '@mindpulse/mills/local-match';
let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite(operation: () => Promise<void>): Promise<void> {
  // Match state can update several times in quick succession. Serialize writes
  // so an older, slower AsyncStorage call can never overwrite a newer turn.
  writeQueue = writeQueue.then(operation, operation).catch(() => {});
  return writeQueue;
}

export function saveMillsMatch(state: GameState): Promise<void> {
  const serialized = serializeGameState(state);
  return enqueueWrite(() => AsyncStorage.setItem(KEY, serialized));
}
export async function loadMillsMatch(): Promise<GameState | null> {
  try {
    await writeQueue;
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const state = deserializeGameState(raw);
    return state.turnNumber === 0 && Object.values(state.board).every(value => value === null) ? null : state;
  } catch { return null; }
}
export function clearMillsMatch(): Promise<void> {
  return enqueueWrite(() => AsyncStorage.multiRemove([KEY, POISONED_V1_KEY]));
}
export async function hasSavedMillsMatch(): Promise<boolean> {
  // Deleting by key does not materialize the old value across the RN bridge.
  try { await AsyncStorage.removeItem(POISONED_V1_KEY); } catch {}
  return (await loadMillsMatch()) !== null;
}
