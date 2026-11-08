import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  getScreenUsageSnapshot,
  hasUsageAccess,
  isScreenUsageSupported,
} from './screenUsageService';
import { todayISO } from '@/utils/dateUtils';
import { trackEvent } from './analytics';
import { isEyeBreakActive } from './activeEyeBreak';
import {
  getDigitalSunsetWindow,
  loadDigitalSunsetSettings,
} from './digitalSunset';
import { loadCachedSleepSchedule } from './sleepSchedulePersistence';

/**
 * Proactive usage alerts using Android Usage Access when available.
 * iOS has no equivalent public API for device-wide screen time — these
 * checks no-op there (and on Android without Usage Access).
 */

export const LONG_SESSION_USAGE_NOTIF_PREFIX = 'usage-long-session-';
export const HIGH_DAILY_USAGE_NOTIF_PREFIX = 'usage-high-daily-';

const CHANNEL_ID = 'excessive-usage-alerts-v1';
/** Continuous screen-on session threshold (matches product brief). */
export const LONG_SESSION_MS = 60 * 60 * 1000;
/** Cooldown between long-session alerts. */
export const LONG_SESSION_COOLDOWN_MS = 90 * 60 * 1000;
export const DEFAULT_DAILY_LIMIT_HOURS = 4;
export const DAILY_LIMIT_OPTIONS = [2, 3, 4, 5, 6] as const;
export type DailyLimitHours = (typeof DAILY_LIMIT_OPTIONS)[number];

function dailyLimitKey(uid?: string) {
  return `@mindpulse/daily-screen-limit-hours:${uid ?? 'guest'}`;
}
function longSessionNotifiedKey(uid?: string) {
  return `@mindpulse/usage-long-session-last-at:${uid ?? 'guest'}`;
}
function highDailyNotifiedKey(uid?: string) {
  return `@mindpulse/usage-high-daily-last-date:${uid ?? 'guest'}`;
}
function alertsEnabledKey(uid?: string) {
  return `@mindpulse/excessive-usage-alerts-enabled:${uid ?? 'guest'}`;
}

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
    name: 'Usage break reminders',
    description: 'Gentle reminders when screen time is high',
    importance: N.AndroidImportance.DEFAULT,
  });
}

export async function getExcessiveUsageAlertsEnabled(uid?: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(alertsEnabledKey(uid));
    // Default ON once Usage Access is granted — users can turn off in settings.
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export async function setExcessiveUsageAlertsEnabled(
  uid: string | undefined,
  enabled: boolean,
): Promise<void> {
  try {
    await AsyncStorage.setItem(alertsEnabledKey(uid), enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export async function getDailyScreenLimitHours(uid?: string): Promise<DailyLimitHours> {
  try {
    const raw = await AsyncStorage.getItem(dailyLimitKey(uid));
    const n = raw ? Number(raw) : DEFAULT_DAILY_LIMIT_HOURS;
    return (DAILY_LIMIT_OPTIONS as readonly number[]).includes(n)
      ? (n as DailyLimitHours)
      : DEFAULT_DAILY_LIMIT_HOURS;
  } catch {
    return DEFAULT_DAILY_LIMIT_HOURS;
  }
}

export async function setDailyScreenLimitHours(
  uid: string | undefined,
  hours: DailyLimitHours,
): Promise<void> {
  try {
    await AsyncStorage.setItem(dailyLimitKey(uid), String(hours));
  } catch {
    // ignore
  }
}

async function isInQuietHours(uid?: string): Promise<boolean> {
  try {
    const settings = await loadDigitalSunsetSettings(uid);
    if (!settings.digitalSunsetEnabled) return false;
    const schedule = await loadCachedSleepSchedule(uid);
    const window = getDigitalSunsetWindow(
      new Date(),
      schedule.bedtime,
      settings.digitalSunsetOffsetMinutes,
    );
    return window.active;
  } catch {
    return false;
  }
}

/**
 * Live check on app foreground. Fires at most one of:
 * - long continuous session (≥60 min), with 90 min cooldown
 * - high daily cumulative screen time (≥ user limit), once per day
 *
 * Never claims delivery for trend-style history alerts — those live in
 * screenTimeTrendAlerts.ts.
 */
export async function checkAndNotifyExcessiveUsage(uid?: string): Promise<void> {
  if (!isScreenUsageSupported()) return;
  if (!(await getExcessiveUsageAlertsEnabled(uid))) return;
  if (!(await hasUsageAccess())) return;
  if (isEyeBreakActive()) return;
  if (await isInQuietHours(uid)) return;

  const N = await getNotifications();
  if (!N) return;
  const { status } = await N.getPermissionsAsync();
  if (status !== 'granted') return;

  const snapshot = await getScreenUsageSnapshot();
  if (!snapshot.hasPermission) return;

  const now = Date.now();
  const today = todayISO();

  // A — Long uninterrupted session
  if (
    snapshot.currentSessionAvailable &&
    typeof snapshot.currentSessionMs === 'number' &&
    snapshot.currentSessionMs >= LONG_SESSION_MS
  ) {
    const lastRaw = await AsyncStorage.getItem(longSessionNotifiedKey(uid)).catch(() => null);
    const lastAt = lastRaw ? Number(lastRaw) : 0;
    if (!lastAt || now - lastAt >= LONG_SESSION_COOLDOWN_MS) {
      await setupChannel(N);
      await N.scheduleNotificationAsync({
        identifier: `${LONG_SESSION_USAGE_NOTIF_PREFIX}${now}`,
        content: {
          title: 'Your screen time is adding up',
          body: "You've been using your phone for a while. Take a little break and give your eyes some rest.",
          data: { kind: 'usage-long-session', route: 'eye-break' },
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
      });
      await AsyncStorage.setItem(longSessionNotifiedKey(uid), String(now)).catch(() => {});
      trackEvent('usage_alert_scheduled', { kind: 'long_session' });
      return; // one alert per check
    }
  }

  // B — High daily cumulative screen time
  const limitHours = await getDailyScreenLimitHours(uid);
  const limitMs = limitHours * 60 * 60 * 1000;
  if (
    typeof snapshot.screenTimeTodayMs === 'number' &&
    snapshot.screenTimeTodayMs >= limitMs
  ) {
    const lastDate = await AsyncStorage.getItem(highDailyNotifiedKey(uid)).catch(() => null);
    if (lastDate === today) return;

    await setupChannel(N);
    await N.scheduleNotificationAsync({
      identifier: `${HIGH_DAILY_USAGE_NOTIF_PREFIX}${today}`,
      content: {
        title: 'Time for a digital break',
        body: `You've spent quite a bit of time on your phone today (over ${limitHours}h). Step away and recharge.`,
        data: { kind: 'usage-high-daily', route: 'screen-balance' },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
    await AsyncStorage.setItem(highDailyNotifiedKey(uid), today).catch(() => {});
    trackEvent('usage_alert_scheduled', { kind: 'high_daily', limit_hours: limitHours });
  }
}
