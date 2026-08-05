import type { EndReason } from '../types';

/**
 * Session phase machine and honest elapsed-time accounting.
 *
 * The rule this exists to enforce: **time spent paused or backgrounded never
 * counts toward the session**. Reaction times, mission timers and the final
 * duration all read `activeMs`, which only advances while `running`.
 *
 * Resume is always explicit. Returning from the background moves the phase
 * to `paused`, never straight back to `running` — the player decides when
 * play continues, matching the contract `useSessionLifecycle` already
 * documents for the existing games.
 */
export type RuntimePhase =
  | 'idle'
  | 'countdown'
  | 'running'
  | 'paused'
  | 'ended';

export type PauseReason = 'user' | 'background' | 'system';

export interface RuntimeLifecycle {
  readonly phase: RuntimePhase;
  /** Play time in ms, excluding every paused/backgrounded interval. */
  readonly activeMs: number;
  readonly pausedMsTotal: number;
  readonly endReason: EndReason | null;
  readonly lastPauseReason: PauseReason | null;

  start(): void;
  pause(reason: PauseReason): void;
  resume(): void;
  end(reason: EndReason): void;

  /** Advances `activeMs`. Called once per fixed step, only while running. */
  tick(dtMs: number): void;

  onChange(fn: (phase: RuntimePhase) => void): () => void;
  reset(): void;
}

export function createRuntimeLifecycle(): RuntimeLifecycle {
  let phase: RuntimePhase = 'idle';
  let activeMs = 0;
  let pausedMsTotal = 0;
  let pausedAtMs = 0;
  let endReason: EndReason | null = null;
  let lastPauseReason: PauseReason | null = null;
  const listeners = new Set<(p: RuntimePhase) => void>();

  const set = (next: RuntimePhase) => {
    if (phase === next) return;
    phase = next;
    listeners.forEach(fn => fn(next));
  };

  return {
    get phase() { return phase; },
    get activeMs() { return activeMs; },
    get pausedMsTotal() { return pausedMsTotal; },
    get endReason() { return endReason; },
    get lastPauseReason() { return lastPauseReason; },

    start() {
      // `ended` is terminal — a restart must go through reset(), so a late
      // callback can never resurrect a finished session and double-save it.
      if (phase === 'ended') return;
      set('running');
    },

    pause(reason) {
      if (phase !== 'running' && phase !== 'countdown') return;
      lastPauseReason = reason;
      pausedAtMs = activeMs;
      set('paused');
    },

    resume() {
      if (phase !== 'paused') return;
      pausedMsTotal += Math.max(0, activeMs - pausedAtMs);
      set('running');
    },

    end(reason) {
      if (phase === 'ended') return;
      endReason = reason;
      set('ended');
    },

    tick(dtMs) {
      if (phase !== 'running') return;
      activeMs += dtMs;
    },

    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    reset() {
      phase = 'idle';
      activeMs = 0;
      pausedMsTotal = 0;
      pausedAtMs = 0;
      endReason = null;
      lastPauseReason = null;
      listeners.forEach(fn => fn(phase));
    },
  };
}
