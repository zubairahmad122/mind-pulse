import AsyncStorage from '@react-native-async-storage/async-storage';

export type EyeBreakIntervalMinutes = 20 | 30 | 45 | 60;

export const EYE_BREAK_INTERVAL_OPTIONS: EyeBreakIntervalMinutes[] = [20, 30, 45, 60];
export const DEFAULT_EYE_BREAK_INTERVAL: EyeBreakIntervalMinutes = 20;

export type EyeBreakScheduleMode = 'anytime' | 'weekdays' | 'daily' | 'custom';

export interface EyeBreakSchedule {
  mode: EyeBreakScheduleMode;
  startHour: number;
  endHour: number;
  activeDays: number[];
}

export const DEFAULT_EYE_BREAK_SCHEDULE: EyeBreakSchedule = {
  mode: 'anytime',
  startHour: 9,
  endHour: 17,
  activeDays: [1, 2, 3, 4, 5],
};

function intervalKey(uid?: string): string {
  return `@mindpulse/eye-break-interval:${uid ?? 'guest'}`;
}

function scheduleKey(uid?: string): string {
  return `@mindpulse/eye-break-schedule:${uid ?? 'guest'}`;
}

export function isEyeBreakInterval(value: number): value is EyeBreakIntervalMinutes {
  return EYE_BREAK_INTERVAL_OPTIONS.includes(value as EyeBreakIntervalMinutes);
}

export async function loadEyeBreakInterval(
  uid?: string,
): Promise<EyeBreakIntervalMinutes> {
  try {
    const raw = await AsyncStorage.getItem(intervalKey(uid));
    const parsed = raw ? Number(raw) : DEFAULT_EYE_BREAK_INTERVAL;
    return isEyeBreakInterval(parsed) ? parsed : DEFAULT_EYE_BREAK_INTERVAL;
  } catch {
    return DEFAULT_EYE_BREAK_INTERVAL;
  }
}

export async function saveEyeBreakInterval(
  uid: string | undefined,
  minutes: EyeBreakIntervalMinutes,
): Promise<void> {
  try {
    await AsyncStorage.setItem(intervalKey(uid), String(minutes));
  } catch {
    // Reminder scheduling can still proceed for the current app session.
  }
}

export async function loadEyeBreakSchedule(uid?: string): Promise<EyeBreakSchedule> {
  try {
    const raw = await AsyncStorage.getItem(scheduleKey(uid));
    if (!raw) return DEFAULT_EYE_BREAK_SCHEDULE;
    const parsed = JSON.parse(raw) as Partial<EyeBreakSchedule>;
    if (
      !['anytime', 'weekdays', 'daily', 'custom'].includes(parsed.mode ?? '')
      || !Number.isInteger(parsed.startHour)
      || !Number.isInteger(parsed.endHour)
      || (parsed.startHour ?? -1) < 0
      || (parsed.endHour ?? 25) > 24
      || (parsed.startHour ?? 0) >= (parsed.endHour ?? 0)
    ) {
      return DEFAULT_EYE_BREAK_SCHEDULE;
    }
    const activeDays = Array.isArray(parsed.activeDays)
      ? [...new Set(parsed.activeDays)].filter(
          day => Number.isInteger(day) && day >= 0 && day <= 6,
        )
      : DEFAULT_EYE_BREAK_SCHEDULE.activeDays;
    if (parsed.mode === 'custom' && activeDays.length === 0) {
      return DEFAULT_EYE_BREAK_SCHEDULE;
    }
    return { ...parsed, activeDays } as EyeBreakSchedule;
  } catch {
    return DEFAULT_EYE_BREAK_SCHEDULE;
  }
}

export async function saveEyeBreakSchedule(
  uid: string | undefined,
  schedule: EyeBreakSchedule,
): Promise<void> {
  try {
    await AsyncStorage.setItem(scheduleKey(uid), JSON.stringify(schedule));
  } catch {
    // Scheduling can still proceed for the current session.
  }
}
