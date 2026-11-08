/**
 * Analytics funnel — every product event goes through trackEvent, the same
 * way every caught error goes through reportError. Firebase Analytics under
 * the hood (free, already part of the RN Firebase setup).
 *
 * Analytics must NEVER break a user flow: every call is fire-and-forget and
 * swallows its own failures (offline, native module not ready, etc.).
 */

import { getAnalytics, logEvent } from '@react-native-firebase/analytics';

type EventParams = Record<string, string | number | boolean>;

export function trackEvent(name: string, params?: EventParams): void {
  try {
    void logEvent(getAnalytics(), name, params).catch(() => {});
  } catch {
    // Native module unavailable (e.g. first run before rebuild) — skip.
  }
}

// ─── Relax sessions ──────────────────────────────────────────────────────────

export function trackSessionStart(sessionId: string, moodBefore?: string | null): void {
  trackEvent('relax_session_start', {
    session_id: sessionId,
    ...(moodBefore ? { mood_before: moodBefore } : {}),
  });
}

export function trackSessionComplete(sessionId: string): void {
  trackEvent('relax_session_complete', { session_id: sessionId });
}

/** User ended the session early — where they dropped off is the key metric. */
export function trackSessionAbandoned(
  sessionId: string,
  elapsedSeconds: number,
  totalSeconds: number,
): void {
  trackEvent('relax_session_abandoned', {
    session_id: sessionId,
    elapsed_seconds: Math.round(elapsedSeconds),
    percent_done: totalSeconds > 0 ? Math.round((elapsedSeconds / totalSeconds) * 100) : 0,
  });
}

export function trackMoodSelected(sessionId: string, mood: string, rating?: number): void {
  trackEvent('relax_mood_selected', {
    session_id: sessionId,
    mood,
    ...(rating ? { rating } : {}),
  });
}

// ─── Monetization ────────────────────────────────────────────────────────────

export function trackPaywallShown(featureId: string): void {
  trackEvent('paywall_shown', { feature_id: featureId });
}

export function trackPurchase(productId: string): void {
  trackEvent('purchase_success', { product_id: productId });
}

// ─── Engagement / retention ──────────────────────────────────────────────────

/** Fired once per app session, from the check-in that runs on cold open. */
export function trackAppOpen(): void {
  trackEvent('app_open');
}

/** The intro slides are finished, skipped, or left for sign-in. Once per install. */
export function trackOnboardingDone(): void {
  trackEvent('onboarding_done');
}

/** The first activity ever completed on this account. */
export function trackFirstSessionDone(activityType: string): void {
  trackEvent('first_session_done', { activity_type: activityType });
}

export function trackOnboardingCompleted(step?: string): void {
  trackEvent('onboarding_completed', step ? { step } : undefined);
}

export function trackDailyReminderOpened(source?: string): void {
  trackEvent('daily_reminder_opened', source ? { source } : undefined);
}

export function trackEyeBreakStarted(source?: string): void {
  trackEvent('eye_break_started', source ? { source } : undefined);
}

export function trackEyeBreakCompleted(source?: string): void {
  trackEvent('eye_break_completed', source ? { source } : undefined);
}

export function trackDailyGoalCompleted(goalId: string): void {
  trackEvent('daily_goal_completed', { goal_id: goalId });
}

export function trackReminderSnoozed(kind: string): void {
  trackEvent('reminder_snoozed', { kind });
}

export function trackUsageAlertOpened(kind: 'long_session' | 'high_daily'): void {
  trackEvent('usage_alert_opened', { kind });
}

/**
 * Retention dashboards (Firebase / BigQuery) should derive:
 * - DAU: distinct users with `app_open` on a calendar day
 * - D1 / D7 retention: cohort of first `app_open` or `onboarding_completed`
 *   returning with `app_open` on day+1 / day+7
 * - Notification opt-in: `notification_permission_granted` /
 *   `notification_permission_requested`
 * - Notif → open: `daily_reminder_opened` after evening schedule (never
 *   treat `ensureEveningReminderScheduled` as delivery)
 * - Eye-break completion rate: `eye_break_completed` / `eye_break_started`
 */

/** Fired the first time an achievement is ever earned (never repeats). */
export function trackAchievementUnlocked(achievementId: string): void {
  trackEvent('achievement_unlocked', { achievement_id: achievementId });
}

/** The weekly grace day covered a missed day — streak survived. */
export function trackStreakSavedByFreeze(streak: number): void {
  trackEvent('streak_saved_by_freeze', { streak });
}

/** Two+ days missed (or no freeze left) — streak reset to 1. */
export function trackStreakBroken(): void {
  trackEvent('streak_broken');
}

/** Today's assigned daily challenge was just completed. */
export function trackChallengeCompleted(feature: string): void {
  trackEvent('challenge_completed', { feature });
}

// ─── Unified activity log ────────────────────────────────────────────────────

/** One event per newly-recorded completed activity (see stores/useActivityStore). */
export function trackActivityCompleted(event: {
  type: string;
  source: string;
  durationSeconds: number;
  score?: number;
}): void {
  trackEvent('activity_completed', {
    activity_type: event.type,
    source: event.source,
    duration_seconds: event.durationSeconds,
    ...(typeof event.score === 'number' ? { score: event.score } : {}),
  });
}
