import type { EntityId } from '@/engine/core/types';
import { RUN } from './design';
import { createPerspective, type Perspective } from './perspective';

/**
 * The corridor's state — one plain object, no behaviour.
 *
 * Everything the simulation mutates and the renderer reads lives here, so a
 * whole 45-second run is reproducible: seed the RNG, replay an input stream,
 * and this object walks the same path every time. The React shell holds a
 * reference but never reads it during render.
 */

export type ObjKind =
  /** Tumbling rock and relay wreckage — hit it and you lose shield. */
  | 'debris'
  /** A wall across the corridor with one slot through it. */
  | 'barrier'
  /** An energy gate: fly through the ring for score and energy. */
  | 'gate'
  | 'scout'
  | 'turret'
  | 'boss'
  /** Player bolt. */
  | 'bolt'
  /** Enemy bolt. */
  | 'ebolt'
  | 'pickup'
  /** A sweeping beam with a narrow safe gap. */
  | 'beam'
  /** Tumbling wreckage thrown off by an explosion. Decorative — it has no
   *  collider, because debris that could kill you after you already won the
   *  exchange reads as the game cheating. */
  | 'shard';

export const PICKUP_ENERGY = 0;
export const PICKUP_SHIELD = 1;
export const PICKUP_WEAPON = 2;

/** Barrier slot orientation — one asks for a lateral dodge, the other for a
 *  vertical one, so two barriers in a row are two different questions. */
export const SLOT_VERTICAL = 0;
export const SLOT_HORIZONTAL = 1;

export interface ObjData {
  kind: ObjKind;
  /** Depth ahead of the camera, world units. Falls as the corridor flows. */
  z: number;
  /**
   * `z` at the end of the previous step.
   *
   * Every collision in this game is a *swept* test — "did this object cross
   * the ship's plane between last step and this one" — rather than "is it
   * near the ship right now". At 3,400 units/second an object covers ~57
   * units per step, so a proximity band would have to be wider than the
   * objects themselves to catch anything, and would then catch things the
   * player had already flown past. The sweep is exact at any speed.
   */
  prevZ: number;
  /** Extra depth velocity on top of the corridor flow, units/sec. */
  vz: number;
  hp: number;
  /** Collision radius in world units (= px at the near plane). */
  hitRadius: number;
  /** Draw size in px at the near plane. */
  sizePx: number;
  spin: number;
  spinRate: number;
  /** Ms since this object was last damaged; -1 when clean. */
  flashMs: number;
  /** Countdown to the next shot, ms. */
  fireMs: number;
  /** Time inside the current attack pattern, ms. */
  patternMs: number;
  /** Which pattern/variant: pickup type, slot orientation, boss phase. */
  variant: number;
  /** Half-width of a barrier slot or beam gap, world units. */
  gapHalf: number;
  /** Set once a pass-through bonus has been awarded. */
  scored: boolean;
}

export type RunBeat =
  | 'launch'
  | 'debris'
  | 'combat'
  | 'turret'
  | 'boss'
  | 'checkpoint'
  | 'failed';

export interface ShipState {
  /** World position. z is always 0 — the ship defines the near plane. */
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  /** Where the finger wants it. */
  targetX: number;
  targetY: number;
  /** Roll, radians. */
  bank: number;
  /** Ms of remaining invulnerability. */
  iframesMs: number;
  /** Ms since the last hit landed; -1 when clean. */
  hitMs: number;
  /** Countdown to the next auto-fire shot. */
  fireMs: number;
  /** Ms left on the triple-shot upgrade; 0 when stock. */
  upgradeMs: number;
  /** Ms into the launch animation, or -1 once flying. */
  launchMs: number;
  /** True while a finger is steering — drives the thruster flare. */
  steering: boolean;
}

export interface CommsLine {
  speaker: string;
  text: string;
  /** Ms remaining on screen. */
  remainingMs: number;
}

export interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  warm: boolean;
}

