import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { ScreenSessionContext } from './eyeScreenHabitPersistence';

export type CompanionBreakSeconds = 20 | 60 | 120 | 300;

export interface DesktopCompanionPrefs {
  /** Resolved reminder interval in minutes (a preset, or the custom value). */
  intervalMinutes: number;
  /** True when the custom stepper is active instead of a preset. */
  custom: boolean;
  /** Custom interval, 10–180 minutes. */
  customMinutes: number;
  /** How long the guided break lasts. */
  breakSeconds: number;
  soundOn: boolean;
  vibrationOn: boolean;
  /** Repeat the reminder every interval until the session ends. */
  repeatOn: boolean;
  /** "Remind me again after" minutes on the notification action. */
  snoozeMinutes: number;
  /** Last activity chosen at session start — reused next time. */
  lastActivity: ScreenSessionContext | null;
}

export const COMPANION_INTERVAL_PRESETS = [20, 30, 45, 60, 90] as const;
export const COMPANION_BREAK_OPTIONS: CompanionBreakSeconds[] = [20, 60, 120, 300];
export const COMPANION_SNOOZE_OPTIONS = [5, 10, 15] as const;
export const CUSTOM_MIN_MINUTES = 10;
export const CUSTOM_MAX_MINUTES = 180;

export const DEFAULT_COMPANION_PREFS: DesktopCompanionPrefs = {
  intervalMinutes: 20,
  custom: false,
  customMinutes: 40,
  breakSeconds: 20,
  soundOn: true,
  vibrationOn: true,
  repeatOn: false,
  snoozeMinutes: 5,
  lastActivity: null,
};

/** The interval the session actually runs on (preset or custom, clamped). */
export function companionIntervalMinutes(prefs: DesktopCompanionPrefs): number {
  const minutes = prefs.custom ? prefs.customMinutes : prefs.intervalMinutes;
  return Math.min(CUSTOM_MAX_MINUTES, Math.max(CUSTOM_MIN_MINUTES, minutes));
}

