import type { AccessibilityPolicy } from '@/engine/core/a11y/accessibilityPolicy';
import type { CameraShake } from '@/engine/core/fx/cameraShake';
import type { ParticleSystem } from '@/engine/core/fx/particles';
import type { PopupSystem } from '@/engine/core/fx/popups';
import type { PointerEvent } from '@/engine/core/input/inputManager';
import type { MetricsRecorder } from '@/engine/core/metrics/metricsRecorder';
import type { FeedbackPort } from '@/engine/core/ports/feedbackPort';
import type { SeededRandom } from '@/engine/core/rng';
import { clamp, type Entity } from '@/engine/core/types';
import { COLORS, DAMAGE, ENEMY, MISSION, REWARD, RUN, SHIP, SPECIAL, WEAPON } from './design';
import { project } from './perspective';
import { SCORE_UNIT } from './scoring';
import { advanceScript } from './script';
import { spawn, spawnBolt, spawnPickup, type Store } from './spawn';
import {
  PICKUP_ENERGY,
  PICKUP_SHIELD,
  PICKUP_WEAPON,
  SLOT_VERTICAL,
  banner,
  recycleStar,
  say,
  type ObjData,
  type WorldState,
} from './world';

/**
 * The simulation — every rule of Comet Run, in pure TypeScript.
 *
 * Nothing here knows how anything looks. It runs against injected engine
 * systems (pool, particles, popups, shake, metrics, feedback, accessibility)
 * so a whole 45-second run can be flown by a Jest spec with no renderer, no
 * React and no device attached, which is exactly what the specs do.
 *
 * Step order matters and is fixed: input → script → ship → objects →
 * enemies → collisions → beats. Collisions run *after* everything has moved
 * so a hit is resolved against the positions the player actually saw, and
 * beats run last so a boss that died this step is gone before the beat
 * machine looks for it.
 */

export interface SimDeps {
  store: Store;
  particles: ParticleSystem;
  popups: PopupSystem;
  shake: CameraShake;
  metrics: MetricsRecorder;
  feedback: FeedbackPort;
  policy: AccessibilityPolicy;
  rng: SeededRandom;
}

export interface PointerFrame {
  /** A finger is down and steering. */
  steering: boolean;
  x: number;
  y: number;
  /** The tap recogniser fired this step — the special attack's only input. */
  tapped: boolean;
}

export function createPointerFrame(): PointerFrame {
  return { steering: false, x: 0, y: 0, tapped: false };
}

export function readPointer(
  events: readonly PointerEvent[],
  previous: PointerFrame,
  out: PointerFrame,
): PointerFrame {
  out.steering = previous.steering;
  out.x = previous.x;
  out.y = previous.y;
  out.tapped = false;

  for (const event of events) {
    if (event.phase === 'tap') {
      // A tap never moves the ship. Steering follows the drag stream only,
      // so a second-finger tap for the special cannot yank the hull across
      // the corridor at the worst possible moment.
      out.tapped = true;
      continue;
    }
    out.x = event.x;
    out.y = event.y;
    if (event.phase === 'down' || event.phase === 'move') out.steering = true;
    else out.steering = false;
  }
  return out;
}

export interface SimOutcome {
  finished: null | 'completed' | 'failed' | 'timeout';
}

const outcome: SimOutcome = { finished: null };
// Reused query buffers — `queryInto` fills them in place, so a live step
// allocates nothing.
const boltBuffer: Entity<ObjData>[] = [];
const enemyBuffer: Entity<ObjData>[] = [];
const sweepBuffer: Entity<ObjData>[] = [];

const ENEMY_KINDS = ['scout', 'turret', 'boss'] as const;

/**
 * Fires a particle burst at a *world* point, projected to screen.
 *
 * The particle system is screen-space — it has no idea the corridor has
 * depth. So every effect has to be projected on the way in, and its size
 * scaled by the same `k` as the thing that spawned it, or an explosion at
 * the horizon arrives full-size in the middle of the frame.
 */
