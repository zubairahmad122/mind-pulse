import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type {
  AppUsageItem,
  DailyScreenTime,
  NativeScreenUsageModule,
  NativeSmartResetReminderStatus,
  ScreenTimeHistory,
  ScreenUsageSnapshot,
} from '@/types/screenUsage.types';

/** Weekly Trends V1 always asks for exactly this many days (today + previous 6). */
export const WEEKLY_TRENDS_DAYS = 7;

/**
 * Thin, typed wrapper around the native `MindPulseScreenUsage` bridge —
 * Android only. Nothing above this file should call
 * `requireOptionalNativeModule` directly; go through `useScreenUsage()`.
 */

let cached: NativeScreenUsageModule | null | undefined;

function getNativeModule(): NativeScreenUsageModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'android') {
    cached = null;
    return cached;
  }
  cached = requireOptionalNativeModule<NativeScreenUsageModule>('MindPulseScreenUsage') ?? null;
  return cached;
}

/** True on Android with the native module linked; false on every other platform. */
export function isScreenUsageSupported(): boolean {
  return getNativeModule() != null;
}

function unavailableSnapshot(hasPermission: boolean): ScreenUsageSnapshot {
  return {
    hasPermission,
    screenTimeTodayMs: null,
    currentSessionMs: null,
    lastSessionMs: null,
    currentSessionAvailable: false,
    topAppsToday: [],
    appSwitchesLast60Min: null,
    appSwitchingAvailable: false,
    calculatedAt: Date.now(),
  };
}

export async function hasUsageAccess(): Promise<boolean> {
  const native = getNativeModule();
  if (!native) return false;
  try {
    return await native.hasUsageAccess();
  } catch {
    return false;
  }
}

/** Opens Android's Usage Access settings. Never assume access was granted just because this resolved — re-check with `getScreenUsageSnapshot()` on return. */
export async function openUsageAccessSettings(): Promise<void> {
  const native = getNativeModule();
  if (!native) return;
  try {
    await native.openUsageAccessSettings();
  } catch {
    // Best-effort — nothing else to fall back to.
  }
}

/** One snapshot fetch (permission + today's total + session) — prefer this over separate calls to avoid redundant native round-trips. */
export async function getScreenUsageSnapshot(): Promise<ScreenUsageSnapshot> {
  const native = getNativeModule();
  if (!native) return unavailableSnapshot(false);
  try {
    return normalizeSnapshot(await native.getScreenUsageSnapshot());
  } catch {
    // Query failure / unsupported OS version — an explicit unavailable
    // state, never a fabricated zero.
    return unavailableSnapshot(false);
  }
}

/** Local "YYYY-MM-DD" for [date] — matches the history key format used across Screen Balance persistence. */
function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function lastNDates(days: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(localDateKey(d));
  }
  return out;
}

function unavailableScreenTimeHistory(days: number): ScreenTimeHistory {
  return { hasPermission: false, days: lastNDates(days).map(date => ({ date, screenTimeMs: null })) };
}

/** Weekly Trends' screen-time series — Android only; unavailable elsewhere or without Usage Access. */
export async function getScreenTimeHistory(days: number = WEEKLY_TRENDS_DAYS): Promise<ScreenTimeHistory> {
  const native = getNativeModule();
  if (!native?.getDailyScreenTimeHistory) return unavailableScreenTimeHistory(days);
  try {
    return normalizeScreenTimeHistory(await native.getDailyScreenTimeHistory(days), days);
  } catch {
    return unavailableScreenTimeHistory(days);
  }
}

/** Exported for direct unit testing — see `screenUsageService.test.ts`. */
export function normalizeScreenTimeHistory(
  raw: Partial<ScreenTimeHistory> | null | undefined,
  days: number = WEEKLY_TRENDS_DAYS,
): ScreenTimeHistory {
  const hasPermission = raw?.hasPermission ?? false;
  const rawDays = Array.isArray(raw?.days) ? raw.days : [];
  const normalizedDays: DailyScreenTime[] = [];
  for (const entry of rawDays) {
    if (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as Partial<DailyScreenTime>).date === 'string'
    ) {
      const screenTimeMs = (entry as Partial<DailyScreenTime>).screenTimeMs;
      normalizedDays.push({
        date: (entry as DailyScreenTime).date,
        screenTimeMs: typeof screenTimeMs === 'number' ? screenTimeMs : null,
      });
    }
  }
  return {
    hasPermission,
    days: normalizedDays.length > 0 ? normalizedDays : lastNDates(days).map(date => ({ date, screenTimeMs: null })),
  };
}