export interface Nebula {
  /** Screen-space fraction, because the deep field does not parallax by z. */
  xFrac: number;
  yFrac: number;
  radiusFrac: number;
  warm: boolean;
}

export interface WorldState {
  width: number;
  height: number;
  view: Perspective;

  elapsedMs: number;
  beat: RunBeat;
  beatMs: number;
  /** Index of the next scripted event to fire. */
  scriptCursor: number;

  /** Current corridor speed, world units/sec, and what it is heading toward. */
  speed: number;
  targetSpeed: number;
  /** Total distance flown — the HUD's "distance to checkpoint". */
  distance: number;

  shield: number;
  energy: number;
  /** Ms left on the special's screen effect; 0 when idle. */
  specialMs: number;

  ship: ShipState;
  comms: CommsLine;
  banner: string;
  bannerMs: number;

  /** The mini-boss, while it lives. */
  bossId: EntityId;
  /** Set when the relay checkpoint has been reached. */
  checkpointDone: boolean;

  /** Rolling z-offset for corridor frames, so they flow past. */
  frameOffsetZ: number;

  stars: Star[];
  nebulae: Nebula[];
}

export function createWorld(width: number, height: number, rng: () => number): WorldState {
  const view = createPerspective(width, height);

  const world: WorldState = {
    width,
    height,
    view,

    elapsedMs: 0,
    beat: 'launch',
    beatMs: 0,
    scriptCursor: 0,

    speed: RUN.baseSpeed * 0.25,
    targetSpeed: RUN.baseSpeed,
    distance: 0,

    shield: RUN.startShield,
    energy: RUN.startEnergy,
    specialMs: 0,

    ship: {
      x: 0,
      y: 0,
      prevX: 0,
      prevY: 0,
      targetX: 0,
      targetY: 0,
      bank: 0,
      iframesMs: 0,
      hitMs: -1,
      fireMs: 0,
      upgradeMs: 0,
      launchMs: 0,
      steering: false,
    },

    comms: { speaker: '', text: '', remainingMs: 0 },
    banner: '',
    bannerMs: 0,

    bossId: -1,
    checkpointDone: false,
    frameOffsetZ: 0,

    stars: [],
    nebulae: [],
  };

  // Stars carry a real `z` so they stream past with the corridor and streak
  // under speed. A flat 2D starfield in a forward runner reads as wallpaper;
  // this one is the primary speed cue when nothing else is on screen.
  for (let i = 0; i < 46; i++) {
    world.stars.push({
      x: (rng() * 2 - 1) * view.halfWidth * 3.4,
      y: (rng() * 2 - 1) * view.halfHeight * 3.6,
      z: rng() * view.farZ,
      size: 1.6 + rng() * 2.6,
      warm: rng() > 0.82,
    });
  }

  for (let i = 0; i < 5; i++) {
    world.nebulae.push({
      xFrac: 0.1 + rng() * 0.8,
      yFrac: 0.06 + rng() * 0.42,
      radiusFrac: 0.3 + rng() * 0.4,
      warm: rng() > 0.55,
    });
  }

  return world;
}

/** Recomputes everything that depends on canvas size. Safe on rotate. */
export function layoutWorld(world: WorldState, width: number, height: number): void {
  world.width = width;
  world.height = height;
  world.view = createPerspective(width, height);
}

/** Recycles a star that has passed the camera back out to the horizon, so
 *  the field never thins out over a long run. */
export function recycleStar(star: Star, view: Perspective, rng: () => number): void {
  star.z += view.farZ;
  star.x = (rng() * 2 - 1) * view.halfWidth * 3.4;
  star.y = (rng() * 2 - 1) * view.halfHeight * 3.6;
}

export function say(world: WorldState, speaker: string, text: string, ms = 4200): void {
  world.comms.speaker = speaker;
  world.comms.text = text;
  world.comms.remainingMs = ms;
}

export function banner(world: WorldState, text: string, ms = 2200): void {
  world.banner = text;
  world.bannerMs = ms;
}
