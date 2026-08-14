import { Platform } from 'react-native';
import {
  getNativeSmartResetReminderStatus,
  setNativeSmartResetLastResetCompletedAt,
  setNativeSmartResetRemindersEnabled,
} from './screenUsageService';
import { loadScreenBalanceStats } from './screenBalancePersistence';

const SMART_RESET_CHANNEL_ID = 'screen-balance-smart-reset-v1';

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
  await N.setNotificationChannelAsync(SMART_RESET_CHANNEL_ID, {
    name: 'Smart Reset reminders',
    description: 'Gentle Screen Balance reset reminders',
    importance: N.AndroidImportance.DEFAULT,
  });
}

export async function requestSmartResetNotificationPermission(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;
  await setupChannel(N);
  const { status: existing } = await N.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await N.requestPermissionsAsync();
  return status === 'granted';
}

export async function getSmartResetRemindersSetting() {
  return getNativeSmartResetReminderStatus();
}

export async function setSmartResetRemindersSetting(
  uid: string | undefined,
  enabled: boolean,
): Promise<boolean> {
  if (!enabled) {
    await setNativeSmartResetRemindersEnabled(false, null);
    return false;
  }

  const granted = await requestSmartResetNotificationPermission();
  if (!granted) {
    await setNativeSmartResetRemindersEnabled(false, null);
    return false;
  }

  const stats = await loadScreenBalanceStats(uid);
  const status = await setNativeSmartResetRemindersEnabled(true, stats.lastResetCompletedAt);
  return Boolean(status?.enabled && status.notificationsGranted);
}

export async function ensureSmartResetReminderSchedule(uid?: string): Promise<void> {
  const status = await getNativeSmartResetReminderStatus();
  if (!status?.enabled || !status.notificationsGranted) return;
  const stats = await loadScreenBalanceStats(uid);
  await setNativeSmartResetRemindersEnabled(true, stats.lastResetCompletedAt);
}

export async function syncSmartResetLastResetCompletedAt(
  timestampMs?: number | null,
): Promise<void> {
  await setNativeSmartResetLastResetCompletedAt(timestampMs ?? null);
}