export async function getNativeSmartResetReminderStatus(): Promise<NativeSmartResetReminderStatus | null> {
  const native = getNativeModule();
  if (!native?.getSmartResetReminderStatus) return null;
  try {
    return normalizeSmartResetReminderStatus(await native.getSmartResetReminderStatus());
  } catch {
    return null;
  }
}

export async function setNativeSmartResetRemindersEnabled(
  enabled: boolean,
  lastResetCompletedAt?: number | null,
): Promise<NativeSmartResetReminderStatus | null> {
  const native = getNativeModule();
  if (!native?.setSmartResetRemindersEnabled) return null;
  try {
    return normalizeSmartResetReminderStatus(
      await native.setSmartResetRemindersEnabled(enabled, lastResetCompletedAt ?? null),
    );
  } catch {
    return null;
  }
}

export async function setNativeSmartResetLastResetCompletedAt(
  lastResetCompletedAt?: number | null,
): Promise<void> {
  const native = getNativeModule();
  if (!native?.setSmartResetLastResetCompletedAt) return;
  try {
    await native.setSmartResetLastResetCompletedAt(lastResetCompletedAt ?? null);
  } catch {
    // Best-effort mirror for the native background cooldown.
  }
}

/** Defensive mirror of native's `ScreenUsageCalculator.TOP_APPS_MAX`. */
const MAX_TOP_APPS = 5;

/** Exported for direct unit testing — see `screenUsageService.test.ts`. */
export function normalizeSnapshot(raw: Partial<ScreenUsageSnapshot> | null | undefined): ScreenUsageSnapshot {
  return {
    hasPermission: raw?.hasPermission ?? false,
    screenTimeTodayMs: typeof raw?.screenTimeTodayMs === 'number' ? raw.screenTimeTodayMs : null,
    currentSessionMs: typeof raw?.currentSessionMs === 'number' ? raw.currentSessionMs : null,
    lastSessionMs: typeof raw?.lastSessionMs === 'number' ? raw.lastSessionMs : null,
    currentSessionAvailable: raw?.currentSessionAvailable ?? false,
    topAppsToday: normalizeTopApps(raw?.topAppsToday),
    appSwitchesLast60Min: typeof raw?.appSwitchesLast60Min === 'number' ? raw.appSwitchesLast60Min : null,
    appSwitchingAvailable: raw?.appSwitchingAvailable ?? false,
    calculatedAt: typeof raw?.calculatedAt === 'number' ? raw.calculatedAt : Date.now(),
  };
}

export function normalizeSmartResetReminderStatus(
  raw: Partial<NativeSmartResetReminderStatus> | null | undefined,
): NativeSmartResetReminderStatus {
  return {
    enabled: raw?.enabled ?? false,
    lastNotificationAt: typeof raw?.lastNotificationAt === 'number' ? raw.lastNotificationAt : null,
    lastNotificationReason: typeof raw?.lastNotificationReason === 'string' ? raw.lastNotificationReason : null,
    lastResetCompletedAt: typeof raw?.lastResetCompletedAt === 'number' ? raw.lastResetCompletedAt : null,
    notificationsGranted: raw?.notificationsGranted ?? false,
    usageAccessGranted: raw?.usageAccessGranted ?? false,
    checkIntervalMinutes: typeof raw?.checkIntervalMinutes === 'number' ? raw.checkIntervalMinutes : 15,
    notificationCooldownMinutes:
      typeof raw?.notificationCooldownMinutes === 'number' ? raw.notificationCooldownMinutes : 90,
    nativeAvailable: raw?.nativeAvailable ?? false,
  };
}

/** Drops any malformed row rather than fabricating a fallback for it. Preserves native's ordering — never re-sorts. */
export function normalizeTopApps(raw: unknown): AppUsageItem[] {
  if (!Array.isArray(raw)) return [];
  const items: AppUsageItem[] = [];
  for (const entry of raw) {
    if (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as Partial<AppUsageItem>).packageName === 'string' &&
      typeof (entry as Partial<AppUsageItem>).appName === 'string' &&
      typeof (entry as Partial<AppUsageItem>).foregroundTimeMs === 'number'
    ) {
      const item = entry as AppUsageItem;
      items.push({
        packageName: item.packageName,
        appName: item.appName,
        foregroundTimeMs: item.foregroundTimeMs,
        iconAvailable: item.iconAvailable ?? undefined,
      });
    }
  }
  return items.slice(0, MAX_TOP_APPS);
}
