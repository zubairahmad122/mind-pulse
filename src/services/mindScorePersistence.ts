import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@mindpulse/stress-settings';

export interface StressSettings {
  lastStressLevel: number;
  lastStressLoggedAt: number; // unix ms
}

function key(uid?: string) {
  return `${PREFIX}:${uid ?? 'guest'}`;
}

export async function loadStressSettings(uid?: string): Promise<StressSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(key(uid));
    if (!raw) return null;
    return JSON.parse(raw) as StressSettings;
  } catch {
    return null;
  }
}

export async function saveStressSettings(uid: string | undefined, level: number): Promise<void> {
  const data: StressSettings = { lastStressLevel: level, lastStressLoggedAt: Date.now() };
  await AsyncStorage.setItem(key(uid), JSON.stringify(data));
}
