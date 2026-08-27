import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';
import { loadCachedSleepSchedule } from './sleepSchedulePersistence';
import type { SleepSchedule } from '@/types/sleep.types';

export const DIGITAL_SUNSET_NOTIFICATION_PREFIX = 'digital-sunset-';
export const DIGITAL_SUNSET_CHANNEL_ID = 'digital-sunset-v1';
export const DIGITAL_SUNSET_OFFSET_OPTIONS = [30, 60] as const;
export const DEFAULT_DIGITAL_SUNSET_OFFSET_MINUTES = 60;
export const DIGITAL_SUNSET_RECENT_NOTIFICATION_MS = 90 * 60 * 1000;

export type DigitalSunsetOffsetMinutes = (typeof DIGITAL_SUNSET_OFFSET_OPTIONS)[number];

export interface DigitalSunsetSettings {
  version: 1;
  digitalSunsetEnabled: boolean;
  digitalSunsetOffsetMinutes: DigitalSunsetOffsetMinutes;
  lastScheduledFor: string | null;
  lastNotificationId: string | null;
  lastOpenedAt: number | null;
  lastNotificationScheduledAt: number | null;
}

export interface DigitalSunsetWindow {
  bedtimeAt: Date;
  startsAt: Date;
  nextStartsAt: Date;
  active: boolean;
  minutesUntilBedtime: number | null;
}

export interface DigitalSunsetSummary {
  settings: DigitalSunsetSettings;
  schedule: SleepSchedule;
  window: DigitalSunsetWindow;
  notificationsGranted: boolean;
}

type NotificationsModule = typeof ExpoNotifications;

const DEFAULT_SETTINGS: DigitalSunsetSettings = {
  version: 1,
  digitalSunsetEnabled: false,
  digitalSunsetOffsetMinutes: DEFAULT_DIGITAL_SUNSET_OFFSET_MINUTES,
  lastScheduledFor: null,
  lastNotificationId: null,
  lastOpenedAt: null,
  lastNotificationScheduledAt: null,
};

function settingsKey(uid?: string): string {
  return `@mindpulse/digital-sunset:${uid ?? 'guest'}`;
}

async function getNotifications(): Promise<NotificationsModule | null> {
  return ExpoNotifications;
}

async function setupChannel(N: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(DIGITAL_SUNSET_CHANNEL_ID, {
    name: 'Digital Sunset',
    description: 'Bedtime wind-down reminders',
    importance: N.AndroidImportance.DEFAULT,
  });
}

export function coerceDigitalSunsetOffset(value: unknown): DigitalSunsetOffsetMinutes {
  return value === 30 ? 30 : DEFAULT_DIGITAL_SUNSET_OFFSET_MINUTES;
}

