import type { EntityStore } from '@/engine/core/entities/entityStore';
import { randomRange, type SeededRandom } from '@/engine/core/rng';
import type { EntityId } from '@/engine/core/types';
import { COLORS, ENEMY } from './design';
import {
  PICKUP_ENERGY,
  PICKUP_SHIELD,
  PICKUP_WEAPON,
  SLOT_HORIZONTAL,
  SLOT_VERTICAL,
  type ObjData,
  type ObjKind,
  type WorldState,
} from './world';

export type Store = EntityStore<ObjData>;

interface SpawnSpec {
  kind: ObjKind;
  x: number;
  y: number;
  z: number;
  sizePx: number;
  hitRadius: number;
  hp?: number;
  vz?: number;
  vx?: number;
  vy?: number;
  spinRate?: number;
  variant?: number;
  gapHalf?: number;
  layer?: number;
  colour?: { r: number; g: number; b: number };
  ttlMs?: number;
}

/**
 * The one place objects enter the corridor.
 *
 * Every spawner below funnels through here, which is what keeps the pool's
 * invariants in one readable place: an entity's `x`/`y` are its *world*
 * offsets (the store integrates them for drift), while depth lives in
 * `data.z` because it moves with the corridor rather than with the entity.
 */
export function spawn(store: Store, spec: SpawnSpec): EntityId {
  const colour = spec.colour ?? COLORS.white;
  return store.spawn({
    kind: spec.kind,
    x: spec.x,
    y: spec.y,
    vx: spec.vx ?? 0,
    vy: spec.vy ?? 0,
    radius: spec.hitRadius,
    layer: spec.layer ?? 1,
    ttlMs: spec.ttlMs ?? -1,
    r: colour.r,
    g: colour.g,
    b: colour.b,
    data: {
      kind: spec.kind,
      z: spec.z,
      prevZ: spec.z,
      vz: spec.vz ?? 0,
      hp: spec.hp ?? 1,
      hitRadius: spec.hitRadius,
      sizePx: spec.sizePx,
      spin: 0,
      spinRate: spec.spinRate ?? 0,
      flashMs: -1,
      fireMs: 0,
      patternMs: 0,
      variant: spec.variant ?? 0,
      gapHalf: spec.gapHalf ?? 0,
      scored: false,
    },
  });
}

export function spawnDebris(world: WorldState, store: Store, rng: SeededRandom, x: number): void {
  const view = world.view;
  const size = randomRange(rng, 44, 108);
  spawn(store, {
    kind: 'debris',
    x: x * view.halfWidth,
    y: randomRange(rng, -1, 1) * view.halfHeight * 0.85,
    z: view.farZ,
    sizePx: size,
    // Forgiving: the rock's silhouette is jagged, so a hitbox matching its
    // extent would clip on corners the player believes they missed.
    hitRadius: size * 0.34,
    spinRate: randomRange(rng, -1.6, 1.6),
    vx: randomRange(rng, -16, 16),
    vy: randomRange(rng, -12, 12),
    colour: COLORS.rockLit,
    layer: 2,
  });
}

export function spawnBarrier(world: WorldState, store: Store, orientation: number, gapAt: number): void {
  const view = world.view;
  spawn(store, {
    kind: 'barrier',
    // For a vertical slot, x is the slot centre; for a horizontal one, y is.
    x: orientation === SLOT_VERTICAL ? gapAt * view.halfWidth * 0.75 : 0,
    y: orientation === SLOT_HORIZONTAL ? gapAt * view.halfHeight * 0.7 : 0,
    z: view.farZ,
    sizePx: 0,
    hitRadius: 0,
    variant: orientation,
    gapHalf: orientation === SLOT_VERTICAL ? view.halfWidth * 0.3 : view.halfHeight * 0.42,
    colour: COLORS.steelLit,
    layer: 2,
  });
}

