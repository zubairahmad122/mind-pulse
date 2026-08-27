/**
 * Screen Balance real-usage-tracking config. These are UI/UX thresholds
 * only — not medical limits or clinical definitions.
 */

/** When the Home card switches from "today's total" emphasis to "you've been on screen for a while" emphasis. */
export const SCREEN_BALANCE_LONG_SESSION_MINUTES = 30;

/** "App Switches" only ever looks back this far — mirrors native's `APP_SWITCH_WINDOW_MS`. */
export const APP_SWITCH_WINDOW_MINUTES = 60;

/** At/above this many switches in the window, the "frequent switching" suggestion can fire. */
export const APP_SWITCH_HIGH_THRESHOLD = 20;

/** Suppresses smart reset suggestions for this long after any completed reset, so the user isn't nagged right after taking one. */
export const SMART_RESET_COOLDOWN_MINUTES = 30;

/** Separate anti-spam cooldown after a background Smart Reset notification is delivered. */
export const SMART_RESET_NOTIFICATION_COOLDOWN_MINUTES = 90;
