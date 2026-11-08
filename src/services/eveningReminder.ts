import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDaysISO, todayISO } from '@/utils/dateUtils';
import { trackEvent } from '@/services/analytics';

const CHANNEL_ID = 'evening-reminder-v1';
const NOTIF_ID_PREFIX = 'evening-reminder-';
/** Rolling window of individual DATE triggers so reminders fire even if the
 * app isn't opened for several days. iOS allows ~64 pending notifications
 * total across the app — 14 is a safe budget for this channel alone. */
export const EVENING_REMINDER_WINDOW_DAYS = 14;
export const DEFAULT_REMINDER_HOUR = 19;
export const DEFAULT_REMINDER_MINUTE = 30;

/** Calm, actionable variants — rotated by day-of-year so the same day always
 * gets a stable copy (avoids reshuffling on every refill). */
const COPY: { title: string; body: string }[] = [
  {
    title: 'Your eyes deserve a little rest',
    body: 'Take a quick 20-second eye break. Tap to start.',
  },
  {
    title: 'One small break can make a difference',
    body: 'Continue your wellness routine today — a short eye break is enough.',
  },
  {
    title: 'Time for a gentle reset',
    body: 'Look away from your screen for 20 seconds. Your focus will thank you.',
  },
  {
    title: 'Still time today',
    body: 'A couple of minutes keeps your wellness habit going. Tap to begin.',
  },
  {
    title: 'Wind down with an eye break',
    body: 'A quick 20-20-20 reset before the evening ends.',
  },
];

export type EveningReminderPreference = {
  preferredHour: number;
  preferredMinute: number;
  customHoursEnabled: boolean;
};

type ScheduledDay = {
  /** Local YYYY-MM-DD the reminder is for. */
  date: string;
  /** expo-notifications identifier (stable per date). */
  id: string;
};

function preferenceKey(uid?: string) {
  return `@mindpulse/evening-reminder-preference:${uid ?? 'guest'}`;
}
function enabledKey(uid?: string) {
  return `@mindpulse/evening-reminder-enabled:${uid ?? 'guest'}`;
}
function scheduledKey(uid?: string) {
  return `@mindpulse/evening-reminder-scheduled-window:${uid ?? 'guest'}`;
}
function offeredKey(uid?: string) {
  return `@mindpulse/evening-reminder-offered:${uid ?? 'guest'}`;
}
/** The date whose reminder was cancelled because the user already did an activity. */
function completedDateKey(uid?: string) {
  return `@mindpulse/evening-reminder-completed-date:${uid ?? 'guest'}`;
}

function notifIdForDate(date: string): string {
  return `${NOTIF_ID_PREFIX}${date}`;
}

export function isEveningReminderNotificationId(id: string): boolean {
  return id.startsWith(NOTIF_ID_PREFIX);
}

async function loadUserPreference(uid?: string): Promise<EveningReminderPreference> {
  try {
    const raw = await AsyncStorage.getItem(preferenceKey(uid));
    return raw
      ? (JSON.parse(raw) as EveningReminderPreference)
      : {
          preferredHour: DEFAULT_REMINDER_HOUR,
          preferredMinute: DEFAULT_REMINDER_MINUTE,
          customHoursEnabled: false,
        };
  } catch {
    return {
      preferredHour: DEFAULT_REMINDER_HOUR,
      preferredMinute: DEFAULT_REMINDER_MINUTE,
      customHoursEnabled: false,
    };
  }
}

export async function getEveningReminderPreference(
  uid?: string,
): Promise<EveningReminderPreference> {
  return loadUserPreference(uid);
}

async function saveUserPreference(
  uid: string | undefined,
  val: EveningReminderPreference,
): Promise<void> {
  try {
    await AsyncStorage.setItem(preferenceKey(uid), JSON.stringify(val));
  } catch {
    // ignore
  }
}

type NotificationsModule = typeof ExpoNotifications;

async function getNotifications(): Promise<NotificationsModule | null> {
  return ExpoNotifications;
}

async function setupChannel(N: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: N.AndroidImportance.DEFAULT,
  });
}

