import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  acknowledgeFocusCompletion,
  completeFocusBlock,
  endFocusBlockEarly,
  getFocusRemainingMs,
  isMeaningfulFocusGoal,
  loadFocusBlockState,
  pauseFocusBlock,
  resumeFocusBlock,
  startFocusBlock,
  type ActiveFocusSession,
  type FocusBlockCompletion,
  type FocusBlockStats,
} from '@/services/focusBlockPersistence';
import { syncFocusDnd } from '@/services/focusDndSync';
import { recordActivity } from '@/stores/useActivityStore';

export type FocusBlockPhase = 'loading' | 'setup' | 'active' | 'paused' | 'completed';

const DEFAULT_REMAINING_SECONDS = 25 * 60;

export function useFocusBlockSession(uid?: string) {
  const [phase, setPhase] = useState<FocusBlockPhase>('loading');
  const [session, setSession] = useState<ActiveFocusSession | null>(null);
  const [stats, setStats] = useState<FocusBlockStats | null>(null);
  const [completion, setCompletion] = useState<FocusBlockCompletion | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_REMAINING_SECONDS);
  const completingRef = useRef(false);

  const completeSession = useCallback(async (activeSession: ActiveFocusSession) => {
    if (completingRef.current) return;
    completingRef.current = true;
    const result = await completeFocusBlock(uid, activeSession);
    // Keyed by the block's start so a re-evaluated completion can't double-count.
    // The user's goal text is deliberately not recorded.
    void recordActivity(uid, {
      id: `focus-${activeSession.startedAt}`,
      type: 'FOCUS_SESSION_COMPLETED',
      source: 'focus-block',
      timestamp: result.completion.completedAt,
      durationSeconds: activeSession.durationSeconds,
    });
    setSession(null);
    setStats(result.stats);
    setCompletion(result.completion);
    setRemainingSeconds(0);
    setPhase('completed');
    void syncFocusDnd(uid);
  }, [uid]);

  const evaluateSession = useCallback((activeSession: ActiveFocusSession) => {
    const remainingMs = getFocusRemainingMs(activeSession);
    const nextRemaining = Math.ceil(remainingMs / 1000);
    setRemainingSeconds(prev => (prev === nextRemaining ? prev : nextRemaining));
    if (activeSession.status === 'active' && remainingMs <= 0) {
      void completeSession(activeSession);
    }
  }, [completeSession]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const state = await loadFocusBlockState(uid);
      if (!mounted) return;
      setStats(state.todayStats);
      if (state.pendingCompletion) {
        setCompletion(state.pendingCompletion);
        setRemainingSeconds(0);
        setPhase('completed');
        return;
      }
      if (!state.activeFocusSession) {
        setSession(null);
        setPhase('setup');
        return;
      }
      completingRef.current = false;
      setSession(state.activeFocusSession);
      setPhase(state.activeFocusSession.status);
      evaluateSession(state.activeFocusSession);
      void syncFocusDnd(uid);
    })();
    return () => {
      mounted = false;
    };
  }, [evaluateSession, uid]);

  useEffect(() => {
    if (phase !== 'active' || !session) return;
    const id = setInterval(() => evaluateSession(session), 1000);
    return () => clearInterval(id);
  }, [evaluateSession, phase, session]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active' && session && (phase === 'active' || phase === 'paused')) {
        evaluateSession(session);
      }
    });
    return () => sub.remove();
  }, [evaluateSession, phase, session]);

  const start = useCallback(async (durationSeconds: number, goal: string) => {
    if (!isMeaningfulFocusGoal(goal)) return false;
    const activeSession = await startFocusBlock(uid, durationSeconds, goal);
    if (!activeSession) return false;
    completingRef.current = false;
    setSession(activeSession);
    setCompletion(null);
    setRemainingSeconds(activeSession.durationSeconds);
    setPhase('active');
    void syncFocusDnd(uid);
    return true;
  }, [uid]);

  const pause = useCallback(async () => {
    if (!session || phase !== 'active') return;
    if (getFocusRemainingMs(session) <= 0) {
      await completeSession(session);
      return;
    }
    const next = await pauseFocusBlock(uid, session);
    setSession(next);
    setPhase('paused');
    evaluateSession(next);
    void syncFocusDnd(uid);
  }, [completeSession, evaluateSession, phase, session, uid]);

  const resume = useCallback(async () => {
    if (!session || phase !== 'paused') return;
    const next = await resumeFocusBlock(uid, session);
    setSession(next);
    setPhase('active');
    evaluateSession(next);
    void syncFocusDnd(uid);
  }, [evaluateSession, phase, session, uid]);

  const endEarly = useCallback(async () => {
    const nextStats = await endFocusBlockEarly(uid);
    setSession(null);
    setCompletion(null);
    setStats(nextStats);
    setRemainingSeconds(DEFAULT_REMAINING_SECONDS);
    setPhase('setup');
    void syncFocusDnd(uid);
  }, [uid]);

  const acknowledgeCompletion = useCallback(async () => {
    const nextStats = await acknowledgeFocusCompletion(uid);
    setSession(null);
    setCompletion(null);
    setStats(nextStats);
    setRemainingSeconds(DEFAULT_REMAINING_SECONDS);
    setPhase('setup');
    completingRef.current = false;
  }, [uid]);

  return {
    phase,
    session,
    stats,
    completion,
    remainingSeconds,
    start,
    pause,
    resume,
    endEarly,
    acknowledgeCompletion,
  };
}
