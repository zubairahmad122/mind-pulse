/**
 * One "Most Used Today" row, drawn from the same per-package totals
 * `screenTimeTodayMs` is summed from, so the two always reconcile — see
 * `ScreenUsageCalculator.computePerAppForegroundMs` (native).
 *
 * `iconAvailable` is reserved for a future real-icon pipeline — V1 doesn't
 * resolve/transmit icon bytes; the UI renders a monogram from `appName`.
 */
export type AppUsageItem = {
  packageName: string;
  appName: string;
  foregroundTimeMs: number;
  iconAvailable?: boolean;
};

/**
 * A single fetch of Android's real device screen-usage data.
 *
 * "Screen Time Today" (`screenTimeTodayMs`) = total foreground application
 * usage from local midnight through the moment of the query, excluding
 * MindPulse's own foreground time. Not claimed to be pixel-identical to
 * Google's Digital Wellbeing number.
 *
 * "Current session" (`currentSessionMs`, when `currentSessionAvailable`) =
 * how long the device has been continuously screen-interactive right now —
 * switching between apps does not end it, only the screen turning off/
 * locking does. When there is no session live right now, `lastSessionMs`
 * holds the most recently completed one instead.
 */
export type ScreenUsageSnapshot = {
  hasPermission: boolean;
  screenTimeTodayMs: number | null;
  currentSessionMs: number | null;
  lastSessionMs: number | null;
  /**
   * False when session boundaries can't be reliably determined on this
   * device/OS version (e.g. pre-Android 9, or no signal yet) — distinct
   * from "no session right now". Never fabricate a duration when false.
   */
  currentSessionAvailable: boolean;
  /**
   * Top 5 apps by foreground time today, descending, MindPulse excluded.
   * Always an array — empty means either no qualifying usage yet or the
   * query was unavailable; the UI tells those apart via `screenTimeTodayMs`.
   */
  topAppsToday: AppUsageItem[];
  /**
   * Meaningful app-to-app transitions in the last hour — MindPulse,
   * launcher, and System UI never count as a switch destination, and a
   * screen lock/off boundary breaks continuity. See
   * `ScreenUsageCalculator.computeAppSwitches` (native) for the exact rule.
   */
  appSwitchesLast60Min: number | null;
  /** Same API-level gate as `currentSessionAvailable` — false on pre-Android-9 devices. Never fabricate a count when false. */
  appSwitchingAvailable: boolean;
  calculatedAt: number;
};

export type NativeScreenUsageModule = {
  hasUsageAccess: () => Promise<boolean>;
  openUsageAccessSettings: () => Promise<void>;
  getScreenUsageSnapshot: () => Promise<ScreenUsageSnapshot>;
  getSmartResetReminderStatus?: () => Promise<NativeSmartResetReminderStatus>;
  setSmartResetRemindersEnabled?: (
    enabled: boolean,
    lastResetCompletedAt?: number | null,
  ) => Promise<NativeSmartResetReminderStatus>;
  setSmartResetLastResetCompletedAt?: (lastResetCompletedAt?: number | null) => Promise<void>;
};

export type NativeSmartResetReminderStatus = {
  enabled: boolean;
  lastNotificationAt: number | null;
  lastNotificationReason: string | null;
  lastResetCompletedAt: number | null;
  notificationsGranted: boolean;
  usageAccessGranted: boolean;
  checkIntervalMinutes: number;
  notificationCooldownMinutes: number;
  nativeAvailable: boolean;
};