export function companionBreakLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${Math.round(seconds / 60)} min`;
}

/** Rounds an elapsed session length to the closest supported screen-habit bucket. */
export function bucketScreenMinutes(elapsedMinutes: number): 20 | 40 | 60 | 90 {
  const minutes = Math.max(20, Math.round(elapsedMinutes));
  const buckets: (20 | 40 | 60 | 90)[] = [20, 40, 60, 90];
  return buckets.reduce((best, b) =>
    Math.abs(b - minutes) < Math.abs(best - minutes) ? b : best,
  buckets[0]);
}

// ──────────────────────────────────────────────
// Preference persistence
// ──────────────────────────────────────────────

const PREFS_KEY_PREFIX = '@mindpulse/desktop-companion-prefs:';

function prefsKey(uid?: string): string {
  return `${PREFS_KEY_PREFIX}${uid ?? 'guest'}`;
}

export async function loadCompanionPrefs(
  uid?: string,
): Promise<DesktopCompanionPrefs> {
  try {
    const raw = await AsyncStorage.getItem(prefsKey(uid));
    if (!raw) return DEFAULT_COMPANION_PREFS;
    const parsed = JSON.parse(raw) as Partial<DesktopCompanionPrefs>;
    return { ...DEFAULT_COMPANION_PREFS, ...parsed };
  } catch {
    return DEFAULT_COMPANION_PREFS;
  }
}

export async function saveCompanionPrefs(
  uid: string | undefined,
  prefs: DesktopCompanionPrefs,
): Promise<void> {
  try {
    await AsyncStorage.setItem(prefsKey(uid), JSON.stringify(prefs));
  } catch {
    // Best-effort — the current session still works.
  }
}

// ──────────────────────────────────────────────
// Local notifications
// ──────────────────────────────────────────────

const COMPANION_CHANNEL_ID = 'eye-companion-session-v1';
// Sound-off variant. Android notification channels are IMMUTABLE once created,
// so the Sound toggle can't change an existing channel — instead the reminder
// is delivered on this separate LOW-importance (silent) channel. The ID must
// stay stable forever: changing it orphans the previously-created channel.
const COMPANION_SILENT_CHANNEL_ID = 'eye-companion-session-silent-v1';
const COMPANION_CATEGORY_ID = 'eyecompanionbreak';

/** Android channel to deliver companion reminders on, per the Sound toggle. */
export function companionAndroidChannelId(soundOn: boolean): string {
  return soundOn ? COMPANION_CHANNEL_ID : COMPANION_SILENT_CHANNEL_ID;
}
export const COMPANION_BREAK_ACTION = 'COMPANION_START_BREAK';
export const COMPANION_SNOOZE_ACTION = 'COMPANION_REMIND_LATER';
export const COMPANION_NOTIF_PREFIX = 'eye-companion-';

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

async function setupChannel(
  N: NotificationsModule,
  prefs: DesktopCompanionPrefs,
): Promise<void> {
  if (Platform.OS !== 'android') return;
  // Sound channel: HIGH importance plays the platform default sound. No
  // `sound` property here — a string like 'default' makes the Android channel
  // manager throw "Custom sound not found in native app".
  await N.setNotificationChannelAsync(COMPANION_CHANNEL_ID, {
    name: 'Desktop Eye Companion',
    description: 'Eye-break reminders with sound',
    importance: N.AndroidImportance.HIGH,
    enableVibrate: prefs.vibrationOn,
    ...(prefs.vibrationOn ? { vibrationPattern: [0, 300] } : {}),
  });
  // Silent channel for the Sound toggle OFF: LOW importance delivers without
  // sound or heads-up. Vibration is best-effort — some OEMs suppress it on
  // LOW-importance channels even when enabled (LOW is the only silent level
  // expo's channel API exposes; DEFAULT would play the default sound).
  await N.setNotificationChannelAsync(COMPANION_SILENT_CHANNEL_ID, {
    name: 'Desktop Eye Companion (silent)',
    description: 'Eye-break reminders without sound',
    importance: N.AndroidImportance.LOW,
    enableVibrate: prefs.vibrationOn,
    ...(prefs.vibrationOn ? { vibrationPattern: [0, 300] } : {}),
  });
}

async function setupCategory(
  N: NotificationsModule,
  snoozeMinutes: number,
): Promise<void> {
  await N.setNotificationCategoryAsync(COMPANION_CATEGORY_ID, [
    {
      identifier: COMPANION_BREAK_ACTION,
      buttonTitle: 'Start Break',
      options: {
        opensAppToForeground: true,
        isAuthenticationRequired: false,
      },
    },
    {
      identifier: COMPANION_SNOOZE_ACTION,
      buttonTitle: `Remind in ${snoozeMinutes} min`,
      options: {
        opensAppToForeground: true,
        isAuthenticationRequired: false,
      },
    },
  ]);
}

function companionContent(
  N: NotificationsModule,
  prefs: DesktopCompanionPrefs,
  minutes: number,
): import('expo-notifications').NotificationContentInput {
  return {
    title: 'Time for an eye break',
    body: `You have been using your computer for ${minutes} minutes. Look 20 feet away and rest your eyes.`,
    categoryIdentifier: COMPANION_CATEGORY_ID,
    // iOS: `true` = default sound, `false` = silent (a string would be a
    // custom sound resource). Android ignores content.sound entirely — the
    // channel chosen below drives sound on/off.
    sound: prefs.soundOn ? true : false,
    data: {
      kind: 'eye-companion',
      breakSeconds: prefs.breakSeconds,
      snoozeMinutes: prefs.snoozeMinutes,
    },
    ...(Platform.OS === 'android'
      ? { channelId: companionAndroidChannelId(prefs.soundOn) }
      : {}),
  };
}

/**
 * Schedules the companion reminder. `delaySeconds` overrides the interval
 * (used when resuming a paused session with time already banked).
 */
export async function scheduleCompanionReminder(
  uid: string | undefined,
  prefs: DesktopCompanionPrefs,
  delaySeconds?: number,
): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;

  await setupChannel(N, prefs);
  await setupCategory(N, prefs.snoozeMinutes);

  const { status: existing } = await N.getPermissionsAsync();
  let granted = existing === 'granted';
  if (!granted) {
    const { status } = await N.requestPermissionsAsync();
    granted = status === 'granted';
  }
  if (!granted) return false;

  await cancelCompanionReminders(uid);

  const minutes = companionIntervalMinutes(prefs);
  const seconds = Math.max(60, Math.round(delaySeconds ?? minutes * 60));
  await N.scheduleNotificationAsync({
    identifier: `${COMPANION_NOTIF_PREFIX}${Date.now()}`,
    content: companionContent(N, prefs, minutes),
    trigger: {
      type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: prefs.repeatOn,
    },
  });
  return true;
}

export async function cancelCompanionReminders(uid?: string): Promise<void> {
  const N = await getNotifications();
  if (!N) return;
  try {
    const scheduled = await N.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(request => request.identifier.startsWith(COMPANION_NOTIF_PREFIX))
        .map(request => N.cancelScheduledNotificationAsync(request.identifier)),
    );
  } catch {
    // Already cancelled.
  }
}

/**
 * "Remind me later" — replaces whatever is pending (the repeat chain or an
 * earlier snooze) so reminders never stack. If repeat reminders are on, the
 * cadence resumes one interval after the snooze so the session keeps
 * prompting until it ends.
 */
export async function scheduleCompanionSnooze(uid?: string): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;

  const prefs = await loadCompanionPrefs(uid);
  await setupChannel(N, prefs);
  await setupCategory(N, prefs.snoozeMinutes);

  const { status } = await N.getPermissionsAsync();
  if (status !== 'granted') return false;

  await cancelCompanionReminders(uid);

  const snoozeSeconds = Math.max(60, prefs.snoozeMinutes * 60);
  await N.scheduleNotificationAsync({
    identifier: `${COMPANION_NOTIF_PREFIX}snooze-${Date.now()}`,
    content: companionContent(N, prefs, companionIntervalMinutes(prefs)),
    trigger: {
      type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: snoozeSeconds,
    },
  });

  if (prefs.repeatOn) {
    const intervalSeconds = companionIntervalMinutes(prefs) * 60;
    await N.scheduleNotificationAsync({
      identifier: `${COMPANION_NOTIF_PREFIX}repeat-${Date.now()}`,
      content: companionContent(N, prefs, companionIntervalMinutes(prefs)),
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: snoozeSeconds + intervalSeconds,
        repeats: true,
      },
    });
  }
  return true;
}
