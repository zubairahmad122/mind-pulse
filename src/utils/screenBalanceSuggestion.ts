import {
  APP_SWITCH_HIGH_THRESHOLD,
  SCREEN_BALANCE_LONG_SESSION_MINUTES,
  SMART_RESET_COOLDOWN_MINUTES,
} from '@/constants/screenBalance';
import type { ResetType, ScreenBalanceStats } from '@/services/screenBalancePersistence';
import type { ScreenUsageSnapshot } from '@/types/screenUsage.types';

export type ScreenBalanceSuggestion =
  | { reason: 'none' }
  | {
      reason: 'long-session-no-break' | 'frequent-switching' | 'long-session';
      title: string;
      body: string;
      recommendedReset?: ResetType;
    };

const NONE: ScreenBalanceSuggestion = { reason: 'none' };

/**
 * Pure, deterministic in-app suggestion derived only from real device
 * metrics already captured elsewhere — no AI, no backend, nothing
 * fabricated. Priority (first match wins), after the cooldown gate:
 *
 * 1. `long-session-no-break` — a live session at/above the long-session
 *    threshold and no reset has ever been completed (so there's nothing to
 *    cool down from).
 * 2. `frequent-switching` — recent app switches at/above the high threshold.
 * 3. `long-session` — the session is still long, but the user has reset
 *    before (just not recently enough to be in cooldown) — a softer nudge
 *    than #1's "you haven't taken a break at all" framing.
 * 4. `none` — standard Screen Balance state, no suggestion.
 */
export function getScreenBalanceSuggestion(
  snapshot: Pick<
    ScreenUsageSnapshot,
    'currentSessionMs' | 'currentSessionAvailable' | 'appSwitchesLast60Min' | 'appSwitchingAvailable'
  >,
  resetStats: Pick<ScreenBalanceStats, 'lastResetCompletedAt'>,
  now: number = Date.now(),
): ScreenBalanceSuggestion {
  const { lastResetCompletedAt } = resetStats;
  const withinCooldown =
    lastResetCompletedAt != null && now - lastResetCompletedAt < SMART_RESET_COOLDOWN_MINUTES * 60_000;
  if (withinCooldown) return NONE;

  const currentSessionMs = snapshot.currentSessionAvailable ? snapshot.currentSessionMs : null;
  const longSession = currentSessionMs != null && currentSessionMs >= SCREEN_BALANCE_LONG_SESSION_MINUTES * 60_000;

  if (longSession && lastResetCompletedAt == null) {
    return {
      reason: 'long-session-no-break',
      title: 'Take a short reset',
      body: "You've been on screen for a while.",
      recommendedReset: 'eye-break',
    };
  }

  const switchesKnown = snapshot.appSwitchingAvailable && snapshot.appSwitchesLast60Min != null;
  if (switchesKnown && (snapshot.appSwitchesLast60Min as number) >= APP_SWITCH_HIGH_THRESHOLD) {
    return {
      reason: 'frequent-switching',
      title: 'Take a moment to reset',
      body: "You've been moving between apps frequently.",
      recommendedReset: 'offline',
    };
  }

  if (longSession) {
    return {
      reason: 'long-session',
      title: 'A quick break may help.',
      body: '',
    };
  }

  return NONE;
}
