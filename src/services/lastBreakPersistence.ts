import AsyncStorage from '@react-native-async-storage/async-storage';

function key(uid?: string): string {
  return `@mindpulse/last-eye-break:${uid ?? 'guest'}`;
}

export async function recordBreakTaken(uid?: string): Promise<void> {
  await AsyncStorage.setItem(key(uid), String(Date.now()));
}

export async function getLastBreakTime(uid?: string): Promise<number | null> {
  const val = await AsyncStorage.getItem(key(uid));
  return val ? parseInt(val, 10) : null;
}
