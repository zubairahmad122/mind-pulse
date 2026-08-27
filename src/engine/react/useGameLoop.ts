import { useEffect, useRef } from 'react';
import { clampFrameDelta, FixedTimestep } from '../core/time/fixedTimestep';

export interface GameLoopCallbacks {
  /** Called once per FIXED step (60Hz) — run game logic here. The second
   *  argument is the total elapsed ms since the loop started running
   *  (drives time-based effects like screen-shake jitter). */
  onStep: (dtMs: number, elapsedMs: number) => void;
  /** Called once per DISPLAY frame with the interpolation alpha (0..1) —
   *  use for rendering smoothness only, never logic. */
  onRender?: (alpha: number, frameDeltaMs: number, stepsRun: number) => void;
}

export interface UseGameLoopOptions extends GameLoopCallbacks {
  /** False while the game is between runs (setup/countdown) or ended. */
  running: boolean;
  /** True while paused/backgrounded — freezes the accumulator so frozen
   *  time never counts toward the session. */
  paused: boolean;
  /** Fixed logic step in ms. Default 1000/60. */
  stepMs?: number;
  /** Max fixed steps consumed per frame (spiral-of-death clamp). */
  maxStepsPerFrame?: number;
}

/**
 * The engine's runner: a rAF loop that feeds real frame deltas through the
 * `FixedTimestep` accumulator and dispatches `onStep` per fixed step and
 * `onRender` per display frame.
 *
 * The whole loop lives on refs — no React state is touched here, so a
 * 60fps loop never re-renders the component. `paused` freezes the
 * accumulator (via the effect boundary below), and the clamp keeps
 * backgrounding/pause/resume from injecting a giant time-step.
 *
 * Every mutation happens inside the effect or the rAF callback, never during
 * render. That is not stylistic: this project runs with React Compiler
 * enabled (`app.json` → `experiments.reactCompiler`), and a ref read or
 * written in a render body is exactly what the compiler is free to reorder.
 *
 * Elapsed time is tracked in ms since the last `running` transition to
 * `true` and passed to `onStep` — consumers read it from there, never from
 * this hook's return (reading refs during render is a React lint error).
 */
export function useGameLoop({
  running,
  paused,
  onStep,
  onRender,
  stepMs = 1000 / 60,
  maxStepsPerFrame = 5,
}: UseGameLoopOptions) {
  const callbacksRef = useRef<GameLoopCallbacks>({ onStep, onRender });
  const stepRef = useRef(new FixedTimestep({ stepMs, maxStepsPerFrame }));
  const elapsedRef = useRef(0);
  const lastFrameAtRef = useRef(0);

  // Keep the latest callbacks without re-subscribing the rAF loop every
  // render — inline closures are safe to pass.
  useEffect(() => {
    callbacksRef.current = { onStep, onRender };
  });

  // Re-create the accumulator when the step config changes (rare).
  useEffect(() => {
    stepRef.current = new FixedTimestep({ stepMs, maxStepsPerFrame });
  }, [stepMs, maxStepsPerFrame]);

  useEffect(() => {
    // Not running → stop the loop entirely and reset the clock.
    if (!running) {
      stepRef.current.reset();
      elapsedRef.current = 0;
      lastFrameAtRef.current = 0;
      return;
    }
    // Paused → stop the loop so no time accumulates; the effect re-runs on
    // resume and restarts from a fresh anchor (no giant delta).
    if (paused) {
      lastFrameAtRef.current = 0;
      return;
    }

    let raf = 0;
    const frame = (nowMs: number) => {
      const lastFrameAt = lastFrameAtRef.current;
      const frameDelta = clampFrameDelta(lastFrameAt === 0 ? stepRef.current.stepMs : nowMs - lastFrameAt);
      lastFrameAtRef.current = nowMs;

      const steps = stepRef.current.advance(frameDelta);
      for (let i = 0; i < steps; i++) {
        elapsedRef.current += stepRef.current.stepMs;
        callbacksRef.current.onStep(stepRef.current.stepMs, elapsedRef.current);
      }

      callbacksRef.current.onRender?.(stepRef.current.alpha(), frameDelta, steps);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, paused, stepMs, maxStepsPerFrame]);
}
