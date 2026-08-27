import type { RenderFrame } from '../render/renderFrame';
import type { EndReason } from '../types';

/**
 * Minimal scene manager — deliberately flat.
 *
 * A game is a sequence of stages (intro → wave 1 → wave 2 → boss → results),
 * and every one of those is a *replace*, never a push. There is no scene
 * stack here because nothing in the roadmap needs to return to a suspended
 * scene, and a stack you don't need is a stack that leaks state between
 * runs. Pause is a lifecycle phase, not a scene.
 *
 * Scenes are plain objects with a shared context — no React, no classes
 * required, and a stage's rules can be stepped and asserted on in a test
 * with no renderer present.
 */
export type SceneParams = Record<string, number | string | boolean>;

export type SceneCommand =
  | { type: 'replace'; scene: string; params?: SceneParams }
  | { type: 'end'; reason: EndReason };

export interface Scene<TCtx> {
  readonly id: string;
  enter(ctx: TCtx, params?: SceneParams): void;
  /** Return a command to transition, or nothing to stay. */
  step(ctx: TCtx, dtMs: number, elapsedMs: number): SceneCommand | void;
  /** Optional per-display-frame draw. `alpha` is the fixed-step
   *  interpolation factor — use it for smoothing, never for logic. */
  draw?(ctx: TCtx, frame: RenderFrame, alpha: number): void;
  exit(ctx: TCtx): void;
}

export interface SceneManager<TCtx> {
  readonly activeId: string | null;
  readonly ended: boolean;
  readonly endReason: EndReason | null;

  register(scene: Scene<TCtx>): void;
  goTo(sceneId: string, ctx: TCtx, params?: SceneParams): void;
  step(ctx: TCtx, dtMs: number, elapsedMs: number): void;
  draw(ctx: TCtx, frame: RenderFrame, alpha: number): void;
  reset(ctx: TCtx): void;
}

export function createSceneManager<TCtx>(): SceneManager<TCtx> {
  const scenes = new Map<string, Scene<TCtx>>();
  let active: Scene<TCtx> | null = null;
  let ended = false;
  let endReason: EndReason | null = null;
  /** Time inside the current scene — reset on every transition, so a stage
   *  can time itself without knowing the session clock. */
  let sceneElapsedMs = 0;

  const apply = (cmd: SceneCommand, ctx: TCtx) => {
    if (cmd.type === 'end') {
      active?.exit(ctx);
      active = null;
      ended = true;
      endReason = cmd.reason;
      return;
    }
    const next = scenes.get(cmd.scene);
    if (!next) throw new Error(`SceneManager: unknown scene "${cmd.scene}"`);
    active?.exit(ctx);
    active = next;
    sceneElapsedMs = 0;
    next.enter(ctx, cmd.params);
  };

  return {
    get activeId() { return active?.id ?? null; },
    get ended() { return ended; },
    get endReason() { return endReason; },

    register(scene) {
      if (scenes.has(scene.id)) throw new Error(`SceneManager: duplicate scene "${scene.id}"`);
      scenes.set(scene.id, scene);
    },

    goTo(sceneId, ctx, params) {
      apply({ type: 'replace', scene: sceneId, params }, ctx);
    },

    step(ctx, dtMs, elapsedMs) {
      if (!active || ended) return;
      sceneElapsedMs += dtMs;
      const cmd = active.step(ctx, dtMs, sceneElapsedMs);
      if (cmd) apply(cmd, ctx);
      // Deliberately one transition per step: a scene that immediately
      // transitions again gets the next step to do it, which makes an
      // accidental transition loop a slow bug instead of a hung frame.
      void elapsedMs;
    },

    draw(ctx, frame, alpha) {
      active?.draw?.(ctx, frame, alpha);
    },

    reset(ctx) {
      active?.exit(ctx);
      active = null;
      ended = false;
      endReason = null;
      sceneElapsedMs = 0;
    },
  };
}