function burstAt(
  world: WorldState,
  deps: SimDeps,
  x: number,
  y: number,
  z: number,
  spec: { count: number; preset?: 'burst' | 'spark'; colour: { r: number; g: number; b: number }; speed: number; size: number; lifeMs: number },
): void {
  const at = project(world.view, x, y, z);
  const k = Math.max(0.12, at.k);
  deps.particles.burst({
    x: at.x,
    y: at.y,
    count: spec.count,
    preset: spec.preset ?? 'burst',
    r: spec.colour.r, g: spec.colour.g, b: spec.colour.b,
    speedPxPerSec: spec.speed * k,
    sizePx: spec.size * k,
    lifeMs: spec.lifeMs,
  });
}

export function stepRun(
  world: WorldState,
  deps: SimDeps,
  pointer: PointerFrame,
  dtMs: number,
): SimOutcome {
  outcome.finished = null;
  const dt = dtMs / 1000;

  world.elapsedMs += dtMs;
  world.beatMs += dtMs;
  if (world.bannerMs > 0) world.bannerMs -= dtMs;
  if (world.comms.remainingMs > 0) world.comms.remainingMs -= dtMs;
  if (world.specialMs > 0) world.specialMs = Math.max(0, world.specialMs - dtMs);

  // Speed easing. The corridor never snaps to a new speed: acceleration is
  // most of what the player feels as "this is getting worse".
  world.speed += (world.targetSpeed - world.speed) * Math.min(1, dt * RUN.speedLerp * 2);
  world.distance += world.speed * dt;
  world.frameOffsetZ = (world.frameOffsetZ + world.speed * dt) % CORRIDOR_FRAME_SPACING;

  advanceScript(world, deps.store, deps.rng);
  stepStars(world, deps, dt);
  stepShip(world, deps, pointer, dtMs);
  if (pointer.tapped) fireSpecial(world, deps);
  stepObjects(world, deps, dtMs);
  stepEnemies(world, deps, dtMs);
  resolveCollisions(world, deps);
  advanceBeats(world, deps);

  if (world.shield <= 0 && world.beat !== 'failed') {
    world.shield = 0;
    world.beat = 'failed';
    world.beatMs = 0;
    banner(world, 'HULL BREACH');
    deps.feedback.sound('end');
    outcome.finished = 'failed';
    return outcome;
  }

  if (world.checkpointDone && world.beatMs >= MISSION.checkpointHoldMs) {
    outcome.finished = 'completed';
    return outcome;
  }

  // Generous cap: the scripted slice is 45s, and this only catches a player
  // who has stopped engaging with the boss entirely.
  if (world.elapsedMs >= MISSION.sliceMs * 2) outcome.finished = 'timeout';
  return outcome;
}

// ── Background ─────────────────────────────────────────────────────────────

export const CORRIDOR_FRAME_SPACING = 1250;

function stepStars(world: WorldState, deps: SimDeps, dt: number): void {
  for (const star of world.stars) {
    star.z -= world.speed * dt;
    if (star.z <= 12) recycleStar(star, world.view, deps.rng);
  }
}

// ── Ship ───────────────────────────────────────────────────────────────────

