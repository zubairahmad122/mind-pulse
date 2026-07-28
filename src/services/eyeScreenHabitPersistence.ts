import AsyncStorage from '@react-native-async-storage/async-storage';

export type ScreenSessionContext = 'work' | 'study' | 'gaming' | 'reading' | 'other';
export type ScreenSessionMinutes = 20 | 40 | 60 | 90;

export interface ScreenHabitRecord {
  recordedAt: number;
  context: ScreenSessionContext;
  continuousMinutes: ScreenSessionMinutes;
}

const MAX_RECORDS = 90;

function habitKey(uid?: string): string {
  return `@mindpulse/eye-screen-habits:${uid ?? 'guest'}`;
}

export async function loadScreenHabitRecords(
  uid?: string,
): Promise<ScreenHabitRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(habitKey(uid));
    return raw ? (JSON.parse(raw) as ScreenHabitRecord[]) : [];
  } catch {
    return [];
  }
}

export async function saveScreenHabitRecord(
  uid: string | undefined,
  input: Omit<ScreenHabitRecord, 'recordedAt'>,
): Promise<ScreenHabitRecord> {
  const record = { ...input, recordedAt: Date.now() };
  const current = await loadScreenHabitRecords(uid);
  try {
    await AsyncStorage.setItem(
      habitKey(uid),
      JSON.stringify([record, ...current].slice(0, MAX_RECORDS)),
    );
  } catch {
    // The check-in can still complete if storage is temporarily unavailable.
  }
  return record;
}
