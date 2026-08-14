import { SMART_RESET_NOTIFICATION_COOLDOWN_MINUTES } from '@/constants/screenBalance';
import { getSmartResetReminderDecision } from '../smartResetReminderDecision';

const NOW = 10_000_000;

function snapshot(overrides: Partial<Parameters<typeof getSmartResetReminderDecision>[0]['snapshot']> = {}) {
  return {
    hasPermission: true,
    currentSessionMs: null,
    currentSessionAvailable: false,
    appSwitchesLast60Min: null,
    appSwitchingAvailable: false,
    ...overrides,
  };
}

function decision(
  overrides: Partial<Parameters<typeof getSmartResetReminderDecision>[0]> = {},
) {
  return getSmartResetReminderDecision({
    remindersEnabled: true,
    notificationPermissionGranted: true,
    snapshot: snapshot(),
    resetStats: { lastResetCompletedAt: null },
    lastNotificationAt: null,
    now: NOW,
    ...overrides,
  });
}

describe('getSmartResetReminderDecision', () => {
  it('reminders disabled means no notification', () => {
    expect(decision({ remindersEnabled: false })).toEqual({ eligible: false, blockedBy: 'disabled' });
  });

  it('notification permission denied means no notification', () => {
    expect(decision({ notificationPermissionGranted: false })).toEqual({
      eligible: false,
      blockedBy: 'notification-permission',
    });
  });

  it('Usage Access denied means no notification', () => {
    expect(decision({ snapshot: snapshot({ hasPermission: false }) })).toEqual({
      eligible: false,
      blockedBy: 'usage-access',
    });
  });

  it('normal usage means no notification', () => {
    expect(decision({
      snapshot: snapshot({
        currentSessionMs: 18 * 60_000,
        currentSessionAvailable: true,
        appSwitchesLast60Min: 8,
        appSwitchingAvailable: true,
      }),
    })).toEqual({ eligible: false, blockedBy: 'none' });
  });

  it('long session is notification eligible', () => {
    const result = decision({
      snapshot: snapshot({
        currentSessionMs: 35 * 60_000,
        currentSessionAvailable: true,
      }),
    });
    expect(result).toMatchObject({
      eligible: true,
      reason: 'long-session',
      title: 'Time for a quick reset',
      body: "You've been on screen for a while.",
      recommendedReset: 'eye-break',
    });
  });

  it('frequent switching is notification eligible', () => {
    const result = decision({
      snapshot: snapshot({
        currentSessionMs: 12 * 60_000,
        currentSessionAvailable: true,
        appSwitchesLast60Min: 25,
        appSwitchingAvailable: true,
      }),
    });
    expect(result).toMatchObject({
      eligible: true,
      reason: 'frequent-switching',
      recommendedReset: 'offline',
    });
  });

  it('recent reset is suppressed by shared suggestion cooldown', () => {
    expect(decision({
      snapshot: snapshot({
        currentSessionMs: 35 * 60_000,
        currentSessionAvailable: true,
      }),
      resetStats: { lastResetCompletedAt: NOW - 10 * 60_000 },
    })).toEqual({ eligible: false, blockedBy: 'reset-cooldown' });
  });

  it('notification sent 10 min ago is suppressed', () => {
    expect(decision({
      snapshot: snapshot({
        currentSessionMs: 35 * 60_000,
        currentSessionAvailable: true,
      }),
      lastNotificationAt: NOW - 10 * 60_000,
    })).toEqual({ eligible: false, blockedBy: 'notification-cooldown' });
  });

  it('notification sent beyond cooldown is eligible again if condition remains valid', () => {
    const result = decision({
      snapshot: snapshot({
        currentSessionMs: 35 * 60_000,
        currentSessionAvailable: true,
      }),
      lastNotificationAt: NOW - (SMART_RESET_NOTIFICATION_COOLDOWN_MINUTES + 1) * 60_000,
    });
    expect(result).toMatchObject({ eligible: true, reason: 'long-session' });
  });

  it('suggestion none means no notification', () => {
    expect(decision({ snapshot: snapshot({ currentSessionAvailable: true, currentSessionMs: 8 * 60_000 }) }))
      .toEqual({ eligible: false, blockedBy: 'none' });
  });
});
