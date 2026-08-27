/**
 * Lifecycle decisions for the CVS (Eye Reset) protocol screen, extracted so
 * they're unit-testable without rendering the heavy screen (Lottie /
 * reanimated / audio).
 *
 * Approved scope exception to the Eye-feature stabilization pass — this
 * screen's timer was otherwise meant to stay untouched, but these rules fix
 * a real background/lock defect and are covered by the tests below. Rules
 * encoded here:
 *  - A live step freezes the moment the app backgrounds or the phone locks.
 *  - No step timer, 3-2-1 countdown or 20-20-20 recovery advances while away.
 *  - A step change interrupted by backgrounding is deferred — never applied
 *    while away — and replayed on return.
 *  - Completion writes can never run while the app is backgrounded.
 */

export type CvsPhase =
  | 'idle'
  | 'checkin-before'
  | 'calibrate'
  | 'countdown'
  | 'active'
  | 'recovery'
  | 'checkin-after'
  | 'done';

/** Phases that own a countdown and must freeze while the app is away. */
const TIMED_PHASES: ReadonlySet<CvsPhase> = new Set([
  'countdown',
  'active',
  'recovery',
]);

/**
 * True when a countdown must not tick. The active step freezes on EITHER a
 * user pause OR a background/lock; the 3-2-1 and recovery countdowns freeze
 * only on background (they have no manual pause).
 */
export function cvsTimingBlocked(
  phase: CvsPhase,
  backgrounded: boolean,
  paused: boolean,
): boolean {
  if (phase === 'active') return backgrounded || paused;
  return backgrounded && TIMED_PHASES.has(phase);
}

/** True when a live exercise should be frozen on background (paused overlay). */
export function cvsShouldFreezeActive(phase: CvsPhase): boolean {
  return phase === 'active';
}

/** True when backgrounding should pause the voice-guide clip. */
export function cvsPauseVoiceOnBackground(phase: CvsPhase): boolean {
  return phase === 'active' || phase === 'calibrate' || phase === 'countdown';
}

/**
 * True when the voice clip should resume automatically on return (voice-only
 * phases like the calibrate intro — the active phase waits for the user to
 * tap Resume so the session never restarts itself).
 */
export function cvsResumeVoiceOnForeground(phase: CvsPhase): boolean {
  return phase === 'calibrate' || phase === 'countdown';
}

/** Completion writes are only legal while the app is foregrounded. */
export function cvsCanComplete(backgrounded: boolean): boolean {
  return !backgrounded;
}

/**
 * A deferred step change may be applied only once the app is back in the
 * foreground — never while away, so steps can't auto-advance in the background.
 */
export function cvsDeferredStepApplies(
  pendingStep: number | null,
  backgrounded: boolean,
): boolean {
  return pendingStep !== null && !backgrounded;
}

/**
 * True when backgrounding should cancel an in-flight 3-2-1 resume beat.
 * Otherwise the beat would finish while away and auto-resume the session
 * (no paused overlay on return, voice playing in the background).
 */
export function cvsCancelResumeBeat(
  phase: CvsPhase,
  resumeCountdown: number | null,
): boolean {
  return phase === 'active' && resumeCountdown !== null;
}
