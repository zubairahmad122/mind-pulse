import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { todayISO } from '@/utils/dateUtils';

const CHANNEL_ID = 'evening-reminder-v1';
const REMINDER_HOUR = 19;
const REMINDER_MINUTE = 30;

/** Calm variants only — never "don't lose your streak" / guilt language. */
const COPY: { title: string; body: string }[] = [
  { title: '🌙 Your wellness streak is waiting', body: 'A couple of minutes is all it takes to keep today going.' },
  { title: '🌙 Still time today', body: 'One small session keeps your streak alive.' },
  { title: '🌙 A quiet moment for yourself', body: 'Your eyes, sleep, or mind could use a few minutes tonight.' },
];

type NotificationsModule = typeof import('expo-notifications');
let notifModule: NotificationsModule | null | undefined;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (notifModule !== undefined) return notifModule;
  try {
    notifModule = await import('expo-notifications');
    return notifModule;
  } catch {
    notifModule = null;
    return null;
  }
}

async function setupChannel(N: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: N.AndroidImportance.DEFAULT,
  });
}

function enabledKey(uid?: string) {
  return `@mindpulse/evening-reminder-enabled:${uid ?? 'guest'}`;
}
function scheduledKey(uid?: string) {
  return `@mindpulse/evening-reminder-scheduled:${uid ?? 'guest'}`;
}

interface ScheduledReminder {
  /** Local YYYY-MM-DD this notification was scheduled for — the guard that
   * limits the reminder to max 1/day. */
  date: string;
  id: string;
}

export async function getEveningReminderEnabled(uid?: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(enabledKey(uid))) === 'true';
  } catch {
    return false;
  }
}

/** Only requests OS permission — never schedules. Call before enabling, from
 * an explicit user toggle, matching the eye-break-reminder convention (never
 * force-prompt from a background sync). */
export async function requestEveningReminderPermission(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;
  const { status: existing } = await N.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await N.requestPermissionsAsync();
  return status === 'granted';
}

export async function setEveningReminderEnabled(uid: string | undefined, enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(enabledKey(uid), enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
  if (!enabled) await cancelEveningReminder(uid);
}

async function loadScheduled(uid?: string): Promise<ScheduledReminder | null> {
  try {
    const raw = await AsyncStorage.getItem(scheduledKey(uid));
    return raw ? (JSON.parse(raw) as ScheduledReminder) : null;
  } catch {
    return null;
  }
}

async function saveScheduled(uid: string | undefined, val: ScheduledReminder | null): Promise<void> {
  try {
    if (val) await AsyncStorage.setItem(scheduledKey(uid), JSON.stringify(val));
    else await AsyncStorage.removeItem(scheduledKey(uid));
  } catch {
    // ignore
  }
}

/** Cancels any pending reminder — call the moment today's goal is done, or
 * when the user disables the setting. Safe to call even if nothing is
 * scheduled. */
export async function cancelEveningReminder(uid?: string): Promise<void> {
  const scheduled = await loadScheduled(uid);
  if (scheduled) {
    const N = await getNotifications();
    if (N) {
      try {
        await N.cancelScheduledNotificationAsync(scheduled.id);
      } catch {
        // already fired or cancelled
      }
    }
  }
  await saveScheduled(uid, null);
}

/**
 * Ensures today's reminder is scheduled. No-ops if: already scheduled for
 * today (max 1/day), the setting is off, permission isn't already granted
 * (this never force-prompts — permission is only ever requested from the
 * explicit settings toggle), or today's reminder slot has already passed.
 */
export async function ensureEveningReminderScheduled(uid?: string): Promise<void> {
  const today = todayISO();
  const existing = await loadScheduled(uid);
  if (existing?.date === today) return;

  const enabled = await getEveningReminderEnabled(uid);
  if (!enabled) return;

  const N = await getNotifications();
  if (!N) return;

  const { status } = await N.getPermissionsAsync();
  if (status !== 'granted') return;

  const now = new Date();
  const fireAt = new Date(now);
  fireAt.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  if (fireAt.getTime() <= now.getTime()) return; // past today's slot — next check will try tomorrow

  await setupChannel(N);

  const copy = COPY[Math.floor(Math.random() * COPY.length)];
  const id = await N.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });

  await saveScheduled(uid, { date: today, id });
}