function stepShip(world: WorldState, deps: SimDeps, pointer: PointerFrame, dtMs: number): void {
  const ship = world.ship;
  const view = world.view;
  const dt = dtMs / 1000;

  ship.prevX = ship.x;
  ship.prevY = ship.y;
  ship.steering = pointer.steering;
  if (ship.iframesMs > 0) ship.iframesMs = Math.max(0, ship.iframesMs - dtMs);
  if (ship.hitMs >= 0) ship.hitMs += dtMs;
  if (ship.upgradeMs > 0) ship.upgradeMs = Math.max(0, ship.upgradeMs - dtMs);

  // Launch: the ship flies up into frame under its own power before control
  // is handed over, so the first thing the player sees is their ship
  // arriving rather than a HUD appearing over a static scene.
  if (ship.launchMs >= 0) {
    ship.launchMs += dtMs;
    const t = Math.min(1, ship.launchMs / 1400);
    ship.y = view.halfHeight * 1.9 * (1 - t) * (1 - t);
    ship.x = 0;
    if (ship.launchMs >= 1400) ship.launchMs = -1;
    return;
  }

  if (pointer.steering) {
    // Absolute positioning with a lift: the hull sits above the finger so the
    // thumb never covers the thing being steered. Relative dragging tests
    // better on paper and worse in the hand — players expect the ship under
    // their thumb, just not *under* it.
    ship.targetX = pointer.x - view.vanishX;
    ship.targetY = pointer.y - view.nearY - SHIP.fingerLiftPx;
  }
  ship.targetX = clamp(ship.targetX, -view.halfWidth, view.halfWidth);
  ship.targetY = clamp(ship.targetY, -view.halfHeight, view.halfHeight);

  const follow = Math.min(1, dt * SHIP.followRate);
  ship.x += (ship.targetX - ship.x) * follow;
  ship.y += (ship.targetY - ship.y) * follow;

  const lateral = (ship.x - ship.prevX) / (dt || 1);
  const targetBank = clamp(lateral * SHIP.bankPerSpeed, -SHIP.maxBankRad, SHIP.maxBankRad);
  ship.bank += (targetBank - ship.bank) * Math.min(1, dt * 10);

  // Auto-fire. Always on, because the brief's control set is "drag and tap" —
  // a fire button would be a third thing to learn and a fourth thing to miss.
  ship.fireMs -= dtMs;
  if (ship.fireMs <= 0) {
    const upgraded = ship.upgradeMs > 0;
    ship.fireMs = upgraded ? WEAPON.upgradeIntervalMs : WEAPON.intervalMs;
    const muzzleZ = 60;
    const aim = aimAt(world, deps, muzzleZ);

    spawnBolt(deps.store, 'bolt', ship.x, ship.y - 12, muzzleZ, WEAPON.boltSpeedZ, aim.x, aim.y);
    if (upgraded) {
      const spread = WEAPON.boltSpeedZ * WEAPON.spread;
      spawnBolt(deps.store, 'bolt', ship.x - 16, ship.y - 4, muzzleZ, WEAPON.boltSpeedZ, aim.x - spread, aim.y);
      spawnBolt(deps.store, 'bolt', ship.x + 16, ship.y - 4, muzzleZ, WEAPON.boltSpeedZ, aim.x + spread, aim.y);
    }
  }
}

const aimVector = { x: 0, y: 0 };

/**
 * Lateral velocity that will put a bolt on the nearest target.
 *
 * The brief says the weapon "auto-fires at enemies in range", and it has to
 * mean *at* — a corridor where enemies drift sideways and bolts fly dead
 * straight is one where the player's shots visibly miss things they are
 * pointed at, and reads as the gun being broken rather than as a skill
 * check. There is no aiming input in this game, so the aiming is the game's
 * job.
 *
 * The lead is exact rather than approximate: bolt and target both move
 * along z, so their closing rate is the difference of their own `vz` values
 * (the corridor's speed cancels), and the flight time follows from that.
 * Nothing is fudged, so a bolt fired at a target that then changes course
 * genuinely misses.
 */
function aimAt(world: WorldState, deps: SimDeps, muzzleZ: number): { x: number; y: number } {
  aimVector.x = 0;
  aimVector.y = 0;

  let best: Entity<ObjData> | undefined;
  let bestZ = Infinity;
  for (const kind of ENEMY_KINDS) {
    deps.store.queryInto(kind, enemyBuffer);
    for (const enemy of enemyBuffer) {
      const data = enemy.data;
      if (!data || data.z <= muzzleZ + 60 || data.z > world.view.farZ * 0.62) continue;
      if (data.z < bestZ) {
        bestZ = data.z;
        best = enemy;
      }
    }
  }
  if (!best?.data) return aimVector;

  const closing = WEAPON.boltSpeedZ - best.data.vz;
  if (closing <= 0) return aimVector;
  const flight = (best.data.z - muzzleZ) / closing;

  aimVector.x = (best.x + best.vx * flight - world.ship.x) / flight;
  aimVector.y = (best.y + best.vy * flight - world.ship.y) / flight;
  return aimVector;
}

