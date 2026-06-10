import { Platform } from 'react-native';
import type { SleepAlarmSupport } from '@/types/alarm.types';
import { requestAllAlarmPermissions } from './alarmPermissions';
import { getNativeAlarmModule } from './nativeAlarm';

const ALARM_SOUND = 'alarm.wav';
const NOTIFICATION_CHANNEL_ID = 'sleep-wake-alarms-ringing-v3';
const MIN_ALARM_MS = 5_000;
const MIN_TEST_ALARM_MS = 2_000;

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    const mod = await import('expo-notifications');
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationsModule = mod;
    return mod;
  } catch {
    notificationsModule = null;
    return null;
  }
}

async function setupNotificationChannel(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'Sleep wake alarms',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 700, 250, 700, 250, 1200],
    sound: ALARM_SOUND,
    enableVibrate: true,
  });
}

export async function getSleepAlarmSupport(): Promise<SleepAlarmSupport> {
  const native = getNativeAlarmModule();
  if (native) {
    const status = await native.getPermissionStatus();
    return status.ready ? 'granted' : 'denied';
  }

  const Notifications = await getNotifications();
  if (!Notifications) return 'unavailable';

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') {
    await setupNotificationChannel(Notifications);
    return 'granted';
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') {
    await setupNotificationChannel(Notifications);
    return 'granted';
  }
  return 'denied';
}

/** Request system permissions if needed; returns updated support level. */
export async function prepareAlarmPermissions(): Promise<SleepAlarmSupport> {
  let support = await getSleepAlarmSupport();
  if (support === 'denied') {
    await requestAllAlarmPermissions();
    support = await getSleepAlarmSupport();
  }
  return support;
}

export async function stopAlarmRinging(): Promise<void> {
  await getNativeAlarmModule()?.stopRinging().catch(() => undefined);
}

export async function cancelSleepAlarms(): Promise<void> {
  await getNativeAlarmModule()?.cancelAlarm().catch(() => undefined);

  const Notifications = await getNotifications();
  if (Notifications) {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export async function scheduleWakeAlarm(
  wakeAt: Date,
  label: string,
  options?: { isTest?: boolean },
): Promise<string | null> {
  const msUntil = wakeAt.getTime() - Date.now();
  const minMs = options?.isTest ? MIN_TEST_ALARM_MS : MIN_ALARM_MS;
  if (msUntil < minMs) return null;

  const native = getNativeAlarmModule();
  if (native) {
    await cancelSleepAlarms();
    try {
      return await native.scheduleAlarm(wakeAt.getTime(), label);
    } catch {
      return null;
    }
  }

  const Notifications = await getNotifications();
  if (!Notifications) return null;

  await cancelSleepAlarms();
  await setupNotificationChannel(Notifications);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to wake up',
      body: label,
      sound: ALARM_SOUND,
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: wakeAt,
    },
  });
}

export async function scheduleTestWakeAlarm(delaySeconds: number): Promise<string | null> {
  const sec = Math.max(3, Math.round(delaySeconds));
  const wakeAt = new Date(Date.now() + sec * 1000);
  return scheduleWakeAlarm(wakeAt, `Test alarm — rings in ${sec}s`, { isTest: true });
}

export function formatWakeTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
