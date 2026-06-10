import { Platform } from 'react-native';
import {
  clearEyeBreakNotifId,
  loadEyeBreakNotifId,
  saveEyeBreakNotifId,
} from './eyeProgressPersistence';

const EYE_BREAK_CHANNEL_ID = 'eye-break-reminders-v1';
export const EYE_BREAK_NOTIF_PREFIX = 'eye-break-';
const INTERVAL_SECONDS = 1200; // 20 minutes

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
  await N.setNotificationChannelAsync(EYE_BREAK_CHANNEL_ID, {
    name: '20-20-20 Eye Breaks',
    importance: N.AndroidImportance.HIGH,
    vibrationPattern: [0, 300],
    enableVibrate: true,
  });
}

export async function scheduleEyeBreakReminders(uid?: string): Promise<void> {
  const N = await getNotifications();
  if (!N) return;

  await setupChannel(N);

  const { status: existing } = await N.getPermissionsAsync();
  let granted = existing === 'granted';
  if (!granted) {
    const { status } = await N.requestPermissionsAsync();
    granted = status === 'granted';
  }
  if (!granted) return;

  await cancelEyeBreakReminders(uid);

  const id = await N.scheduleNotificationAsync({
    identifier: `${EYE_BREAK_NOTIF_PREFIX}${Date.now()}`,
    content: {
      title: 'Time to rest your eyes',
      body: 'Look 20 feet away for 20 seconds. Tap for a guided break.',
      ...(Platform.OS === 'android' ? { channelId: EYE_BREAK_CHANNEL_ID } : {}),
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: INTERVAL_SECONDS,
      repeats: true,
    },
  });

  await saveEyeBreakNotifId(uid, id);
}

export async function cancelEyeBreakReminders(uid?: string): Promise<void> {
  const N = await getNotifications();
  const id = await loadEyeBreakNotifId(uid);
  if (id && N) {
    try {
      await N.cancelScheduledNotificationAsync(id);
    } catch {
      // already cancelled
    }
  }
  await clearEyeBreakNotifId(uid);
}
