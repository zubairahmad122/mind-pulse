import { Platform } from 'react-native';
import {
  clearEyeBreakNotifId,
  loadEyeBreakNotifId,
  saveEyeBreakNotifId,
} from './eyeProgressPersistence';
import {
  DEFAULT_EYE_BREAK_INTERVAL,
  type EyeBreakIntervalMinutes,
  type EyeBreakSchedule,
  DEFAULT_EYE_BREAK_SCHEDULE,
} from './eyeBreakReminderPreferences';
import { buildEyeBreakReminderDates } from '@/utils/eyeBreakSchedule';

const EYE_BREAK_CHANNEL_ID = 'eye-break-reminders-v1';
const EYE_BREAK_CATEGORY_ID = 'eyebreakreminder';
export const EYE_BREAK_SNOOZE_ACTION = 'SNOOZE_EYE_BREAK';
export const EYE_BREAK_NOTIF_PREFIX = 'eye-break-';
export const EYE_BREAK_SNOOZE_PREFIX = 'eye-break-snooze-';
const SNOOZE_SECONDS = 10 * 60;
type NotificationsModule = typeof import('expo-notifications');
let notifModule: NotificationsModule | null | undefined;

function isRegularEyeBreakNotification(identifier: string): boolean {
  return identifier.startsWith(EYE_BREAK_NOTIF_PREFIX)
    && !identifier.startsWith(EYE_BREAK_SNOOZE_PREFIX);
}

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
  await N.setNotificationChannelAsync(EYE_BREAK_CHANNEL_ID, {
    name: '20-20-20 Eye Breaks',
    importance: N.AndroidImportance.HIGH,
    vibrationPattern: [0, 300],
    enableVibrate: true,
  });
}

async function setupCategory(N: NotificationsModule): Promise<void> {
  await N.setNotificationCategoryAsync(EYE_BREAK_CATEGORY_ID, [
    {
      identifier: EYE_BREAK_SNOOZE_ACTION,
      buttonTitle: 'Snooze 10 min',
      options: {
        opensAppToForeground: true,
        isAuthenticationRequired: false,
        isDestructive: false,
      },
    },
  ]);
}

function reminderContent(
  intervalMinutes?: EyeBreakIntervalMinutes,
): import('expo-notifications').NotificationContentInput {
  return {
    title: 'Time to rest your eyes',
    body: 'Look 20 feet away for 20 seconds. Tap for a guided break.',
    categoryIdentifier: EYE_BREAK_CATEGORY_ID,
    data: {
      kind: 'eye-break',
      ...(intervalMinutes ? { intervalMinutes } : {}),
    },
    ...(Platform.OS === 'android' ? { channelId: EYE_BREAK_CHANNEL_ID } : {}),
  };
}

export async function scheduleEyeBreakReminders(
  uid?: string,
  intervalMinutes: EyeBreakIntervalMinutes = DEFAULT_EYE_BREAK_INTERVAL,
  requestPermission = true,
  schedule: EyeBreakSchedule = DEFAULT_EYE_BREAK_SCHEDULE,
): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;

  await setupChannel(N);
  await setupCategory(N);

  const { status: existing } = await N.getPermissionsAsync();
  let granted = existing === 'granted';
  if (!granted && requestPermission) {
    const { status } = await N.requestPermissionsAsync();
    granted = status === 'granted';
  }
  if (!granted) return false;

  await cancelEyeBreakReminders(uid);

  const dates = buildEyeBreakReminderDates(new Date(), intervalMinutes, schedule);
  const ids: string[] = [];
  if (schedule.mode === 'anytime') {
    ids.push(await N.scheduleNotificationAsync({
      identifier: `${EYE_BREAK_NOTIF_PREFIX}${Date.now()}`,
      content: reminderContent(intervalMinutes),
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: intervalMinutes * 60,
        repeats: true,
      },
    }));
  } else {
    for (const [index, date] of dates.entries()) {
      ids.push(await N.scheduleNotificationAsync({
        identifier: `${EYE_BREAK_NOTIF_PREFIX}${Date.now()}-${index}`,
        content: reminderContent(intervalMinutes),
        trigger: {
          type: N.SchedulableTriggerInputTypes.DATE,
          date,
        },
      }));
    }
  }

  if (!ids.length) return false;
  await saveEyeBreakNotifId(uid, ids[0]);
  return true;
}

export async function scheduleEyeBreakSnooze(): Promise<string | null> {
  const N = await getNotifications();
  if (!N) return null;

  await setupChannel(N);
  await setupCategory(N);
  const { status } = await N.getPermissionsAsync();
  if (status !== 'granted') return null;

  return N.scheduleNotificationAsync({
    identifier: `${EYE_BREAK_SNOOZE_PREFIX}${Date.now()}`,
    content: reminderContent(),
    trigger: {
      type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: SNOOZE_SECONDS,
    },
  });
}

export async function ensureEyeBreakRemindersScheduled(
  uid: string | undefined,
  intervalMinutes: EyeBreakIntervalMinutes,
  schedule: EyeBreakSchedule = DEFAULT_EYE_BREAK_SCHEDULE,
): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;

  const savedId = await loadEyeBreakNotifId(uid);
  if (savedId) {
    try {
      const scheduled = await N.getAllScheduledNotificationsAsync();
      if (scheduled.some(request =>
        request.identifier === savedId
        || isRegularEyeBreakNotification(request.identifier)
      )) return true;
    } catch {
      return false;
    }
  }

  return scheduleEyeBreakReminders(uid, intervalMinutes, false, schedule);
}

export async function cancelEyeBreakReminders(uid?: string): Promise<void> {
  const N = await getNotifications();
  const id = await loadEyeBreakNotifId(uid);
  if (N) {
    try {
      const scheduled = await N.getAllScheduledNotificationsAsync();
      const ids = scheduled
        .map(request => request.identifier)
        .filter(identifier =>
          identifier === id || isRegularEyeBreakNotification(identifier)
        );
      await Promise.all(ids.map(identifier =>
        N.cancelScheduledNotificationAsync(identifier)
      ));
    } catch {
      // already cancelled
    }
  }
  await clearEyeBreakNotifId(uid);
}
