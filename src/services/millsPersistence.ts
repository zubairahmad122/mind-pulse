import AsyncStorage from '@react-native-async-storage/async-storage';
import { deserializeGameState, serializeGameState, type GameState } from '@/engine/core/games/mills';

// v1 saves could contain recursively nested undo arrays. Never read that key:
// Android AsyncStorage must materialize the value before JS can reject it,
// which can OOM the process. v2 stores bounded, flat turn snapshots.
const KEY = '@mindpulse/mills/local-match-v2';
const POISONED_V1_KEY = '@mindpulse/mills/local-match';

export async function saveMillsMatch(state: GameState): Promise<void> {
  try { await AsyncStorage.setItem(KEY, serializeGameState(state)); } catch {}
}
export async function loadMillsMatch(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const state = deserializeGameState(raw);
    return state.turnNumber === 0 && Object.values(state.board).every(value => value === null) ? null : state;
  } catch { return null; }
}
export async function clearMillsMatch(): Promise<void> {
  try { await AsyncStorage.multiRemove([KEY, POISONED_V1_KEY]); } catch {}
}
export async function hasSavedMillsMatch(): Promise<boolean> {
  // Deleting by key does not materialize the old value across the RN bridge.
  try { await AsyncStorage.removeItem(POISONED_V1_KEY); } catch {}
  return (await loadMillsMatch()) !== null;
}
