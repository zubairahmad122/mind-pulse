import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cancelDigitalSunsetReminder,
  ensureDigitalSunsetScheduled,
  getDigitalSunsetWindow,
  loadDigitalSunsetSettings,
  loadDigitalSunsetSummary,
  setDigitalSunsetEnabled,
  setDigitalSunsetOffset,
} from '../digitalSunset';
import { defaultSleepSchedule, saveCachedSleepSchedule } from '../sleepSchedulePersistence';

jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest mock factory
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});

const notificationState = {
  permission: 'granted',
  scheduleCount: 0,
  scheduled: [] as Record<string, unknown>[],
  cancelled: [] as string[],
};

jest.mock('expo-notifications', () => ({
  __esModule: true,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  getPermissionsAsync: jest.fn(async () => ({ status: notificationState.permission })),
  requestPermissionsAsync: jest.fn(async () => ({ status: notificationState.permission })),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async (request: Record<string, unknown>) => {
    notificationState.scheduleCount += 1;
    const id = `digital-sunset-test-${notificationState.scheduleCount}`;
    notificationState.scheduled.push({ ...request, returnedId: id });
    return id;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    notificationState.cancelled.push(id);
  }),
}));

function at(year: number, month: number, day: number, hour: number, minute: number): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

describe('Digital Sunset time calculation', () => {
  it('starts 60 min before an 11:30 PM bedtime', () => {
    const window = getDigitalSunsetWindow(at(2026, 1, 1, 12, 0), '23:30', 60);
    expect(window.startsAt.getHours()).toBe(22);
    expect(window.startsAt.getMinutes()).toBe(30);
  });

  it('starts 30 min before an 11:30 PM bedtime', () => {
    const window = getDigitalSunsetWindow(at(2026, 1, 1, 12, 0), '23:30', 30);
    expect(window.startsAt.getHours()).toBe(23);
    expect(window.startsAt.getMinutes()).toBe(0);
  });

  it('handles 12:30 AM bedtime by starting 11:30 PM on the previous day', () => {
    const window = getDigitalSunsetWindow(at(2026, 1, 1, 20, 0), '00:30', 60);
    expect(window.startsAt.getDate()).toBe(1);
    expect(window.startsAt.getHours()).toBe(23);
    expect(window.startsAt.getMinutes()).toBe(30);
    expect(window.bedtimeAt.getDate()).toBe(2);
  });

  it('handles 1:00 AM bedtime with a 12:30 AM start', () => {
    const window = getDigitalSunsetWindow(at(2026, 1, 1, 20, 0), '01:00', 30);
    expect(window.startsAt.getDate()).toBe(2);
    expect(window.startsAt.getHours()).toBe(0);
    expect(window.startsAt.getMinutes()).toBe(30);
  });

  it('is inactive before the sunset window', () => {
    expect(getDigitalSunsetWindow(at(2026, 1, 1, 22, 0), '23:30', 60).active).toBe(false);
  });

  it('is active inside the sunset window', () => {
    const window = getDigitalSunsetWindow(at(2026, 1, 1, 22, 45), '23:30', 60);
    expect(window.active).toBe(true);
    expect(window.minutesUntilBedtime).toBe(45);
  });

  it('is inactive after bedtime', () => {
    expect(getDigitalSunsetWindow(at(2026, 1, 1, 23, 45), '23:30', 60).active).toBe(false);
  });
});

describe('Digital Sunset scheduling and persistence', () => {
  beforeEach(() => {
    notificationState.permission = 'granted';
    notificationState.scheduleCount = 0;
    notificationState.scheduled = [];
    notificationState.cancelled = [];
    jest.useFakeTimers();
    jest.setSystemTime(at(2026, 1, 1, 12, 0));
  });

  afterEach(async () => {
    jest.useRealTimers();
    await AsyncStorage.clear();
  });

  it('enable schedules a daily reminder from the Sleep bedtime source', async () => {
    await saveCachedSleepSchedule(undefined, { ...defaultSleepSchedule(), bedtime: '23:30' });

    await expect(setDigitalSunsetEnabled(undefined, true)).resolves.toBe(true);

    expect(notificationState.scheduled).toHaveLength(1);
    expect(notificationState.scheduled[0]).toMatchObject({
      trigger: { type: 'daily', hour: 22, minute: 30 },
    });
  });

  it('disable cancels the pending reminder', async () => {
    await setDigitalSunsetEnabled(undefined, true);
    await setDigitalSunsetEnabled(undefined, false);

    expect(notificationState.cancelled).toEqual(['digital-sunset-test-1']);
    expect((await loadDigitalSunsetSettings()).digitalSunsetEnabled).toBe(false);
  });

  it('bedtime change removes the old schedule and creates a new one', async () => {
    await saveCachedSleepSchedule(undefined, { ...defaultSleepSchedule(), bedtime: '23:30' });
    await setDigitalSunsetEnabled(undefined, true);

    const changed = { ...defaultSleepSchedule(), bedtime: '22:00' };
    await saveCachedSleepSchedule(undefined, changed);
    await ensureDigitalSunsetScheduled(undefined, changed);

    expect(notificationState.cancelled).toEqual(['digital-sunset-test-1']);
    expect(notificationState.scheduled).toHaveLength(2);
    expect(notificationState.scheduled[1]).toMatchObject({
      trigger: { type: 'daily', hour: 21, minute: 0 },
    });
  });

  it('offset change reschedules correctly', async () => {
    await saveCachedSleepSchedule(undefined, { ...defaultSleepSchedule(), bedtime: '23:30' });
    await setDigitalSunsetEnabled(undefined, true);
    await setDigitalSunsetOffset(undefined, 30);

    expect(notificationState.cancelled).toEqual(['digital-sunset-test-1']);
    expect(notificationState.scheduled[1]).toMatchObject({
      trigger: { type: 'daily', hour: 23, minute: 0 },
    });
  });

  it('notification permission unavailable leaves reminders disabled without scheduling', async () => {
    notificationState.permission = 'denied';

    await expect(setDigitalSunsetEnabled(undefined, true)).resolves.toBe(false);

    expect(notificationState.scheduled).toHaveLength(0);
    expect((await loadDigitalSunsetSettings()).digitalSunsetEnabled).toBe(false);
  });

  it('app restart restores the setting from local storage', async () => {
    await setDigitalSunsetEnabled(undefined, true);

    const settings = await loadDigitalSunsetSettings();

    expect(settings.digitalSunsetEnabled).toBe(true);
    expect(settings.digitalSunsetOffsetMinutes).toBe(60);
    expect(settings.lastNotificationId).toBe('digital-sunset-test-1');
  });

  it('Digital Sunset reads the same cached bedtime used by Sleep', async () => {
    await saveCachedSleepSchedule(undefined, { ...defaultSleepSchedule(), bedtime: '21:45' });

    const summary = await loadDigitalSunsetSummary(undefined, null, at(2026, 1, 1, 18, 0));

    expect(summary.schedule.bedtime).toBe('21:45');
    expect(summary.window.startsAt.getHours()).toBe(20);
    expect(summary.window.startsAt.getMinutes()).toBe(45);
  });

  it('cancel is safe when no reminder is scheduled', async () => {
    await expect(cancelDigitalSunsetReminder()).resolves.toBeUndefined();
  });
});