function fireSpecial(world: WorldState, deps: SimDeps): void {
  if (world.energy < SPECIAL.cost || world.ship.launchMs >= 0) return;

  world.specialMs = SPECIAL.durationMs;

  deps.store.queryInto('ebolt', sweepBuffer);
  for (const bolt of sweepBuffer.slice()) deps.store.kill(bolt.id);

  for (const kind of ENEMY_KINDS) {
    deps.store.queryInto(kind, sweepBuffer);
    for (const enemy of sweepBuffer.slice()) {
      if (enemy.active) damageEnemy(world, deps, enemy, SPECIAL.damage);
    }
  }

  burstAt(world, deps, 0, 0, 0, {
    count: 46, colour: COLORS.cyanPale, speed: 720, size: 12, lifeMs: 720,
  });
  deps.popups.add({
    x: world.view.vanishX, y: world.view.nearY - 150, text: 'LANCE',
    r: COLORS.cyanPale.r, g: COLORS.cyanPale.g, b: COLORS.cyanPale.b, sizePx: 30,
  });
  deps.shake.kick(0.9, 380);
  deps.feedback.sound('combo');
  deps.feedback.haptic('combo');

  // Zeroed *after* the sweep, not before: kills refund energy, and a special
  // that partly recharged itself would make spamming it the whole strategy.
  world.energy = 0;
}

// ── Objects ────────────────────────────────────────────────────────────────

function stepObjects(world: WorldState, deps: SimDeps, dtMs: number): void {
  const dt = dtMs / 1000;
  deps.store.forEachActive(entity => {
    const data = entity.data;
    if (!data) return;

    data.prevZ = data.z;
    // The corridor flows past at `speed`; an object's own `vz` is measured
    // against that, so vz = speed means "holds station" and vz > speed means
    // "outruns the player".
    data.z += (data.vz - world.speed) * dt;
    data.spin += data.spinRate * dt;
    if (data.flashMs >= 0) data.flashMs += dtMs;

    // Despawn behind the camera, or once a bolt has run out of range.
    // Killing the entity currently being visited is safe — the pool iterates
    // by slot index and this one has already been handed to us.
    const maxZ = data.kind === 'bolt'
      ? world.view.farZ * WEAPON.rangeFrac
      : world.view.farZ * 1.3;
    if (data.z < -420 || data.z > maxZ) deps.store.kill(entity.id);
  });
}

// ── Enemies ────────────────────────────────────────────────────────────────

function stepEnemies(world: WorldState, deps: SimDeps, dtMs: number): void {
  deps.store.queryInto('scout', enemyBuffer);
  for (const scout of enemyBuffer) {
    const data = scout.data;
    if (!data) continue;
    // Turn around at the corridor wall so a scout never drifts out of play
    // and out of the fight.
    if (Math.abs(scout.x) > world.view.halfWidth * 0.85) scout.vx = -scout.vx;

    data.fireMs -= dtMs;
    if (data.fireMs <= 0 && data.z > 300 && data.z < world.view.farZ * 0.55) {
      data.fireMs = ENEMY.scoutFireMs;
      fireAtShip(world, deps, scout, ENEMY.scoutBulletSpeedZ);
    }
  }

  deps.store.queryInto('turret', enemyBuffer);
  for (const turret of enemyBuffer) {
    const data = turret.data;
    if (!data) continue;
    // Hold station once it is close enough to read, then cycle: charge,
    // fire, cool down. The hold is time-limited — an emplacement that never
    // leaves would still be firing during the boss, and the slice's beats
    // are supposed to end when the next one starts.
    if (data.z > 2600) continue;
    data.fireMs += dtMs;
    data.vz = data.fireMs > 7000 ? -700 : world.speed;

    data.patternMs += dtMs;
    const cycle = ENEMY.turretTelegraphMs + ENEMY.turretBeamMs;
    if (data.patternMs >= cycle) {
      data.patternMs = 0;
      data.variant = -data.variant || 1;
    }
    if (data.patternMs >= ENEMY.turretTelegraphMs && !data.scored) {
      data.scored = true;
      spawnBeamWall(world, deps, data.variant > 0 ? 0.55 : -0.55);
      deps.feedback.sound('warning');
    }
    if (data.patternMs < ENEMY.turretTelegraphMs) data.scored = false;
  }

  const boss = world.bossId >= 0 ? deps.store.get(world.bossId) : undefined;
  if (boss?.data) stepBoss(world, deps, boss, boss.data, dtMs);
}

