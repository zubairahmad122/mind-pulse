import {
  SMART_RESET_COOLDOWN_MINUTES,
  SMART_RESET_NOTIFICATION_COOLDOWN_MINUTES,
} from '@/constants/screenBalance';
import type { ResetType, ScreenBalanceStats } from '@/services/screenBalancePersistence';
import type { ScreenUsageSnapshot } from '@/types/screenUsage.types';
import { getScreenBalanceSuggestion } from './screenBalanceSuggestion';

export type SmartResetReminderReason = 'long-session' | 'frequent-switching';

export type SmartResetReminderDecision =
  | { eligible: false; blockedBy: 'disabled' | 'notification-permission' | 'usage-access' | 'notification-cooldown' | 'reset-cooldown' | 'none' }
  | {
      eligible: true;
      reason: SmartResetReminderReason;
      title: string;
      body: string;
      recommendedReset?: ResetType;
    };

export function getSmartResetReminderDecision({
  remindersEnabled,
  notificationPermissionGranted,
  snapshot,
  resetStats,
  lastNotificationAt,
  now = Date.now(),
}: {
  remindersEnabled: boolean;
  notificationPermissionGranted: boolean;
  snapshot: Pick<
    ScreenUsageSnapshot,
    'hasPermission' | 'currentSessionMs' | 'currentSessionAvailable' | 'appSwitchesLast60Min' | 'appSwitchingAvailable'
  >;
  resetStats: Pick<ScreenBalanceStats, 'lastResetCompletedAt'>;
  lastNotificationAt?: number | null;
  now?: number;
}): SmartResetReminderDecision {
  if (!remindersEnabled) return { eligible: false, blockedBy: 'disabled' };
  if (!notificationPermissionGranted) return { eligible: false, blockedBy: 'notification-permission' };
  if (!snapshot.hasPermission) return { eligible: false, blockedBy: 'usage-access' };
  if (
    lastNotificationAt != null &&
    now - lastNotificationAt < SMART_RESET_NOTIFICATION_COOLDOWN_MINUTES * 60_000
  ) {
    return { eligible: false, blockedBy: 'notification-cooldown' };
  }
  if (
    resetStats.lastResetCompletedAt != null &&
    now - resetStats.lastResetCompletedAt < SMART_RESET_COOLDOWN_MINUTES * 60_000
  ) {
    return { eligible: false, blockedBy: 'reset-cooldown' };
  }

  const suggestion = getScreenBalanceSuggestion(snapshot, resetStats, now);
  if (suggestion.reason === 'none') return { eligible: false, blockedBy: 'none' };
  if (suggestion.reason === 'frequent-switching') {
    return {
      eligible: true,
      reason: 'frequent-switching',
      title: 'Take a moment to reset',
      body: "You've been moving between apps frequently.",
      recommendedReset: suggestion.recommendedReset,
    };
  }
  return {
    eligible: true,
    reason: 'long-session',
    title: 'Time for a quick reset',
    body: "You've been on screen for a while.",
    recommendedReset: suggestion.recommendedReset,
  };
}
