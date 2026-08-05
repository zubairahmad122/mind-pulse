/**
 * Fixed-timestep accumulator — the heart of the game engine.
 *
 * Real devices render at variable frame rates (30–120fps), but game logic
 * (physics, collisions, spawns) must run at a *fixed* cadence or it becomes
 * non-deterministic: a 60fps device and a 30fps device would experience
 * different speeds, and pause/resume would cause time jumps. The classic
 * solution (used by real engines) is to accumulate real frame deltas and
 * consume them in fixed steps:
 *
 *   frame (16.6ms) → advance(16.6) → 1 step at 60Hz
 *   frame (33.3ms) → advance(33.3) → 2 steps at 60Hz
 *   frame (7ms)    → advance(7)    → 0 steps (accumulated for next frame)
 *
 * `alpha()` is the interpolation factor (0..1) between the last two fixed
 * steps, so rendering can smooth motion at the display rate while logic
 * stays deterministic. `maxStepsPerFrame` caps how many steps a single
 * frame may consume (the classic "spiral of death" guard): a long stall is
 * caught up gradually over a few frames — never all at once — and the
 * frame-delta clamp in `useGameLoop` bounds the backlog itself.
 *
 * Pure, no React, no timers — fully unit-testable.
 */

export interface FixedTimestepOptions {
  /** Fixed logic step length in ms. Default 1000/60 ≈ 16.67ms (60Hz). */
  stepMs?: number;
  /** Maximum fixed steps consumed per frame — drops time past this to
   *  avoid a spiral of death after long freezes/backgrounding. Default 5. */
  maxStepsPerFrame?: number;
}

export interface FixedTimestepState {
  /** Total fixed steps run since the last reset. */
  stepsRun: number;
  /** Unconsumed real time in ms, waiting for the next frame. */
  accumulatorMs: number;
  /** The last frame delta fed in (ms). */
  lastFrameDeltaMs: number;
}

export class FixedTimestep {
  readonly stepMs: number;
  readonly maxStepsPerFrame: number;

  private accumulatorMs = 0;
  private stepsRun = 0;
  private lastFrameDeltaMs = 0;

  constructor(options: FixedTimestepOptions = {}) {
    this.stepMs = options.stepMs ?? 1000 / 60;
    this.maxStepsPerFrame = options.maxStepsPerFrame ?? 5;
    if (this.stepMs <= 0) throw new Error('FixedTimestep: stepMs must be positive');
    if (this.maxStepsPerFrame < 1) throw new Error('FixedTimestep: maxStepsPerFrame must be >= 1');
  }

  /**
   * Feed one real frame delta (ms). Returns how many fixed steps the caller
   * should run this frame (0..maxStepsPerFrame). Steps beyond the per-frame
   * cap stay in the accumulator and drain on later frames — bounded
   * catch-up, never a spiral of death.
   */
  advance(frameDeltaMs: number): number {
    if (frameDeltaMs < 0) throw new Error('FixedTimestep: frame delta must be >= 0');
    this.lastFrameDeltaMs = frameDeltaMs;
    this.accumulatorMs += frameDeltaMs;

    const totalSteps = Math.floor(this.accumulatorMs / this.stepMs);
    const stepsToRun = Math.min(totalSteps, this.maxStepsPerFrame);

    if (stepsToRun > 0) {
      // Only the *consumed* steps' time is removed — anything past the cap
      // stays banked and drains over the following frames. That is safe
      // because `clampFrameDelta` bounds a single frame to 100ms (≈6 steps)
      // before it ever reaches here, so the backlog can never outgrow a
      // frame or two of catch-up.
      this.accumulatorMs -= stepsToRun * this.stepMs;
      this.stepsRun += stepsToRun;
    }

    return stepsToRun;
  }

  /** Interpolation factor 0..1 between the last two fixed steps — feed to
   *  the renderer so motion stays smooth at the display rate. */
  alpha(): number {
    return Math.max(0, Math.min(1, this.accumulatorMs / this.stepMs));
  }

  /** True when the accumulator holds at least one full step's worth of time. */
  hasPendingSteps(): boolean {
    return this.accumulatorMs >= this.stepMs;
  }

  /** Zero everything — call on reset/restart so stale time never carries
   *  into a fresh run. */
  reset(): void {
    this.accumulatorMs = 0;
    this.stepsRun = 0;
    this.lastFrameDeltaMs = 0;
  }

  state(): FixedTimestepState {
    return {
      stepsRun: this.stepsRun,
      accumulatorMs: this.accumulatorMs,
      lastFrameDeltaMs: this.lastFrameDeltaMs,
    };
  }
}

/** Clamps a raw rAF delta to a sane maximum (e.g. 100ms) so a long stall or
 *  backgrounded frame can't inject a giant time-step into the accumulator —
 *  the engine's first line of defense against pause/resume time jumps. */
export function clampFrameDelta(deltaMs: number, maxMs = 100): number {
  return Math.max(0, Math.min(maxMs, deltaMs));
}
