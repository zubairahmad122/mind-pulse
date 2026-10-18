import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { recordActivity } from '@/stores/useActivityStore';
import type { ActivitySource } from '@/types/activity.types';

type NarrationSource = Extract<ActivitySource, 'body-scan' | 'muscle-release' | 'grounding'>;

/**
 * Records a voice-guided Relax session (Body Scan, Muscle Release, Grounding)
 * in the unified activity log when the screen's own flow reaches its finished
 * state. These screens don't go through the breathing player / RelaxContext,
 * so this is their only completion record.
 *
 * `started` — the session has begun (left its idle/start screen).
 * `finished` — the screen's existing completion state was reached.
 * Records once per run; resetting back to idle allows a new run to record.
 */
export function useRelaxSessionCompletion(
  sessionId: string,
  source: NarrationSource,
  started: boolean,
  finished: boolean,
): void {
  const { user } = useAuth();
  const startedAtRef = useRef<number | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    if (started && startedAtRef.current == null) startedAtRef.current = Date.now();
    if (!started) {
      startedAtRef.current = null;
      recordedRef.current = false;
    }
  }, [started]);

  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    const completedAt = Date.now();
    const startedAt = startedAtRef.current ?? completedAt;
    void recordActivity(user?.uid, {
      id: `relax-${sessionId}-${completedAt}`,
      type: 'RELAX_SESSION_COMPLETED',
      source,
      timestamp: completedAt,
      durationSeconds: (completedAt - startedAt) / 1000,
      metadata: { sessionId },
    });
  }, [finished, sessionId, source, user?.uid]);
}
