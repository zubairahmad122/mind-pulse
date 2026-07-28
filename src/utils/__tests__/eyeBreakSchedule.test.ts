import { buildEyeBreakReminderDates } from '@/utils/eyeBreakSchedule';

describe('eye break working-hours schedule', () => {
  it('creates reminders only inside weekday hours', () => {
    const dates = buildEyeBreakReminderDates(
      new Date(2026, 6, 24, 8),
      60,
      { mode: 'weekdays', startHour: 9, endHour: 17, activeDays: [1, 2, 3, 4, 5] },
    );
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.every(date => date.getDay() !== 0 && date.getDay() !== 6)).toBe(true);
    expect(dates.every(date => date.getHours() >= 9 && date.getHours() < 17)).toBe(true);
  });

  it('uses the repeating scheduler for anytime mode', () => {
    expect(buildEyeBreakReminderDates(
      new Date(2026, 6, 24, 8),
      20,
      { mode: 'anytime', startHour: 9, endHour: 17, activeDays: [1, 2, 3, 4, 5] },
    )).toEqual([]);
  });

  it('respects custom selected days and hours', () => {
    const dates = buildEyeBreakReminderDates(
      new Date(2026, 6, 24, 8),
      60,
      { mode: 'custom', startHour: 10, endHour: 14, activeDays: [1, 3] },
    );
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.every(date => [1, 3].includes(date.getDay()))).toBe(true);
    expect(dates.every(date => date.getHours() >= 10 && date.getHours() < 14)).toBe(true);
  });
});
