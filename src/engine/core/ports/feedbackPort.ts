/**
 * Audio + haptics as an interface, not an import.
 *
 * `core/` must never reach for `expo-haptics` or `expo-audio` directly —
 * that would make the whole engine unloadable in a Node test and would tie
 * gameplay to a specific runtime. Instead a game asks for a *cue* by name
 * and something outside decides what that sounds and feels like.
 *
 * The Expo implementation lives in `src/engine/adapters/`, where it can also
 * honour the user's existing sound/haptic preferences.
 */
export type FeedbackCue =
  | 'hit'
  | 'miss'
  | 'combo'
  | 'countdown'
  | 'stage-start'
  | 'stage-clear'
  | 'warning'
  | 'end';

export interface FeedbackPort {
  sound(cue: FeedbackCue): void;
  haptic(cue: FeedbackCue): void;
}

/** Used by tests and by any session running with feedback disabled. */
export const nullFeedbackPort: FeedbackPort = {
  sound() {},
  haptic() {},
};
