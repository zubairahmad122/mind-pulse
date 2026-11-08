import * as Notifications from 'expo-notifications';
import { trackEvent } from '@/services/analytics';
import {
  cancelEveningReminderForDate,
  ensureEveningReminderScheduled,
  isEveningReminderNotificationId,
  setEveningReminderEnabled,
} from '../eveningReminder';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/services/analytics', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
  AndroidImportance: { DEFAULT: 3 },
}));

describe('evening reminder notification ids', () => {
  it('recognizes rolling-window ids', () => {
    expect(isEveningReminderNotificationId('evening-reminder-2026-11-07')).toBe(true);
    expect(isEveningReminderNotificationId('evening-reminder-test-123')).toBe(true);
  });

  it('rejects unrelated ids', () => {
    expect(isEveningReminderNotificationId('eye-break-123')).toBe(false);
    expect(isEveningReminderNotificationId('usage-high-daily-2026-11-07')).toBe(false);
  });
});

describe('completing an activity today', () => {
  const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
  const scheduledIds = () => schedule.mock.calls.map(([request]) => request.identifier);

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 9, 10, 0, 0), advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps today out of later refills but leaves upcoming days scheduled', async () => {
    await setEveningReminderEnabled('u1', true);
    expect(trackEvent).toHaveBeenCalledWith('reminder_enabled', { kind: 'evening' });

    await ensureEveningReminderScheduled('u1');
    expect(scheduledIds()).toContain('evening-reminder-2026-11-09');

    schedule.mockClear();
    await cancelEveningReminderForDate('u1', '2026-11-09');
    await ensureEveningReminderScheduled('u1');

    expect(scheduledIds()).not.toContain('evening-reminder-2026-11-09');
    expect(scheduledIds()).toContain('evening-reminder-2026-11-10');
  });
});