/**
 * The Helix Interceptor.
 *
 * Two patterns, alternating, each announced before it starts:
 *
 *   0 · **Helix spray** — a rotating twin stream of bolts that walks across
 *       the corridor. Survivable by moving *with* the rotation, which is a
 *       thing the player can see rather than memorise.
 *   1 · **Twin sweep** — a telegraphed reticle, then a beam wall with one
 *       gap, rushing in. The same vocabulary the turret already taught, at
 *       twice the size.
 *
 * Both are readable at a glance because both reuse shapes the corridor has
 * already introduced. A boss that invents new rules in its first nine
 * seconds is a boss nobody beats on their first run.
 */
function stepBoss(
  world: WorldState,
  deps: SimDeps,
  boss: Entity<ObjData>,
  data: ObjData,
  dtMs: number,
): void {
  // Close to its holding station, then match the corridor speed and weave.
  // The approach is brisk on purpose: every second spent flying in is a
  // second the player is shooting it before the fight has started.
  if (data.z > 1500) {
    data.vz = world.speed * 0.3;
    return;
  }
  data.vz = world.speed;
  boss.x = Math.sin(world.elapsedMs * 0.00075) * world.view.halfWidth * 0.52;
  boss.y = -world.view.halfHeight * 0.1 + Math.sin(world.elapsedMs * 0.0011) * world.view.halfHeight * 0.18;

  data.patternMs += dtMs;
  if (data.patternMs >= ENEMY.bossPatternMs) {
    data.patternMs = 0;
    data.variant = data.variant === 0 ? 1 : 0;
    data.scored = false;
    banner(world, data.variant === 0 ? 'HELIX SPRAY' : 'BEAM SWEEP', 1500);
    deps.feedback.sound('warning');
  }

  if (data.variant === 0) {
    data.fireMs -= dtMs;
    if (data.fireMs <= 0) {
      data.fireMs = 190;
      const angle = data.patternMs * 0.0042;
      const reach = world.view.halfWidth * 0.55;
      fireBolt(world, deps, boss, Math.cos(angle) * reach, Math.sin(angle) * reach * 0.5);
      fireBolt(world, deps, boss, -Math.cos(angle) * reach, -Math.sin(angle) * reach * 0.5);
    }
    return;
  }

  if (!data.scored && data.patternMs >= ENEMY.bossTelegraphMs) {
    data.scored = true;
    spawnBeamWall(world, deps, boss.x > 0 ? -0.5 : 0.5);
  }
}

/** Aims a bolt at where the ship is now — leading is not a skill this slice
 *  teaches, and a perfectly-led shot is indistinguishable from an unfair one. */
function fireAtShip(world: WorldState, deps: SimDeps, from: Entity<ObjData>, speedZ: number): void {
  const data = from.data;
  if (!data) return;
  const closing = world.speed + speedZ;
  const flight = data.z / closing;
  const vx = flight > 0 ? (world.ship.x - from.x) / flight : 0;
  const vy = flight > 0 ? (world.ship.y - from.y) / flight : 0;
  spawnBolt(deps.store, 'ebolt', from.x, from.y, data.z, -speedZ, vx * 0.85, vy * 0.85);
  deps.feedback.sound('warning');
}

/** Fires a bolt on a fixed lateral vector — the boss's spray pattern. */
function fireBolt(world: WorldState, deps: SimDeps, from: Entity<ObjData>, vx: number, vy: number): void {
  const data = from.data;
  if (!data) return;
  spawnBolt(deps.store, 'ebolt', from.x, from.y, data.z, -ENEMY.scoutBulletSpeedZ * 0.8, vx, vy);
}

/** A wall of beam across the corridor with one gap, rushing the player. */
function spawnBeamWall(world: WorldState, deps: SimDeps, gapAt: number): void {
  spawn(deps.store, {
    kind: 'beam',
    x: gapAt * world.view.halfWidth * 0.62,
    y: 0,
    z: 1750,
    sizePx: 0,
    hitRadius: 0,
    gapHalf: world.view.halfWidth * 0.24,
    colour: COLORS.red,
    layer: 5,
  });
  deps.shake.kick(0.35, 240);
}

