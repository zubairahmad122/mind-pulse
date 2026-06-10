import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveSleepRecord } from '@/types/activeSleep.types';
import { SleepSession } from '@/utils/sleepUtils';

const ACTIVE_SLEEP_PREFIX = '@mindpulse/active-sleep';
const PRESET_PREFIX = '@mindpulse/sleep-preset';
const GUEST_SESSIONS_KEY = '@mindpulse/guest-sessions';

function userKey(prefix: string, uid?: string) {
  return `${prefix}:${uid ?? 'guest'}`;
}

export async function loadActiveSleep(uid?: string): Promise<ActiveSleepRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(userKey(ACTIVE_SLEEP_PREFIX, uid));
    if (!raw) return null;
    const data = JSON.parse(raw) as ActiveSleepRecord;
    if (!data.startTime || !data.wakeAt || !data.presetId) return null;
    return data;
  } catch {
    return null;
  }
}

export async function saveActiveSleep(
  uid: string | undefined,
  record: ActiveSleepRecord,
): Promise<void> {
  await AsyncStorage.setItem(userKey(ACTIVE_SLEEP_PREFIX, uid), JSON.stringify(record));
}

export async function clearActiveSleep(uid?: string): Promise<void> {
  await AsyncStorage.removeItem(userKey(ACTIVE_SLEEP_PREFIX, uid));
}

export async function loadPreferredPresetId(uid?: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(userKey(PRESET_PREFIX, uid));
  } catch {
    return null;
  }
}

export async function savePreferredPresetId(
  uid: string | undefined,
  presetId: string,
): Promise<void> {
  await AsyncStorage.setItem(userKey(PRESET_PREFIX, uid), presetId);
}

export async function loadGuestSessions(): Promise<SleepSession[]> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SleepSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveGuestSessions(sessions: SleepSession[]): Promise<void> {
  await AsyncStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(sessions));
}

const USER_SESSIONS_PREFIX = '@mindpulse/user-sessions';

export async function loadUserSessionsCache(uid: string): Promise<SleepSession[]> {
  try {
    const raw = await AsyncStorage.getItem(userKey(USER_SESSIONS_PREFIX, uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SleepSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveUserSessionsCache(uid: string, sessions: SleepSession[]): Promise<void> {
  await AsyncStorage.setItem(userKey(USER_SESSIONS_PREFIX, uid), JSON.stringify(sessions));
}
