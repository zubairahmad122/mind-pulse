import type { AccessibilitySettings } from '@/engine/core/a11y/accessibilityPolicy';
import type { Entity } from '@/engine/core/types';
import { project } from '../perspective';
import { createCometRun, type CometRunRuntime } from '../runtime';
import type { ObjData } from '../world';

/**
 * A pilot for Comet Run.
 *
 * The point of the pure-TypeScript boundary is that the slice can be
 * *flown*, not merely unit-tested in pieces — so this drives the real
 * runtime through the real input queue at the real fixed step, and every
 * assertion in the specs is about a run that actually happened.
 *
 * `autopilot` is the interesting part: a deliberately simple threat-avoidance
 * policy that steers toward open space. It is not trying to be a good
 * player — it is trying to be a *consistent* one, so a spec can say "fly the
 * whole slice competently and assert what happened" without hand-authoring
 * 2,700 pointer events.
 */

export const STEP_MS = 1000 / 60;
export const WIDTH = 1080;
export const HEIGHT = 2000;

let clock = 0;
let afterStep: ((runtime: CometRunRuntime) => void) | null = null;

export function setAfterStep(hook: ((runtime: CometRunRuntime) => void) | null): void {
  afterStep = hook;
}

export function createHarness(accessibility?: AccessibilitySettings): CometRunRuntime {
  clock = 0;
  afterStep = null;
  const runtime = createCometRun({
    width: WIDTH,
    height: HEIGHT,
    seed: 0xc0ffee,
    accessibility,
  });
  runtime.start();
  return runtime;
}

export function step(runtime: CometRunRuntime, times = 1): void {
  for (let i = 0; i < times; i++) {
    clock += STEP_MS;
    runtime.step(STEP_MS);
    afterStep?.(runtime);
  }
}

export function stepUntil(
  runtime: CometRunRuntime,
  predicate: (runtime: CometRunRuntime) => boolean,
  what: string,
  maxSteps = 6000,
): void {
  for (let i = 0; i < maxSteps; i++) {
    if (predicate(runtime)) return;
    step(runtime);
  }
  throw new Error(`stepUntil: timed out waiting for ${what} (beat=${runtime.world.beat})`);
}

function send(runtime: CometRunRuntime, phase: 'down' | 'move' | 'up' | 'tap', x: number, y: number): void {
  runtime.pointer(0, phase, x, y, clock);
}

/** Puts a finger down and steers the ship to a world position. */
export function steerTo(runtime: CometRunRuntime, worldX: number, worldY: number): void {
  const view = runtime.world.view;
  send(runtime, 'move', view.vanishX + worldX, view.nearY + worldY + 92);
}

export function pressAt(runtime: CometRunRuntime, worldX: number, worldY: number): void {
  const view = runtime.world.view;
  send(runtime, 'down', view.vanishX + worldX, view.nearY + worldY + 92);
}

export function lift(runtime: CometRunRuntime): void {
  const view = runtime.world.view;
  send(runtime, 'up', view.vanishX, view.nearY);
}

/** Fires the special. A tap is its own gesture, never a short drag. */
export function tapSpecial(runtime: CometRunRuntime): void {
  send(runtime, 'tap', runtime.world.view.vanishX, runtime.world.view.nearY);
  step(runtime);
}

const buffer: Entity<ObjData>[] = [];

/**
 * Steers toward the safest place to be, given what is closing.
 *
 * Simple and legible on purpose: find the nearest threat about to arrive,
 * move away from it laterally, and otherwise drift toward whatever pickup or
 * gate is closest. Good enough to survive the slice, dumb enough that a spec
 * asserting "the corridor is survivable" means something.
 */
export function autopilot(runtime: CometRunRuntime): void {
  const world = runtime.world;
  const view = world.view;
  let targetX = 0;
  let targetY = 0;
  let bestThreat = Infinity;
  let bestPrize = Infinity;

  for (const kind of ['debris', 'barrier', 'beam', 'ebolt', 'scout', 'boss'] as const) {
    runtime.deps.store.queryInto(kind, buffer);
    for (const entity of buffer) {
      const data = entity.data;
      if (!data || data.z <= 0 || data.z > 2600) continue;
      if (data.z >= bestThreat) continue;
      bestThreat = data.z;

      if (kind === 'barrier' || kind === 'beam') {
        // Aim straight down the middle of the opening.
        targetX = data.kind === 'beam' || data.variant === 0 ? entity.x : 0;
        targetY = data.kind === 'beam' ? 0 : data.variant === 1 ? entity.y : 0;
      } else {
        // Slide to the far side of the corridor from whatever is closing.
        targetX = entity.x > 0 ? -view.halfWidth * 0.55 : view.halfWidth * 0.55;
        targetY = entity.y > 0 ? -view.halfHeight * 0.4 : view.halfHeight * 0.4;
      }
    }
  }

  if (bestThreat === Infinity) {
    for (const kind of ['pickup', 'gate'] as const) {
      runtime.deps.store.queryInto(kind, buffer);
      for (const entity of buffer) {
        const data = entity.data;
        if (!data || data.z <= 0 || data.z > 4200 || data.z >= bestPrize) continue;
        bestPrize = data.z;
        targetX = entity.x;
        targetY = entity.y;
      }
    }
  }

  steerTo(runtime, targetX, targetY);
}

/** Flies the slice under autopilot, spending the special whenever it is up. */
export function flySlice(
  runtime: CometRunRuntime,
  options: { steps?: number; useSpecial?: boolean; until?: (r: CometRunRuntime) => boolean } = {},
): void {
  const maxSteps = options.steps ?? 4200;
  const useSpecial = options.useSpecial ?? true;
  pressAt(runtime, 0, 0);

  for (let i = 0; i < maxSteps; i++) {
    if (options.until?.(runtime)) return;
    if (runtime.phase() === 'ended') return;
    autopilot(runtime);
    if (useSpecial && runtime.world.energy >= 100) {
      send(runtime, 'tap', view(runtime).vanishX, view(runtime).nearY);
    }
    step(runtime);
  }
}

function view(runtime: CometRunRuntime) {
  return runtime.world.view;
}

/** Screen position of a world point — used by the render specs. */
export function screenOf(runtime: CometRunRuntime, x: number, y: number, z: number) {
  const at = project(runtime.world.view, x, y, z);
  return { x: at.x, y: at.y, k: at.k };
}