export async function hasOfferedEveningReminder(uid?: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(offeredKey(uid))) === '1';
  } catch {
    return false;
  }
}

export async function markEveningReminderOffered(uid?: string): Promise<void> {
  try {
    await AsyncStorage.setItem(offeredKey(uid), '1');
  } catch {
    // ignore
  }
}

export async function getEveningReminderEnabled(uid?: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(enabledKey(uid))) === 'true';
  } catch {
    return false;
  }
}

/** Only requests OS permission — never schedules. Call from an explicit user action. */
export async function requestEveningReminderPermission(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;
  trackEvent('notification_permission_requested', { source: 'evening_reminder' });
  const { status: existing } = await N.getPermissionsAsync();
  if (existing === 'granted') {
    trackEvent('notification_permission_granted', { source: 'evening_reminder', already: true });
    return true;
  }
  const { status } = await N.requestPermissionsAsync();
  const granted = status === 'granted';
  if (granted) trackEvent('notification_permission_granted', { source: 'evening_reminder' });
  return granted;
}

async function loadScheduledWindow(uid?: string): Promise<ScheduledDay[]> {
  try {
    const raw = await AsyncStorage.getItem(scheduledKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScheduledDay[];
    return Array.isArray(parsed) ? parsed.filter(d => d?.date && d?.id) : [];
  } catch {
    return [];
  }
}

async function saveScheduledWindow(uid: string | undefined, days: ScheduledDay[]): Promise<void> {
  try {
    await AsyncStorage.setItem(scheduledKey(uid), JSON.stringify(days));
  } catch {
    // ignore
  }
}

function fireAtForDate(dateISO: string, hour: number, minute: number): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

function copyForDate(dateISO: string): { title: string; body: string } {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dayOfYear = Math.floor(
    (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000,
  );
  return COPY[Math.abs(dayOfYear) % COPY.length];
}

/** Cancel every pending evening reminder and clear the window. */
export async function cancelAllEveningReminders(uid?: string): Promise<void> {
  const N = await getNotifications();
  const existing = await loadScheduledWindow(uid);
  if (N) {
    await Promise.all(
      existing.map(day =>
        N.cancelScheduledNotificationAsync(day.id).catch(() => undefined),
      ),
    );
    // Also cancel any orphaned ids matching our prefix (e.g. after migrate).
    try {
      const pending = await N.getAllScheduledNotificationsAsync();
      await Promise.all(
        pending
          .filter(n => isEveningReminderNotificationId(n.identifier))
          .map(n => N.cancelScheduledNotificationAsync(n.identifier).catch(() => undefined)),
      );
    } catch {
      // ignore
    }
  }
  await saveScheduledWindow(uid, []);
}

/**
 * Cancel only today's evening reminder (e.g. user completed their daily
 * activity). Upcoming days in the window are preserved.
 */
export async function cancelEveningReminderForDate(
  uid: string | undefined,
  dateISO: string,
): Promise<void> {
  // Remembered so the next refill doesn't schedule this date again.
  await AsyncStorage.setItem(completedDateKey(uid), dateISO).catch(() => undefined);

  const window = await loadScheduledWindow(uid);
  const target = window.find(d => d.date === dateISO);
  if (!target) return;

  const N = await getNotifications();
  if (N) {
    try {
      await N.cancelScheduledNotificationAsync(target.id);
    } catch {
      // already fired or cancelled
    }
  }
  await saveScheduledWindow(
    uid,
    window.filter(d => d.date !== dateISO),
  );
}

export async function setEveningReminderEnabled(
  uid: string | undefined,
  enabled: boolean,
): Promise<void> {
  try {
    await AsyncStorage.setItem(enabledKey(uid), enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
  if (!enabled) {
    trackEvent('reminder_disabled', { kind: 'evening' });
    await cancelAllEveningReminders(uid);
  } else {
    trackEvent('daily_reminder_enabled');
  }
}

/**
 * Ensures a rolling {@link EVENING_REMINDER_WINDOW_DAYS}-day window of
 * individual local DATE notifications is scheduled. Safe to call often —
 * duplicates are avoided via stable identifiers per date.
 *
 * - Skips past fire times for today.
 * - Never force-prompts for permission.
 * - Replaces the whole window when the preferred hour/minute changes
 *   (detected by re-scheduling with the same ids after cancel).
 */
export async function ensureEveningReminderScheduled(uid?: string): Promise<void> {
  const enabled = await getEveningReminderEnabled(uid);
  if (!enabled) return;

  const N = await getNotifications();
  if (!N) return;

  const { status } = await N.getPermissionsAsync();
  if (status !== 'granted') return;

  const preference = await loadUserPreference(uid);
  const hour = preference.customHoursEnabled
    ? preference.preferredHour
    : DEFAULT_REMINDER_HOUR;
  const minute = preference.customHoursEnabled
    ? preference.preferredMinute
    : DEFAULT_REMINDER_MINUTE;

  const now = new Date();
  const today = todayISO();
  const existing = await loadScheduledWindow(uid);
  const existingByDate = new Map(existing.map(d => [d.date, d]));
  const completedDate = await AsyncStorage.getItem(completedDateKey(uid)).catch(() => null);

  // Desired dates: today .. today+13, minus any day already completed or
  // whose slot has passed.
  const desiredDates: string[] = [];
  for (let i = 0; i < EVENING_REMINDER_WINDOW_DAYS; i++) {
    const date = addDaysISO(today, i);
    if (date === completedDate) continue;
    const fireAt = fireAtForDate(date, hour, minute);
    if (fireAt.getTime() <= now.getTime()) continue;
    desiredDates.push(date);
  }

  await setupChannel(N);

  // Cancel stale dates that fell out of the window or were already skipped.
  const desiredSet = new Set(desiredDates);
  const nextWindow: ScheduledDay[] = [];
  for (const day of existing) {
    if (!desiredSet.has(day.date)) {
      try {
        await N.cancelScheduledNotificationAsync(day.id);
      } catch {
        // ignore
      }
    }
  }

  for (const date of desiredDates) {
    const id = notifIdForDate(date);
    const fireAt = fireAtForDate(date, hour, minute);
    const copy = copyForDate(date);

    // Cancel + re-schedule so time preference changes always take effect
    // (stable id alone wouldn't update the trigger on all platforms).
    if (existingByDate.has(date)) {
      try {
        await N.cancelScheduledNotificationAsync(id);
      } catch {
        // ignore
      }
    }

    try {
      await N.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: copy.title,
          body: copy.body,
          data: {
            kind: 'evening-reminder',
            date,
            route: 'eye-break',
          },
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
      });
      nextWindow.push({ date, id });
    } catch {
      // Skip this day rather than failing the whole refill.
    }
  }

  await saveScheduledWindow(uid, nextWindow);
}

/**
 * Immediate test notification (~3s) so the user can verify permission + channel.
 * Does not count as a delivered daily reminder for analytics/retention.
 */
export async function testEveningReminder(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;

  const { status } = await N.getPermissionsAsync();
  if (status !== 'granted') return false;

  await setupChannel(N);
  const copy = COPY[0];
  try {
    await N.scheduleNotificationAsync({
      identifier: `${NOTIF_ID_PREFIX}test-${Date.now()}`,
      content: {
        title: copy.title,
        body: `${copy.body} (test)`,
        data: { kind: 'evening-reminder', route: 'eye-break', test: true },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Set preferred reminder time. Always enables custom hours when called from
 * the time picker. Refills the rolling window when reminders are already on.
 */
export async function setEveningReminderPreference(
  uid: string | undefined,
  hour: number,
  minute: number,
  customHoursEnabled: boolean,
): Promise<void> {
  await saveUserPreference(uid, {
    preferredHour: hour,
    preferredMinute: minute,
    customHoursEnabled,
  });
  const currentlyEnabled = await getEveningReminderEnabled(uid);
  if (currentlyEnabled) {
    await ensureEveningReminderScheduled(uid);
  }
}

/** Format HH:MM for UI preview. */
export function formatReminderTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}
