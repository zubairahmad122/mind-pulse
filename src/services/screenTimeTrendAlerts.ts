import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  getScreenTimeHistory,
  hasUsageAccess,
  isScreenUsageSupported,
} from './screenUsageService';
import {
  anyDayAtOrAboveMs,
  compareWeeklyAverages,
  HIGH_SCREEN_TIME_DAY_MS,
  weeklyAverageScreenTimeMs,
} from '@/utils/weeklyTrends';
import { formatScreenTimeMs } from '@/utils/screenUsageFormat';

/**
 * Weekly screen-time trend alert — Android only, requires both Screen
 * Balance's Usage Access permission (to read screen time at all) and
 * notification permission. Two independent triggers, checked together so
 * at most one notification fires per day:
 *  - a single day in the last 7 (today excluded — still partial) hit
 *    `HIGH_SCREEN_TIME_DAY_MS` (6h+)
 *  - this week's daily average is trending up vs last week's
 * "High day" takes priority when both are true in the same check — it's
 * the more specific, more actionable signal.
 */

const CHANNEL_ID = 'screen-time-trend-alert-v1';
const DAYS_NEEDED = 14; // two 7-day windows: this week + last week

function enabledKey(uid?: string) {
  return `@mindpulse/screen-time-alert-enabled:${uid ?? 'guest'}`;
}
function lastNotifiedKey(uid?: string) {
  return `@mindpulse/screen-time-alert-last-notified:${uid ?? 'guest'}`;
}

/** Local "YYYY-MM-DD" — matches every other Screen Balance date key. */
function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
    name: 'Screen time alerts',
    description: 'Weekly screen-time trend and high-usage-day alerts',
    importance: N.AndroidImportance.DEFAULT,
  });
}

export async function getScreenTimeAlertEnabled(uid?: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(enabledKey(uid))) === 'true';
  } catch {
    return false;
  }
}

/** Only requests OS permission — never schedules/checks. Call from an
 * explicit settings toggle, matching the evening-reminder convention. */
export async function requestScreenTimeAlertPermission(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;
  await setupChannel(N);
  const { status: existing } = await N.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await N.requestPermissionsAsync();
  return status === 'granted';
}

export async function setScreenTimeAlertEnabled(uid: string | undefined, enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(enabledKey(uid), enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

/**
 * Runs the two checks against fresh data and fires at most one notification
 * per calendar day. No-ops silently if: disabled, unsupported platform, no
 * Usage Access, no notification permission, already notified today, or
 * there isn't enough history yet to judge either trigger.
 */
export async function checkAndNotifyScreenTimeTrend(uid?: string): Promise<void> {
  if (!isScreenUsageSupported()) return;

  const enabled = await getScreenTimeAlertEnabled(uid);
  if (!enabled) return;

  const granted = await hasUsageAccess();
  if (!granted) return;

  const N = await getNotifications();
  if (!N) return;
  const { status } = await N.getPermissionsAsync();
  if (status !== 'granted') return;

  const today = localDateKey(new Date());
  const lastNotified = await AsyncStorage.getItem(lastNotifiedKey(uid)).catch(() => null);
  if (lastNotified === today) return;

  const history = await getScreenTimeHistory(DAYS_NEEDED);
  if (!history.hasPermission || history.days.length < DAYS_NEEDED) return;

  const previousWeek = history.days.slice(0, 7);
  const currentWeek = history.days.slice(7, 14);

  let title: string | null = null;
  let body: string | null = null;

  // Trigger 1 — a high-usage day (today excluded, still partial).
  if (anyDayAtOrAboveMs(currentWeek, HIGH_SCREEN_TIME_DAY_MS, today)) {
    title = '📱 A long day on your screen';
    body = `One of your recent days topped ${formatScreenTimeMs(HIGH_SCREEN_TIME_DAY_MS)} of screen time — maybe take a break today.`;
  } else {
    // Trigger 2 — week-over-week average trending up.
    const currentAvg = weeklyAverageScreenTimeMs(currentWeek);
    const previousAvg = weeklyAverageScreenTimeMs(previousWeek);
    if (currentAvg !== null && previousAvg !== null) {
      const direction = compareWeeklyAverages(currentAvg, previousAvg);
      if (direction === 'up') {
        title = '📈 Screen time is trending up';
        body = `Your daily average is ${formatScreenTimeMs(currentAvg)} this week, up from ${formatScreenTimeMs(previousAvg)} last week.`;
      }
    }
  }

  if (!title || !body) return;

  await setupChannel(N);
  await N.scheduleNotificationAsync({
    identifier: `screen-time-alert-${today}`,
    content: { title, body, ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}) },
    // 1-second interval, not a `DATE` trigger — this check already only
    // runs once/day (the `lastNotifiedKey` guard above), so "fire almost
    // immediately" is exactly what's wanted, matching how every other
    // near-term local notification in this app is scheduled.
    trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
  });
  await AsyncStorage.setItem(lastNotifiedKey(uid), today).catch(() => {});
}
