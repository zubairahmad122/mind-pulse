import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SleepSchedule } from '@/types/sleep.types';

export const SLEEP_SCHEDULE_STORAGE_KEY_PREFIX = '@mindpulse/sleep-schedule';

export const DEFAULT_SLEEP_SCHEDULE: Omit<SleepSchedule, 'uid'> = {
  bedtime: '23:00',
  wakeTime: '06:30',
  duration: 7.5,
  activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  reminderEnabled: true,
  reminderMinutes: 30,
  sleepNotesEnabled: true,
};

export function sleepScheduleStorageKey(uid?: string): string {
  return `${SLEEP_SCHEDULE_STORAGE_KEY_PREFIX}:${uid ?? 'guest'}`;
}

export function defaultSleepSchedule(uid?: string): SleepSchedule {
  return { uid: uid ?? 'guest', ...DEFAULT_SLEEP_SCHEDULE };
}

export function isValidHHMM(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return Boolean(match);
}

export function normalizeSleepSchedule(raw: unknown, uid?: string): SleepSchedule | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<SleepSchedule>;
  if (!isValidHHMM(data.bedtime) || !isValidHHMM(data.wakeTime)) return null;
  return {
    ...defaultSleepSchedule(uid),
    ...data,
    uid: data.uid ?? uid ?? 'guest',
  };
}

export async function loadCachedSleepSchedule(uid?: string): Promise<SleepSchedule> {
  try {
    const raw = await AsyncStorage.getItem(sleepScheduleStorageKey(uid));
    if (!raw) return defaultSleepSchedule(uid);
    return normalizeSleepSchedule(JSON.parse(raw), uid) ?? defaultSleepSchedule(uid);
  } catch {
    return defaultSleepSchedule(uid);
  }
}

export async function saveCachedSleepSchedule(
  uid: string | undefined,
  schedule: SleepSchedule,
): Promise<void> {
  await AsyncStorage.setItem(sleepScheduleStorageKey(uid), JSON.stringify(schedule));
}