export function spawnGate(world: WorldState, store: Store, x: number, y: number): void {
  const view = world.view;
  spawn(store, {
    kind: 'gate',
    x: x * view.halfWidth * 0.6,
    y: y * view.halfHeight * 0.6,
    z: view.farZ,
    sizePx: 0,
    hitRadius: view.halfWidth * 0.34,
    spinRate: 0.7,
    colour: COLORS.cyan,
    layer: 2,
  });
}

export function spawnScout(world: WorldState, store: Store, x: number, y: number, delayZ = 0): void {
  const view = world.view;
  spawn(store, {
    kind: 'scout',
    x: x * view.halfWidth * 0.7,
    y: y * view.halfHeight * 0.7,
    z: view.farZ + delayZ,
    sizePx: 78,
    hitRadius: 30,
    hp: ENEMY.scoutHp,
    // Scouts drift laterally so they are never a stationary target — and the
    // drift is slow enough that leading them is not a skill the slice
    // teaches, because auto-fire is doing the aiming.
    vx: (x > 0 ? -1 : 1) * 42,
    // They close more slowly than the corridor flows, which is what gives
    // the player a window to shoot them rather than merely dodge them.
    vz: 400,
    colour: COLORS.red,
    layer: 3,
  });
}

export function spawnTurret(world: WorldState, store: Store, side: number): void {
  const view = world.view;
  spawn(store, {
    kind: 'turret',
    x: side * view.halfWidth * 0.86,
    y: -view.halfHeight * 0.15,
    z: view.farZ,
    sizePx: 150,
    hitRadius: 52,
    hp: ENEMY.turretHp,
    // Closes faster than the corridor flows so it is in position and
    // charging well before the boss beat starts, then holds station once it
    // is close enough to read (see `stepEnemies`).
    vz: -1200,
    spinRate: 0.4,
    variant: side,
    colour: COLORS.red,
    layer: 3,
  });
}

export function spawnBoss(world: WorldState, store: Store): EntityId {
  const view = world.view;
  return spawn(store, {
    kind: 'boss',
    x: 0,
    y: -view.halfHeight * 0.1,
    z: view.farZ,
    sizePx: 260,
    hitRadius: 96,
    hp: ENEMY.bossHp,
    colour: COLORS.red,
    layer: 4,
  });
}

export function spawnPickup(world: WorldState, store: Store, type: number, x: number, y: number, z?: number): void {
  const view = world.view;
  const colour =
    type === PICKUP_SHIELD ? COLORS.green : type === PICKUP_WEAPON ? COLORS.violet : COLORS.amber;
  spawn(store, {
    kind: 'pickup',
    x,
    y,
    z: z ?? view.farZ,
    sizePx: 58,
    // Generous: a pickup you flew through and did not collect feels like a
    // bug, and there is no downside to catching one.
    hitRadius: 52,
    spinRate: 1.5,
    variant: type,
    colour,
    layer: 3,
    vz: 400,
  });
}

export function spawnEnergyPickup(world: WorldState, store: Store, x: number, y: number, z: number): void {
  spawnPickup(world, store, PICKUP_ENERGY, x, y, z);
}

/** A beam laid across the corridor with one narrow safe gap. */
export function spawnBeam(world: WorldState, store: Store, gapAt: number, lifeMs: number): void {
  const view = world.view;
  spawn(store, {
    kind: 'beam',
    x: gapAt * view.halfWidth * 0.55,
    y: 0,
    z: 260,
    sizePx: 0,
    hitRadius: 0,
    gapHalf: view.halfWidth * 0.2,
    ttlMs: lifeMs,
    colour: COLORS.red,
    layer: 5,
  });
}

export function spawnBolt(
  store: Store,
  kind: 'bolt' | 'ebolt',
  x: number,
  y: number,
  z: number,
  vz: number,
  vx = 0,
  vy = 0,
): void {
  spawn(store, {
    kind,
    x,
    y,
    z,
    vx,
    vy,
    vz,
    sizePx: kind === 'bolt' ? 30 : 34,
    hitRadius: kind === 'bolt' ? 30 : 26,
    colour: kind === 'bolt' ? COLORS.cyanPale : COLORS.red,
    layer: 6,
  });
}

