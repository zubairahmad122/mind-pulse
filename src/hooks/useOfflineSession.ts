import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  clearOfflineSession,
  loadOfflineSession,
  recordResetCompleted,
  startOfflineSession,
  type OfflineSession,
} from '@/services/screenBalancePersistence';

export type OfflineSessionPhase = 'loading' | 'idle' | 'active' | 'completed';

/**
 * Drives the Go Offline timer off real elapsed time (`expectedEndAt`), not a
 * decrementing counter — so it reads correctly however long the app spent
 * backgrounded, including a full kill + relaunch mid-session. Resumes a
 * persisted in-progress session if one exists; otherwise starts a fresh one
 * for `initialDurationSeconds` (when provided).
 */
export function useOfflineSession(uid: string | undefined, initialDurationSeconds?: number) {
  const [session, setSession] = useState<OfflineSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(initialDurationSeconds ?? 0);
  const [phase, setPhase] = useState<OfflineSessionPhase>('loading');
  const finishedRef = useRef(false);

  const finish = useCallback(
    async (s: OfflineSession) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      await recordResetCompleted(uid, 'offline', Math.round(s.durationSeconds / 60));
      await clearOfflineSession(uid);
      setPhase('completed');
    },
    [uid],
  );

  const evaluate = useCallback(
    (s: OfflineSession) => {
      const remaining = Math.max(0, Math.round((s.expectedEndAt - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) void finish(s);
    },
    [finish],
  );

  // Resume an in-progress session, or start a fresh one.
  useEffect(() => {
    let active = true;
    (async () => {
      const existing = await loadOfflineSession(uid);
      if (!active) return;
      if (existing && existing.status === 'active') {
        setSession(existing);
        setPhase('active');
        evaluate(existing);
        return;
      }
      if (initialDurationSeconds) {
        const started = await startOfflineSession(uid, initialDurationSeconds);
        if (!active) return;
        setSession(started);
        setRemainingSeconds(initialDurationSeconds);
        setPhase('active');
      } else {
        setPhase('idle');
      }
    })();
    return () => {
      active = false;
    };
    // Only re-run for a genuinely new uid/duration — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, initialDurationSeconds]);

  // Tick once a second while active — purely for the visible countdown; the
  // actual completion check is anchored to `expectedEndAt`, not this tick.
  useEffect(() => {
    if (phase !== 'active' || !session) return;
    const id = setInterval(() => evaluate(session), 1000);
    return () => clearInterval(id);
  }, [phase, session, evaluate]);

  // The interval above is suspended while backgrounded — recompute the
  // instant the app returns so the countdown reflects real elapsed time.
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active' && session && phase === 'active') evaluate(session);
    });
    return () => sub.remove();
  }, [session, phase, evaluate]);

  const cancel = useCallback(async () => {
    await clearOfflineSession(uid);
    setSession(null);
    setPhase('idle');
  }, [uid]);

  return {
    phase,
    remainingSeconds,
    durationSeconds: session?.durationSeconds ?? initialDurationSeconds ?? 0,
    cancel,
  };
}
