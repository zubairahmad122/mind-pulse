import { useEffect, useRef, useState } from 'react';

export interface UseSessionClockOptions {
  /** Total countdown length in seconds. */
  totalSeconds: number;
  /** Whether the session is currently live (false = reset, awaiting start). */
  running: boolean;
  /** Freeze the countdown (user pause OR lifecycle background pause). */
  paused: boolean;
  /**
   * Changing this key (or `totalSeconds`) restarts the countdown from the
   * top, clearing any leftover frozen time.
   */
  resetKey?: number | string;
  /** Fired exactly once, when the countdown reaches zero. */
  onComplete?: () => void;
}

/**
 * A wall-clock countdown that survives JS-thread stalls and backgrounding:
 *
 * - Timing is anchored to `Date.now()` deltas, never to a fixed `setInterval`
 *   cadence, so a slow frame or throttled JS thread can't silently add or
 *   drop seconds.
 * - Paused (or not-running) time is excluded — the remaining budget is frozen
 *   the moment `paused` flips true and only resumes when it flips false.
 * - Completion fires at most once per run.
 */
export function useSessionClock({
  totalSeconds,
  running,
  paused,
  resetKey,
  onComplete,
}: UseSessionClockOptions) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  const remainingMsRef = useRef(totalSeconds * 1000);
  const anchorRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  // Keep the latest completion callback without re-running the tick effect.
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  // Restart the countdown whenever the duration or reset key changes.
  useEffect(() => {
    remainingMsRef.current = totalSeconds * 1000;
    anchorRef.current = null;
    doneRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: this is the key-remount reset for when `totalSeconds`/`resetKey` change (the remount-on-key pattern isn't available inside a hook).
    setSecondsLeft(totalSeconds);
  }, [totalSeconds, resetKey]);

  // Freeze elapsed time the moment the clock stops (pause / not running).
  useEffect(() => {
    if (running && !paused) return;
    if (anchorRef.current != null) {
      remainingMsRef.current = Math.max(
        0,
        remainingMsRef.current - (Date.now() - anchorRef.current),
      );
      anchorRef.current = null;
    }
  }, [running, paused]);

  // Tick off wall-clock time while running and not paused. Deps include
  // totalSeconds/resetKey so a reset while running re-anchors immediately
  // (the reset effect above nulls the anchor; this effect re-sets it) —
  // otherwise the old interval would keep firing into a null anchor and the
  // countdown would freeze until the next pause/resume toggle.
  useEffect(() => {
    if (!running || paused) return;
    anchorRef.current = Date.now();
    const id = setInterval(() => {
      if (anchorRef.current == null) return;
      const remaining = remainingMsRef.current - (Date.now() - anchorRef.current);
      const next = Math.max(0, Math.ceil(remaining / 1000));
      setSecondsLeft(prev => (prev === next ? prev : next));
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true;
        onCompleteRef.current?.();
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, paused, totalSeconds, resetKey]);

  return {
    secondsLeft,
    /** 0 → 1 as the session elapses. */
    progress: totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0,
    elapsedSeconds: totalSeconds - secondsLeft,
    isDone: secondsLeft <= 0,
  };
}