// ── Collisions ─────────────────────────────────────────────────────────────

/** True when an object crossed the ship's plane during this step. */
function crossedShipPlane(data: ObjData): boolean {
  return data.prevZ > 0 && data.z <= 0;
}

function resolveCollisions(world: WorldState, deps: SimDeps): void {
  resolvePlayerBolts(world, deps);

  // Two phases on purpose. Resolving a hit spawns shards and pickups and
  // kills entities, and doing that *inside* `forEachActive` would mutate the
  // pool mid-iteration — so the crossings are collected first and acted on
  // second. The pool's contract says the iteration callback must not spawn
  // or kill; this is how that promise is kept.
  sweepBuffer.length = 0;
  deps.store.forEachActive(entity => {
    const data = entity.data;
    if (!data || data.kind === 'bolt') return;
    if (crossedShipPlane(data)) sweepBuffer.push(entity);
  });

  for (const entity of sweepBuffer) {
    const data = entity.data;
    if (!data || !entity.active) continue;

    const ship = world.ship;
    const dx = entity.x - ship.x;
    const dy = entity.y - ship.y;
    const distance = Math.hypot(dx, dy);

    switch (data.kind) {
      case 'debris':
        if (distance < SHIP.hitRadius + data.hitRadius) {
          hitShip(world, deps, DAMAGE.debris, entity.x, entity.y);
          shatter(world, deps, entity, COLORS.rockLit);
          deps.store.kill(entity.id);
        }
        break;

      case 'barrier': {
        const off = data.variant === SLOT_VERTICAL ? Math.abs(dx) : Math.abs(dy);
        if (off > data.gapHalf - SHIP.hitRadius) {
          hitShip(world, deps, DAMAGE.barrier, ship.x, ship.y);
        } else {
          // Threading a slot cleanly is worth a combo tick — the corridor
          // should reward good flying, not merely fail to punish it.
          award(world, deps, REWARD.gateScore * 0.4, ship.x, ship.y, 'CLEAN', COLORS.cyanPale);
        }
        break;
      }

      case 'beam': {
        if (Math.abs(dx) > data.gapHalf - SHIP.hitRadius) {
          hitShip(world, deps, DAMAGE.beam, ship.x, ship.y);
        }
        deps.store.kill(entity.id);
        break;
      }

      case 'gate':
        if (distance < data.hitRadius) {
          const checkpoint = data.variant === 1;
          world.energy = clamp(world.energy + REWARD.energyPerGate, 0, RUN.maxEnergy);
          award(
            world, deps,
            checkpoint ? REWARD.checkpointScore : REWARD.gateScore,
            entity.x, entity.y,
            checkpoint ? 'CHECKPOINT RESTORED' : 'GATE',
            checkpoint ? COLORS.green : COLORS.cyan,
          );
          if (checkpoint) completeCheckpoint(world, deps);
        }
        deps.store.kill(entity.id);
        break;

      case 'pickup':
        if (distance < deps.policy.targetRadius(data.hitRadius)) {
          collect(world, deps, data.variant, entity.x, entity.y);
          deps.store.kill(entity.id);
        }
        break;

      case 'ebolt':
        if (distance < SHIP.hitRadius + data.hitRadius) {
          hitShip(world, deps, DAMAGE.enemyBullet, entity.x, entity.y);
        }
        deps.store.kill(entity.id);
        break;

      case 'scout':
      case 'turret':
      case 'boss':
        // Anything that reaches the near plane has rammed the hull. It dies
        // too — an enemy that flies through the player and carries on is the
        // single loudest way a game can say "this collision did not matter".
        hitShip(
          world, deps,
          data.kind === 'boss' ? DAMAGE.bossRam : DAMAGE.enemyRam,
          entity.x, entity.y,
        );
        if (data.kind === 'boss') {
          data.z = 1500;
          data.prevZ = 1500;
        } else {
          shatter(world, deps, entity, COLORS.red);
          deps.store.kill(entity.id);
        }
        break;

      default:
        break;
    }
  }
}

