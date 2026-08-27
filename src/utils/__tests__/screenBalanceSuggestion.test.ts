import { APP_SWITCH_HIGH_THRESHOLD, SCREEN_BALANCE_LONG_SESSION_MINUTES } from '@/constants/screenBalance';
import { getScreenBalanceSuggestion } from '../screenBalanceSuggestion';

const NOW = 10_000_000;

function snapshot(overrides: Partial<Parameters<typeof getScreenBalanceSuggestion>[0]> = {}) {
  return {
    currentSessionMs: null,
    currentSessionAvailable: false,
    appSwitchesLast60Min: null,
    appSwitchingAvailable: false,
    ...overrides,
  };
}

describe('getScreenBalanceSuggestion', () => {
  it('returns none for a short session with only a handful of switches', () => {
    const result = getScreenBalanceSuggestion(
      snapshot({
        currentSessionMs: 10 * 60_000,
        currentSessionAvailable: true,
        appSwitchesLast60Min: 5,
        appSwitchingAvailable: true,
      }),
      { lastResetCompletedAt: null },
      NOW,
    );
    expect(result).toEqual({ reason: 'none' });
  });

  it('suggests long-session-no-break for a long live session and no reset ever completed', () => {
    const result = getScreenBalanceSuggestion(
      snapshot({
        currentSessionMs: 35 * 60_000,
        currentSessionAvailable: true,
      }),
      { lastResetCompletedAt: null },
      NOW,
    );
    expect(result.reason).toBe('long-session-no-break');
    if (result.reason !== 'none') {
      expect(result.recommendedReset).toBe('eye-break');
    }
  });

  it('is fully suppressed by the reset cooldown, even with a long session', () => {
    const fiveMinAgo = NOW - 5 * 60_000;
    const result = getScreenBalanceSuggestion(
      snapshot({
        currentSessionMs: 35 * 60_000,
        currentSessionAvailable: true,
      }),
      { lastResetCompletedAt: fiveMinAgo },
      NOW,
    );
    expect(result).toEqual({ reason: 'none' });
  });

  it('suggests frequent-switching for a short session with high switch count', () => {
    const result = getScreenBalanceSuggestion(
      snapshot({
        currentSessionMs: 12 * 60_000,
        currentSessionAvailable: true,
        appSwitchesLast60Min: 25,
        appSwitchingAvailable: true,
      }),
      { lastResetCompletedAt: null },
      NOW,
    );
    expect(result.reason).toBe('frequent-switching');
    if (result.reason !== 'none') {
      expect(result.recommendedReset).toBe('offline');
    }
  });

  it('does not fabricate frequent-switching when switch data is unavailable', () => {
    const result = getScreenBalanceSuggestion(
      snapshot({
        currentSessionMs: 12 * 60_000,
        currentSessionAvailable: true,
        appSwitchesLast60Min: null,
        appSwitchingAvailable: false,
      }),
      { lastResetCompletedAt: null },
      NOW,
    );
    expect(result).toEqual({ reason: 'none' });
  });

  it('gives long-session-no-break priority over frequent-switching when both conditions are met', () => {
    const result = getScreenBalanceSuggestion(
      snapshot({
        currentSessionMs: 40 * 60_000,
        currentSessionAvailable: true,
        appSwitchesLast60Min: 30,
        appSwitchingAvailable: true,
      }),
      { lastResetCompletedAt: null },
      NOW,
    );
    expect(result.reason).toBe('long-session-no-break');
  });

  it('falls back to the softer long-session suggestion once a reset exists but is outside cooldown', () => {
    const wellOutsideCooldown = NOW - 2 * 60 * 60_000; // 2 hours ago
    const result = getScreenBalanceSuggestion(
      snapshot({
        currentSessionMs: SCREEN_BALANCE_LONG_SESSION_MINUTES * 60_000,
        currentSessionAvailable: true,
      }),
      { lastResetCompletedAt: wellOutsideCooldown },
      NOW,
    );
    expect(result).toEqual({ reason: 'long-session', title: 'A quick break may help.', body: '' });
  });

  it('prefers frequent-switching over the softer long-session suggestion when both apply', () => {
    const wellOutsideCooldown = NOW - 2 * 60 * 60_000;
    const result = getScreenBalanceSuggestion(
      snapshot({
        currentSessionMs: 40 * 60_000,
        currentSessionAvailable: true,
        appSwitchesLast60Min: APP_SWITCH_HIGH_THRESHOLD,
        appSwitchingAvailable: true,
      }),
      { lastResetCompletedAt: wellOutsideCooldown },
      NOW,
    );
    expect(result.reason).toBe('frequent-switching');
  });

  it('never suggests anything when there is no live session at all', () => {
    const result = getScreenBalanceSuggestion(
      snapshot({ currentSessionMs: null, currentSessionAvailable: false }),
      { lastResetCompletedAt: null },
      NOW,
    );
    expect(result).toEqual({ reason: 'none' });
  });
});