export function parseHHMM(value: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function formatHHMMForDisplay(value: string): string {
  const parsed = parseHHMM(value);
  if (!parsed) return '—';
  const hour12 = parsed.hour === 0 ? 12 : parsed.hour > 12 ? parsed.hour - 12 : parsed.hour;
  const suffix = parsed.hour < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(parsed.minute).padStart(2, '0')} ${suffix}`;
}

export function formatDateTimeForDisplay(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function localDateAt(base: Date, dayOffset: number, hour: number, minute: number): Date {
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + dayOffset,
    hour,
    minute,
    0,
    0,
  );
}

export function getDigitalSunsetStartForBedtime(bedtimeAt: Date, offsetMinutes: number): Date {
  return new Date(bedtimeAt.getTime() - offsetMinutes * 60_000);
}

export function getDigitalSunsetWindow(
  now: Date,
  bedtimeHHMM: string,
  offsetMinutes: number,
): DigitalSunsetWindow {
  const parsed = parseHHMM(bedtimeHHMM) ?? { hour: 23, minute: 0 };
  const candidates = [-1, 0, 1, 2].map(dayOffset => {
    const bedtimeAt = localDateAt(now, dayOffset, parsed.hour, parsed.minute);
    return {
      bedtimeAt,
      startsAt: getDigitalSunsetStartForBedtime(bedtimeAt, offsetMinutes),
    };
  });

  const active = candidates.find(
    candidate => now.getTime() >= candidate.startsAt.getTime() && now.getTime() < candidate.bedtimeAt.getTime(),
  );

  const future = candidates
    .filter(candidate => candidate.startsAt.getTime() > now.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

  const currentOrNext = active ?? future ?? candidates[candidates.length - 1];

  return {
    bedtimeAt: currentOrNext.bedtimeAt,
    startsAt: currentOrNext.startsAt,
    nextStartsAt: future?.startsAt ?? currentOrNext.startsAt,
    active: Boolean(active),
    minutesUntilBedtime: active
      ? Math.max(0, Math.ceil((currentOrNext.bedtimeAt.getTime() - now.getTime()) / 60_000))
      : null,
  };
}

export function normalizeDigitalSunsetSettings(raw: unknown): DigitalSunsetSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const data = raw as Partial<DigitalSunsetSettings>;
  return {
    version: 1,
    digitalSunsetEnabled: Boolean(data.digitalSunsetEnabled),
    digitalSunsetOffsetMinutes: coerceDigitalSunsetOffset(data.digitalSunsetOffsetMinutes),
    lastScheduledFor: typeof data.lastScheduledFor === 'string' ? data.lastScheduledFor : null,
    lastNotificationId: typeof data.lastNotificationId === 'string' ? data.lastNotificationId : null,
    lastOpenedAt: typeof data.lastOpenedAt === 'number' ? data.lastOpenedAt : null,
    lastNotificationScheduledAt:
      typeof data.lastNotificationScheduledAt === 'number' ? data.lastNotificationScheduledAt : null,
  };
}

export async function loadDigitalSunsetSettings(uid?: string): Promise<DigitalSunsetSettings> {
  try {
    const raw = await AsyncStorage.getItem(settingsKey(uid));
    return raw ? normalizeDigitalSunsetSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function saveDigitalSunsetSettings(
  uid: string | undefined,
  settings: DigitalSunsetSettings,
): Promise<DigitalSunsetSettings> {
  await AsyncStorage.setItem(settingsKey(uid), JSON.stringify(settings));
  return settings;
}

export async function getDigitalSunsetNotificationsGranted(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;
  const { status } = await N.getPermissionsAsync();
  return status === 'granted';
}

export async function requestDigitalSunsetNotificationPermission(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;
  await setupChannel(N);
  const { status: existing } = await N.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await N.requestPermissionsAsync();
  return status === 'granted';
}

export function digitalSunsetScheduleSignature(
  bedtimeHHMM: string,
  offsetMinutes: DigitalSunsetOffsetMinutes,
): string {
  return `${bedtimeHHMM}:${offsetMinutes}`;
}

export async function cancelDigitalSunsetReminder(uid?: string): Promise<void> {
  const current = await loadDigitalSunsetSettings(uid);
  if (current.lastNotificationId) {
    const N = await getNotifications();
    if (N) {
      try {
        await N.cancelScheduledNotificationAsync(current.lastNotificationId);
      } catch {
        // Notification may already have fired or been removed by the OS.
      }
    }
  }
  await saveDigitalSunsetSettings(uid, {
    ...current,
    lastScheduledFor: null,
    lastNotificationId: null,
    lastNotificationScheduledAt: null,
  });
}

export async function ensureDigitalSunsetScheduled(
  uid?: string,
  sleepSchedule?: SleepSchedule | null,
): Promise<void> {
  const settings = await loadDigitalSunsetSettings(uid);
  if (!settings.digitalSunsetEnabled) {
    await cancelDigitalSunsetReminder(uid);
    return;
  }

  const N = await getNotifications();
  if (!N) return;
  const { status } = await N.getPermissionsAsync();
  if (status !== 'granted') {
    await cancelDigitalSunsetReminder(uid);
    return;
  }

  const schedule = sleepSchedule ?? await loadCachedSleepSchedule(uid);
  const parsed = parseHHMM(schedule.bedtime);
  if (!parsed) {
    await cancelDigitalSunsetReminder(uid);
    return;
  }

  const startMinutes = (((parsed.hour * 60 + parsed.minute - settings.digitalSunsetOffsetMinutes) % 1440) + 1440) % 1440;
  const hour = Math.floor(startMinutes / 60);
  const minute = startMinutes % 60;
  const signature = digitalSunsetScheduleSignature(schedule.bedtime, settings.digitalSunsetOffsetMinutes);
  if (settings.lastScheduledFor === signature && settings.lastNotificationId) return;

  if (settings.lastNotificationId) {
    try {
      await N.cancelScheduledNotificationAsync(settings.lastNotificationId);
    } catch {
      // Already gone.
    }
  }

  await setupChannel(N);
  const id = await N.scheduleNotificationAsync({
    identifier: `${DIGITAL_SUNSET_NOTIFICATION_PREFIX}${signature}`,
    content: {
      title: 'Time to wind down',
      body: "Your Digital Sunset has started. Step away from the screen when you're ready.",
      data: { type: 'digital-sunset' },
      ...(Platform.OS === 'android' ? { channelId: DIGITAL_SUNSET_CHANNEL_ID } : {}),
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  await saveDigitalSunsetSettings(uid, {
    ...settings,
    lastScheduledFor: signature,
    lastNotificationId: id,
    lastNotificationScheduledAt: Date.now(),
  });
}

export async function setDigitalSunsetEnabled(
  uid: string | undefined,
  enabled: boolean,
  sleepSchedule?: SleepSchedule | null,
): Promise<boolean> {
  const current = await loadDigitalSunsetSettings(uid);
  if (!enabled) {
    await saveDigitalSunsetSettings(uid, { ...current, digitalSunsetEnabled: false });
    await cancelDigitalSunsetReminder(uid);
    return false;
  }

  const granted = await requestDigitalSunsetNotificationPermission();
  if (!granted) {
    await saveDigitalSunsetSettings(uid, { ...current, digitalSunsetEnabled: false });
    await cancelDigitalSunsetReminder(uid);
    return false;
  }

  await saveDigitalSunsetSettings(uid, { ...current, digitalSunsetEnabled: true });
  await ensureDigitalSunsetScheduled(uid, sleepSchedule);
  return true;
}

export async function setDigitalSunsetOffset(
  uid: string | undefined,
  offsetMinutes: DigitalSunsetOffsetMinutes,
  sleepSchedule?: SleepSchedule | null,
): Promise<DigitalSunsetSettings> {
  const current = await loadDigitalSunsetSettings(uid);
  const next = await saveDigitalSunsetSettings(uid, {
    ...current,
    digitalSunsetOffsetMinutes: offsetMinutes,
    lastScheduledFor: null,
  });
  await ensureDigitalSunsetScheduled(uid, sleepSchedule);
  return next;
}

export async function markDigitalSunsetOpened(uid?: string): Promise<void> {
  const current = await loadDigitalSunsetSettings(uid);
  await saveDigitalSunsetSettings(uid, { ...current, lastOpenedAt: Date.now() });
}

export async function wasDigitalSunsetNotificationRecentlyScheduled(uid?: string): Promise<boolean> {
  const current = await loadDigitalSunsetSettings(uid);
  return Boolean(
    current.lastNotificationScheduledAt &&
      Date.now() - current.lastNotificationScheduledAt < DIGITAL_SUNSET_RECENT_NOTIFICATION_MS,
  );
}

export async function loadDigitalSunsetSummary(
  uid?: string,
  sleepSchedule?: SleepSchedule | null,
  now: Date = new Date(),
): Promise<DigitalSunsetSummary> {
  const [settings, schedule, notificationsGranted] = await Promise.all([
    loadDigitalSunsetSettings(uid),
    sleepSchedule ? Promise.resolve(sleepSchedule) : loadCachedSleepSchedule(uid),
    getDigitalSunsetNotificationsGranted(),
  ]);
  return {
    settings,
    schedule,
    notificationsGranted,
    window: getDigitalSunsetWindow(now, schedule.bedtime, settings.digitalSunsetOffsetMinutes),
  };
}
