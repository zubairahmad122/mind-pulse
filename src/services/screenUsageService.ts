import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type {
  AppUsageItem,
  NativeScreenUsageModule,
  NativeSmartResetReminderStatus,
  ScreenUsageSnapshot,
} from '@/types/screenUsage.types';

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
