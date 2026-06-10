import AsyncStorage from '@react-native-async-storage/async-storage';

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}

function gameKey(uid?: string): string {
  return `@mindpulse/eye-game-today:${uid ?? 'guest'}:${todayKey()}`;
}

function breaksKey(uid?: string): string {
  return `@mindpulse/eye-breaks-today:${uid ?? 'guest'}:${todayKey()}`;
}

export async function markGamePlayedToday(uid?: string): Promise<void> {
  await AsyncStorage.setItem(gameKey(uid), 'true');
}

export async function getGamePlayedToday(uid?: string): Promise<boolean> {
  const val = await AsyncStorage.getItem(gameKey(uid));
  return val === 'true';
}

export async function incrementBreaksTaken(uid?: string): Promise<number> {
  const current = await getBreaksTaken(uid);
  const next = current + 1;
  await AsyncStorage.setItem(breaksKey(uid), String(next));
  return next;
}

export async function getBreaksTaken(uid?: string): Promise<number> {
  const val = await AsyncStorage.getItem(breaksKey(uid));
  return val ? parseInt(val, 10) : 0;
}