function resolvePlayerBolts(world: WorldState, deps: SimDeps): void {
  deps.store.queryInto('bolt', boltBuffer);
  if (boltBuffer.length === 0) return;

  for (const kind of ENEMY_KINDS) {
    deps.store.queryInto(kind, enemyBuffer);
    if (enemyBuffer.length === 0) continue;

    for (const bolt of boltBuffer) {
      const boltData = bolt.data;
      if (!boltData || !bolt.active || bolt.kind !== 'bolt') continue;

      for (const enemy of enemyBuffer) {
        const enemyData = enemy.data;
        // `kind` is re-checked because killing an enemy frees its pool slot,
        // and a shard spawned by the explosion can land in that same slot
        // before this loop finishes.
        if (!enemyData || !enemy.active || enemy.kind !== kind) continue;
        // Swept in z: did the bolt pass through the enemy's plane this step?
        if (boltData.prevZ > enemyData.z || boltData.z < enemyData.z) continue;
        const reach = enemyData.hitRadius + boltData.hitRadius;
        if (Math.abs(bolt.x - enemy.x) > reach || Math.abs(bolt.y - enemy.y) > reach) continue;

        deps.store.kill(bolt.id);
        damageEnemy(world, deps, enemy, WEAPON.damage);
        break;
      }
    }
  }
}

function damageEnemy(world: WorldState, deps: SimDeps, enemy: Entity<ObjData>, amount: number): void {
  const data = enemy.data;
  if (!data) return;
  data.hp -= amount;
  data.flashMs = 0;

  if (data.hp > 0) {
    burstAt(world, deps, enemy.x, enemy.y, data.z, {
      count: 6, preset: 'spark', colour: COLORS.amber, speed: 320, size: 9, lifeMs: 280,
    });
    return;
  }

  const value =
    data.kind === 'boss' ? REWARD.bossScore
      : data.kind === 'turret' ? REWARD.turretScore
        : REWARD.scoutScore;

  world.energy = clamp(world.energy + REWARD.energyPerKill, 0, RUN.maxEnergy);
  award(world, deps, value, enemy.x, enemy.y, data.kind === 'boss' ? 'INTERCEPTOR DOWN' : '', COLORS.amber);
  shatter(world, deps, enemy, COLORS.red);
  deps.shake.kick(data.kind === 'boss' ? 1 : 0.45, data.kind === 'boss' ? 520 : 220);
  deps.feedback.sound('hit');
  deps.feedback.haptic('hit');

  // Kills drop energy, so the special is something the player *earns* from
  // playing well rather than something that arrives on a timer.
  if (data.kind !== 'boss' && deps.rng() > 0.45) {
    spawnPickup(world, deps.store, PICKUP_ENERGY, enemy.x, enemy.y, data.z);
  }

  if (enemy.id === world.bossId) {
    world.bossId = -1;
    beginCheckpoint(world, deps);
  }
  deps.store.kill(enemy.id);
}

// ── Consequences ───────────────────────────────────────────────────────────

function hitShip(world: WorldState, deps: SimDeps, amount: number, atX: number, atY: number): void {
  const ship = world.ship;
  if (ship.iframesMs > 0) return;

  world.shield = clamp(world.shield - amount, 0, RUN.maxShield);
  ship.iframesMs = SHIP.iframesMs;
  ship.hitMs = 0;
  deps.metrics.miss('wrong-target');

  burstAt(world, deps, ship.x, ship.y, 0, {
    count: 22, preset: 'spark', colour: COLORS.red, speed: 380, size: 7, lifeMs: 520,
  });
  deps.popups.add({
    x: world.view.vanishX + atX,
    y: world.view.nearY + atY - 40,
    text: `−${amount}`,
    r: COLORS.red.r, g: COLORS.red.g, b: COLORS.red.b, sizePx: 26,
  });
  deps.shake.kick(0.8, 340);
  deps.feedback.sound('miss');
  deps.feedback.haptic('miss');
}

