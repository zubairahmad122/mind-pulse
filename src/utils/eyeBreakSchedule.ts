import type {
  EyeBreakIntervalMinutes,
  EyeBreakSchedule,
} from '@/services/eyeBreakReminderPreferences';

const MAX_ROLLING_NOTIFICATIONS = 60;
const ROLLING_DAYS = 7;

export function buildEyeBreakReminderDates(
  now: Date,
  intervalMinutes: EyeBreakIntervalMinutes,
  schedule: EyeBreakSchedule,
): Date[] {
  if (schedule.mode === 'anytime') return [];

  const dates: Date[] = [];
  for (let offset = 0; offset < ROLLING_DAYS; offset += 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + offset);
    const weekday = day.getDay();
    if (schedule.mode === 'weekdays' && (weekday === 0 || weekday === 6)) {
      continue;
    }
    if (schedule.mode === 'custom' && !schedule.activeDays.includes(weekday)) {
      continue;
    }

    const first = new Date(day);
    first.setHours(schedule.startHour, intervalMinutes, 0, 0);
    for (
      let timestamp = first.getTime();
      timestamp < day.getTime() + schedule.endHour * 60 * 60 * 1000;
      timestamp += intervalMinutes * 60 * 1000
    ) {
      if (timestamp <= now.getTime()) continue;
      dates.push(new Date(timestamp));
      if (dates.length === MAX_ROLLING_NOTIFICATIONS) return dates;
    }
  }
  return dates;
}