function collect(world: WorldState, deps: SimDeps, type: number, atX: number, atY: number): void {
  let text = '';
  let colour = COLORS.amber;

  if (type === PICKUP_SHIELD) {
    world.shield = clamp(world.shield + REWARD.shieldPickup, 0, RUN.maxShield);
    text = `HULL +${REWARD.shieldPickup}`;
    colour = COLORS.green;
  } else if (type === PICKUP_WEAPON) {
    world.ship.upgradeMs = WEAPON.upgradeMs;
    text = 'TRIPLE SHOT';
    colour = COLORS.violet;
  } else {
    world.energy = clamp(world.energy + REWARD.energyPickup, 0, RUN.maxEnergy);
    text = `ENERGY +${REWARD.energyPickup}`;
  }

  deps.popups.add({
    x: world.view.vanishX + atX, y: world.view.nearY + atY - 40,
    text, r: colour.r, g: colour.g, b: colour.b, sizePx: 22,
  });
  burstAt(world, deps, atX, atY, 0, {
    count: 16, colour, speed: 260, size: 7, lifeMs: 440,
  });
  deps.feedback.sound('hit');
  deps.feedback.haptic('hit');

  if (world.energy >= RUN.maxEnergy) {
    banner(world, 'ENERGY FULL · TAP TO FIRE', 2200);
    deps.feedback.sound('combo');
  }
}

function award(
  world: WorldState,
  deps: SimDeps,
  value: number,
  atX: number,
  atY: number,
  label: string,
  colour: { r: number; g: number; b: number },
): void {
  const points = deps.metrics.hit(0, value / SCORE_UNIT);
  deps.popups.add({
    x: world.view.vanishX + atX,
    y: world.view.nearY + atY - 30,
    text: label ? `${label} +${points}` : `+${points}`,
    r: colour.r, g: colour.g, b: colour.b,
    sizePx: label ? 22 : 26,
  });
}

/** Debris burst plus tumbling shards — a puff of particles alone reads as a
 *  smoke effect, shards read as something built coming apart. */
function shatter(
  world: WorldState,
  deps: SimDeps,
  entity: Entity<ObjData>,
  colour: { r: number; g: number; b: number },
): void {
  const data = entity.data;
  if (!data) return;

  burstAt(world, deps, entity.x, entity.y, data.z, {
    count: 26, colour, speed: 420, size: 9, lifeMs: 640,
  });

  const shards = 5;
  for (let i = 0; i < shards; i++) {
    const angle = (i / shards) * Math.PI * 2 + deps.rng();
    const speed = 120 + deps.rng() * 180;
    spawn(deps.store, {
      kind: 'shard',
      x: entity.x, y: entity.y, z: Math.max(20, data.z),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: -400,
      sizePx: 16 + deps.rng() * 18,
      hitRadius: 0,
      spinRate: (deps.rng() * 2 - 1) * 5,
      ttlMs: 700,
      colour,
      layer: 2,
    });
  }
}

// ── Beats ──────────────────────────────────────────────────────────────────

function beginCheckpoint(world: WorldState, deps: SimDeps): void {
  world.beat = 'checkpoint';
  world.beatMs = 0;
  world.targetSpeed = RUN.baseSpeed * 0.85;
  banner(world, 'RELAY AHEAD', 2400);
  say(world, 'MIRA', 'Interceptor down. Fly the relay ring to restore the checkpoint.', 4200);

  // The checkpoint is a gate, because a gate is the one object this corridor
  // has already taught the player is safe to fly into.
  spawn(deps.store, {
    kind: 'gate',
    x: 0,
    y: 0,
    z: 5200,
    sizePx: 0,
    hitRadius: world.view.halfWidth * 0.62,
    spinRate: 0.5,
    variant: 1,
    colour: COLORS.green,
    layer: 2,
  });
}

function completeCheckpoint(world: WorldState, deps: SimDeps): void {
  world.checkpointDone = true;
  world.beat = 'checkpoint';
  world.beatMs = 0;
  world.targetSpeed = RUN.baseSpeed * 0.5;
  banner(world, 'CHECKPOINT RESTORED', 3000);
  deps.feedback.sound('stage-clear');
  deps.feedback.haptic('stage-clear');
  deps.shake.kick(0.5, 300);
}

/** Keeps the world's cached boss handle honest — the pool recycles ids, so a
 *  stale one must be cleared rather than trusted. */
function advanceBeats(world: WorldState, deps: SimDeps): void {
  if (world.bossId >= 0 && !deps.store.get(world.bossId)) world.bossId = -1;
}
