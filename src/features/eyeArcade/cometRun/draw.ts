import type { AccessibilityPolicy } from '@/engine/core/a11y/accessibilityPolicy';
import type { RenderFrame } from '@/engine/core/render/renderFrame';
import {
  clamp01,
  lerp,
  RING_RADIUS_RATIO,
  RING_SEG_MID_RATIO,
  Sprite,
  type Entity,
  type SpriteId,
} from '@/engine/core/types';
import { COLORS, ENEMY, RUN, SHIP, type Rgb } from './design';
import { nearness, project, scaleAt } from './perspective';
import { CORRIDOR_FRAME_SPACING } from './sim';
import type { Store } from './spawn';
import { PICKUP_SHIELD, PICKUP_WEAPON, SLOT_VERTICAL, type ObjData, type WorldState } from './world';

/**
 * Everything the player sees.
 *
 * The brief this file has to satisfy: a viewer must understand, without
 * instructions, that they are flying a fighter down a collapsing corridor,
 * shooting things, dodging things and collecting things. Four techniques
 * carry almost all of it:
 *
 * 1. **Depth is drawn, not implied.** Corridor frames stream past at fixed
 *    z-intervals, growing and brightening as they arrive. They are the
 *    single strongest cue that the world has depth and that the player is
 *    moving *through* it — far stronger than any amount of object scaling,
 *    because they establish the tunnel that everything else lives inside.
 * 2. **Silhouette over colour.** Hull, drone, rock, pod and strut are
 *    distinct *shapes*. Two red circles of different sizes are two dots.
 * 3. **State is drawn, not annotated.** A damaged ship strobes, a charging
 *    turret glows and paints its gap, a full-energy special ring sits around
 *    the hull. Nothing that matters lives only in a HUD number.
 * 4. **Everything is layered.** No object is one node; the ship alone is a
 *    trail, a bloom, a hull, a canopy and a shield.
 *
 * Draw order is strictly far to near, and the whole pass is allocation free.
 */

interface DrawContext {
  frame: RenderFrame;
  boost: number;
  /** 0 when reduced motion is on — gates decorative oscillation only. */
  motion: number;
}

const ctx: DrawContext = { frame: null as unknown as RenderFrame, boost: 1, motion: 1 };

function node(sprite: SpriteId, x: number, y: number, size: number, rotation: number, c: Rgb, a: number): void {
  if (a <= 0.004 || size <= 0.6) return;
  const n = ctx.frame.push();
  if (!n) return;
  n.x = x;
  n.y = y;
  n.rotation = rotation;
  n.size = size;
  n.sprite = sprite;
  const b = ctx.boost;
  n.r = c.r * b > 1 ? 1 : c.r * b;
  n.g = c.g * b > 1 ? 1 : c.g * b;
  n.b = c.b * b > 1 ? 1 : c.b * b;
  n.a = a > 1 ? 1 : a;
}

function ring(x: number, y: number, radius: number, c: Rgb, a: number): void {
  node(Sprite.Ring, x, y, radius / RING_RADIUS_RATIO, 0, c, a);
}

function ringSegment(
  x: number, y: number, radius: number,
  index: number, count: number, spin: number,
  c: Rgb, a: number,
): void {
  node(Sprite.RingSeg, x, y, radius / RING_SEG_MID_RATIO, spin + (index / count) * Math.PI * 2, c, a);
}

export interface DrawDeps {
  store: Store;
  policy: AccessibilityPolicy;
}

const drawBuffer: Entity<ObjData>[] = [];

export function drawWorld(
  world: WorldState,
  deps: DrawDeps,
  frame: RenderFrame,
  alpha: number,
): void {
  ctx.frame = frame;
  ctx.boost = deps.policy.contrastBoost();
  ctx.motion = deps.policy.settings.reducedMotion ? 0 : 1;

  drawDeepField(world);
  drawPlanet(world);
  drawStars(world);
  drawCorridor(world);
  drawObjects(world, deps);
  drawShip(world, alpha);
  drawSpecial(world);
  drawDamageVignette(world);
}

// ── Environment ────────────────────────────────────────────────────────────

function drawDeepField(world: WorldState): void {
  for (const nebula of world.nebulae) {
    node(
      Sprite.Glow,
      world.width * nebula.xFrac,
      world.height * nebula.yFrac,
      Math.min(world.width, world.height) * nebula.radiusFrac * 2,
      0,
      nebula.warm ? COLORS.nebulaWarm : COLORS.nebulaCool,
      // Barely there. The moment the deep field is noticeable it is
      // competing with the corridor for attention.
      0.19,
    );
  }
}

/**
 * The planet on the horizon.
 *
 * Static, huge, and behind everything. It is the one element that says the
 * corridor is *somewhere* — in orbit, above a world — rather than in an
 * abstract void, and it costs four nodes.
 */
function drawPlanet(world: WorldState): void {
  const view = world.view;
  const x = view.vanishX + world.width * 0.16;
  const y = view.vanishY + world.height * 0.02;
  const r = world.width * 0.52;

  node(Sprite.Glow, x, y, r * 2.5, 0, COLORS.planet, 0.3);
  node(Sprite.Disc, x, y, r * 2, 0, COLORS.planet, 0.5);
  ring(x, y, r, COLORS.planetRim, 0.5);
  node(Sprite.Glow, view.vanishX, view.vanishY, world.width * 1.5, 0, COLORS.nebulaCool, 0.28);
}

function drawStars(world: WorldState): void {
  const view = world.view;
  // Above a threshold the stars streak instead of twinkling. Streaking is
  // the cheapest, most legible speed cue there is, and it scales with the
  // corridor's actual speed rather than being faked on a timer.
  const streak = clamp01((world.speed - RUN.baseSpeed * 0.7) / (RUN.maxSpeed - RUN.baseSpeed * 0.7));

  for (const star of world.stars) {
    const at = project(view, star.x, star.y, star.z);
    if (at.k <= 0.01) continue;
    const near = nearness(view, star.z);
    const alpha = 0.25 + near * 0.65;

    if (streak > 0.12 && near > 0.25) {
      // Streaks point away from the vanishing point — the direction the
      // player is actually travelling relative to the field.
      const angle = Math.atan2(at.y - view.vanishY, at.x - view.vanishX);
      node(
        Sprite.Capsule, at.x, at.y,
        star.size * at.k * (7 + streak * 26),
        angle + Math.PI / 2,
        star.warm ? COLORS.starWarm : COLORS.star,
        alpha * 0.8,
      );
    } else {
      node(Sprite.Disc, at.x, at.y, Math.max(1.4, star.size * at.k * 3), 0, star.warm ? COLORS.starWarm : COLORS.star, alpha);
    }
  }
}

/**
 * The corridor itself: octagonal frames streaming past at fixed z spacing.
 *
 * This is the load-bearing piece of the whole 2.5D illusion. Objects that
 * merely scale up read as "growing", not as "approaching" — it takes a
 * *structure* around them, arriving at a steady rhythm, before the eye
 * commits to the idea of a tunnel. The frames also carry the speed: the rate
 * at which they sweep past is exactly the corridor speed, so an acceleration
 * is felt before the HUD could ever report it.
 */
function drawCorridor(world: WorldState): void {
  const view = world.view;
  const frames = 7;
  const segments = 8;

  for (let f = frames; f >= 1; f--) {
    const z = f * CORRIDOR_FRAME_SPACING - world.frameOffsetZ;
    if (z <= 40) continue;
    const at = project(view, 0, 0, z);
    const near = nearness(view, z);
    // Frames fade in from the haze and fade out again as they sweep past the
    // camera, so nothing ever pops into or out of existence.
    const alpha = (0.1 + near * 0.5) * (1 - clamp01((near - 0.82) / 0.18));
    const radius = view.halfWidth * 1.16 * at.k;

    for (let i = 0; i < segments; i++) {
      ringSegment(at.x, at.y, radius, i, segments, 0, COLORS.steel, alpha);
    }
    // Four struts anchoring each frame to the corridor wall — they are what
    // make it read as built structure rather than as a floating hoop.
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      node(
        Sprite.Strut,
        at.x + Math.cos(angle) * radius,
        at.y + Math.sin(angle) * radius,
        radius * 0.34,
        angle + Math.PI / 2,
        COLORS.steelLit,
        alpha * 1.1,
      );
    }
  }
}

// ── Objects ────────────────────────────────────────────────────────────────

function drawObjects(world: WorldState, deps: DrawDeps): void {
  const view = world.view;

  // Far to near, so nearer objects always overlap further ones. The pool is
  // in spawn order, not depth order, so this sort is what keeps a rock from
  // drawing on top of the boss it is passing.
  drawBuffer.length = 0;
  deps.store.forEachActive(entity => {
    if (entity.data) drawBuffer.push(entity);
  });
  drawBuffer.sort(byDepth);

  for (const entity of drawBuffer) {
    const data = entity.data;
    if (!data || data.z <= -60) continue;
    const at = project(view, entity.x, entity.y, data.z);
    if (at.k <= 0.012) continue;

    switch (data.kind) {
      case 'debris': drawDebris(entity, data, at.x, at.y, at.k); break;
      case 'shard': drawShard(entity, data, at.x, at.y, at.k); break;
      case 'barrier': drawBarrier(world, data, at.x, at.y, at.k, entity.x, entity.y); break;
      case 'gate': drawGate(world, entity, data, at.x, at.y, at.k); break;
      case 'scout': drawScout(entity, data, at.x, at.y, at.k); break;
      case 'turret': drawTurret(world, entity, data, at.x, at.y, at.k); break;
      case 'boss': drawBoss(world, entity, data, at.x, at.y, at.k); break;
      case 'pickup': drawPickup(world, data, at.x, at.y, at.k); break;
      case 'bolt': drawBolt(data, at.x, at.y, at.k, COLORS.cyanPale); break;
      case 'ebolt': drawBolt(data, at.x, at.y, at.k, COLORS.red); break;
      case 'beam': drawBeam(world, data, at.x, at.y, at.k, entity.x); break;
      default: break;
    }
  }
}

function byDepth(a: Entity<ObjData>, b: Entity<ObjData>): number {
  return (b.data?.z ?? 0) - (a.data?.z ?? 0);
}

function drawDebris(entity: Entity<ObjData>, data: ObjData, x: number, y: number, k: number): void {
  const size = data.sizePx * k;
  node(Sprite.Glow, x, y, size * 1.5, 0, COLORS.rock, 0.25);
  node(Sprite.Rock, x, y, size, data.spin, COLORS.rockLit, 1);
  // A darker inset shape gives the rock an unlit side, which is most of what
  // makes a flat sprite read as a solid.
  node(Sprite.Rock, x + size * 0.1, y + size * 0.1, size * 0.72, data.spin * 0.9, COLORS.rock, 0.85);
  void entity;
}

function drawShard(entity: Entity<ObjData>, data: ObjData, x: number, y: number, k: number): void {
  const life = data.z > 0 && entity.ttlMs > 0 ? clamp01(1 - entity.ageMs / entity.ttlMs) : 1;
  node(Sprite.Shard, x, y, data.sizePx * k * life, data.spin, { r: entity.r, g: entity.g, b: entity.b }, life * 0.9);
}

/**
 * A wall across the corridor with one opening, drawn as a curtain.
 *
 * Both hazards that block the corridor — the structural barrier and the
 * turret's beam — are the same problem: cover everything *except* a gap, at
 * whatever depth they currently sit. They are drawn by the same routine so
 * they teach the same lesson with the same shape language, and so the safe
 * route is unmistakably a hole in something rather than a marked region.
 *
 * Tiling is a necessity, not a style choice: the atlas scales sprites
 * uniformly, so a single node can never be "tall and thin". A grid of
 * overlapping cells is how a full-height wall gets built out of square
 * sprites, and it happens to read as girders and energy columns — which is
 * what these things are.
 */
function drawCurtain(
  world: WorldState,
  data: ObjData,
  y: number,
  k: number,
  options: {
    /** Gap centre in world units, on the axis the gap runs across. */
    gapCentre: number;
    /** True when the gap is a vertical slot (dodge sideways). */
    vertical: boolean;
    sprite: SpriteId;
    colour: Rgb;
    columns: number;
    rows: number;
    /** Cell size in world units before perspective. */
    cell: number;
    alpha: number;
    /** Adds a soft bloom behind each cell — used by the beam. */
    glow?: boolean;
  },
): void {
  const view = world.view;
  const { gapCentre, vertical, columns, rows, cell, alpha } = options;

  for (let c = 0; c < columns; c++) {
    const wx = ((c / (columns - 1)) * 2 - 1) * view.halfWidth;
    if (vertical && Math.abs(wx - gapCentre) < data.gapHalf) continue;

    for (let r = 0; r < rows; r++) {
      const wy = ((r / (rows - 1)) * 2 - 1) * view.halfHeight;
      if (!vertical && Math.abs(wy - gapCentre) < data.gapHalf) continue;

      const px = view.vanishX + wx * k;
      const py = view.vanishY + (view.nearY - view.vanishY + wy) * k;
      if (options.glow) node(Sprite.Glow, px, py, cell * 1.5 * k, 0, options.colour, alpha * 0.5);
      node(options.sprite, px, py, cell * k, 0, options.colour, alpha);
    }
  }

  // The opening gets bright edging on both lips — the safe route is the
  // brightest thing in the hazard, which is the opposite of how a wall would
  // really be lit and exactly how a player needs to read it.
  const lip = cell * 0.5;
  for (const side of [-1, 1]) {
    const at = gapCentre + side * data.gapHalf;
    const px = vertical ? view.vanishX + at * k : view.vanishX;
    const py = vertical ? y : view.vanishY + (view.nearY - view.vanishY + at) * k;
    node(Sprite.Glow, px, py, lip * 2.6 * k, 0, COLORS.amber, alpha * 0.6);
    node(
      Sprite.Capsule, px, py,
      (vertical ? view.halfHeight * 1.9 : view.halfWidth * 1.9) * k,
      vertical ? 0 : Math.PI / 2,
      COLORS.amber, alpha,
    );
  }
}

function drawBarrier(
  world: WorldState,
  data: ObjData,
  x: number, y: number, k: number,
  worldX: number, worldY: number,
): void {
  const vertical = data.variant === SLOT_VERTICAL;
  drawCurtain(world, data, y, k, {
    gapCentre: vertical ? worldX : worldY,
    vertical,
    sprite: Sprite.Strut,
    colour: COLORS.steelLit,
    columns: 9,
    rows: 4,
    cell: world.view.halfHeight * 0.62,
    alpha: 0.3 + nearness(world.view, data.z) * 0.68,
  });
  void x;
}

function drawGate(world: WorldState, entity: Entity<ObjData>, data: ObjData, x: number, y: number, k: number): void {
  const checkpoint = data.variant === 1;
  const colour = checkpoint ? COLORS.green : COLORS.cyan;
  const radius = data.hitRadius * k;
  const near = nearness(world.view, data.z);
  const alpha = 0.3 + near * 0.7;
  const pulse = 0.5 + 0.5 * Math.sin(world.elapsedMs * 0.006) * ctx.motion;

  node(Sprite.Glow, x, y, radius * 3, 0, colour, alpha * 0.35);
  for (let i = 0; i < 10; i++) {
    ringSegment(x, y, radius, i, 10, data.spin, colour, alpha);
  }
  ring(x, y, radius * (0.82 + pulse * 0.08), COLORS.cyanPale, alpha * 0.7);

  // Four gate brackets, so it reads as an installation rather than a hoop.
  for (let i = 0; i < 4; i++) {
    const angle = data.spin + (i / 4) * Math.PI * 2;
    node(
      Sprite.Gate,
      x + Math.cos(angle) * radius,
      y + Math.sin(angle) * radius,
      radius * 0.5,
      angle + Math.PI / 2,
      colour, alpha,
    );
  }
  void entity;
}

function drawScout(entity: Entity<ObjData>, data: ObjData, x: number, y: number, k: number): void {
  const size = data.sizePx * k;
  const flash = data.flashMs >= 0 && data.flashMs < 160 ? 1 - data.flashMs / 160 : 0;
  const body = flash > 0.02 ? COLORS.redPale : COLORS.red;

  node(Sprite.Glow, x, y, size * 2, 0, COLORS.redDeep, 0.55);
  // Facing the camera, so it reads as coming at you.
  node(Sprite.Drone, x, y, size, Math.PI, body, 1);
  node(Sprite.Hex, x, y, size * 0.34, -data.spin, COLORS.white, 0.85);
  // Engine wash behind it — up-screen, because "behind" in a corridor is
  // toward the horizon.
  node(Sprite.Glow, x, y - size * 0.42, size * 0.6, 0, COLORS.red, 0.5);
  void entity;
}

function drawTurret(world: WorldState, entity: Entity<ObjData>, data: ObjData, x: number, y: number, k: number): void {
  const size = data.sizePx * k;
  const flash = data.flashMs >= 0 && data.flashMs < 160 ? 1 - data.flashMs / 160 : 0;
  const body = flash > 0.02 ? COLORS.redPale : COLORS.red;
  const charging = data.z <= 2600 && data.patternMs < ENEMY.turretTelegraphMs;
  const charge01 = charging ? clamp01(data.patternMs / ENEMY.turretTelegraphMs) : 0;

  // A mast anchoring it to the corridor wall: an emplacement, not a floater.
  node(Sprite.Strut, x + (entity.x > 0 ? size * 0.42 : -size * 0.42), y, size * 0.9, Math.PI / 2, COLORS.steelLit, 0.8);
  node(Sprite.Glow, x, y, size * 1.7, 0, COLORS.redDeep, 0.5);
  node(Sprite.Hex, x, y, size * 0.86, data.spin, body, 1);
  for (let i = 0; i < 6; i++) {
    ringSegment(x, y, size * 0.56, i, 6, -data.spin, COLORS.redPale, 0.75);
  }
  node(Sprite.Reticle, x, y, size * 0.7, 0, COLORS.white, 0.5);

  if (charge01 > 0) {
    // The charge is drawn *on the turret* and the gap is painted across the
    // corridor at the same time, so the player learns where to be before the
    // beam exists rather than after it arrives.
    node(Sprite.Glow, x, y, size * (0.8 + charge01 * 1.6), 0, COLORS.red, 0.4 + charge01 * 0.5);
    const gapX = world.view.vanishX + (data.variant > 0 ? 0.55 : -0.55) * world.view.halfWidth * 0.62;
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      node(
        Sprite.Chevron,
        lerp(x, gapX, t),
        lerp(y, world.view.nearY, t),
        26 + t * 26,
        Math.PI,
        COLORS.amber,
        charge01 * (0.25 + t * 0.5),
      );
    }
  }
}

/**
 * The Helix Interceptor.
 *
 * Built from the same vocabulary as everything else it has fought — a drone
 * silhouette, armour plates, counter-rotating rings — just far bigger and
 * with a visible health ring. Reusing shapes is deliberate: a boss assembled
 * from brand-new parts has to be decoded before it can be fought.
 */
function drawBoss(world: WorldState, entity: Entity<ObjData>, data: ObjData, x: number, y: number, k: number): void {
  const size = data.sizePx * k;
  const flash = data.flashMs >= 0 && data.flashMs < 160 ? 1 - data.flashMs / 160 : 0;
  const body = flash > 0.02 ? COLORS.redPale : COLORS.red;
  const hp01 = clamp01(data.hp / ENEMY.bossHp);

  node(Sprite.Glow, x, y, size * 2.1, 0, COLORS.redDeep, 0.6);

  // Counter-rotating armour: the twin helices the thing is named for.
  for (let i = 0; i < 6; i++) {
    const angle = world.elapsedMs * 0.0011 * ctx.motion + (i / 6) * Math.PI * 2;
    node(
      Sprite.ArmorPlate,
      x + Math.cos(angle) * size * 0.46,
      y + Math.sin(angle) * size * 0.28,
      size * 0.3,
      angle + Math.PI / 2,
      COLORS.redPale, 0.9,
    );
  }
  for (let i = 0; i < 6; i++) {
    const angle = -world.elapsedMs * 0.0014 * ctx.motion + (i / 6) * Math.PI * 2;
    node(
      Sprite.ArmorPlate,
      x + Math.cos(angle) * size * 0.46,
      y - Math.sin(angle) * size * 0.28,
      size * 0.26,
      angle + Math.PI / 2,
      COLORS.redDeep, 0.9,
    );
  }

  node(Sprite.Drone, x, y, size * 0.9, Math.PI, body, 1);
  node(Sprite.Hex, x, y, size * 0.3, data.spin, COLORS.white, 0.9);
  node(Sprite.Glow, x, y, size * 0.5, 0, COLORS.amber, 0.6);

  // Health as a ring around the boss itself. A boss health bar pinned to the
  // top of the screen asks the player to look away from the boss.
  const segments = 16;
  for (let i = 0; i < segments; i++) {
    const lit = i / segments < hp01;
    ringSegment(x, y, size * 0.72, i, segments, 0, lit ? COLORS.red : COLORS.steel, lit ? 0.95 : 0.25);
  }

  // Telegraph for the beam sweep.
  if (data.variant === 1 && !data.scored) {
    const t01 = clamp01(data.patternMs / ENEMY.bossTelegraphMs);
    node(Sprite.Reticle, x, y, size * (1.6 - t01 * 0.5), 0, COLORS.red, 0.4 + t01 * 0.6);
  }
  void entity;
}

function drawPickup(world: WorldState, data: ObjData, x: number, y: number, k: number): void {
  const size = data.sizePx * k;
  const type = data.variant;
  const colour = type === PICKUP_SHIELD ? COLORS.green : type === PICKUP_WEAPON ? COLORS.violet : COLORS.amber;
  const bob = Math.sin(world.elapsedMs * 0.005 + data.spin) * size * 0.06 * ctx.motion;

  node(Sprite.Glow, x, y + bob, size * 2.4, 0, colour, 0.45);
  node(Sprite.Pod, x, y + bob, size, data.spin, colour, 1);
  node(Sprite.Hex, x, y + bob, size * 0.52, -data.spin * 1.6, COLORS.podInner, 0.9);

  // A distinct glyph per type, built from shapes already in the atlas: a
  // chevron pair for energy, an armour plate for hull, a three-bolt burst
  // for the weapon. Colour alone would fail a colour-blind player, and
  // three pickups that differ only in hue would fail everyone at speed.
  if (type === PICKUP_SHIELD) {
    node(Sprite.ArmorPlate, x, y + bob, size * 0.42, 0, colour, 1);
  } else if (type === PICKUP_WEAPON) {
    for (let i = 0; i < 3; i++) {
      node(Sprite.Bolt, x + (i - 1) * size * 0.16, y + bob, size * 0.34, Math.PI, colour, 1);
    }
  } else {
    node(Sprite.Chevron, x, y + bob - size * 0.1, size * 0.36, 0, colour, 1);
    node(Sprite.Chevron, x, y + bob + size * 0.14, size * 0.36, 0, colour, 0.7);
  }
}

function drawBolt(data: ObjData, x: number, y: number, k: number, colour: Rgb): void {
  const size = data.sizePx * k;
  node(Sprite.Glow, x, y, size * 2.6, 0, colour, 0.6);
  node(Sprite.Bolt, x, y, size * 1.4, data.vz > 0 ? 0 : Math.PI, colour, 1);
}

/** A wall of beam with one gap, rushing the player — same shape language as
 *  the structural barrier, in hostile red. */
function drawBeam(world: WorldState, data: ObjData, x: number, y: number, k: number, worldX: number): void {
  drawCurtain(world, data, y, k, {
    gapCentre: worldX,
    vertical: true,
    sprite: Sprite.Capsule,
    colour: COLORS.redPale,
    columns: 13,
    rows: 3,
    cell: world.view.halfHeight * 0.85,
    alpha: 0.4 + nearness(world.view, data.z) * 0.6,
    glow: true,
  });
  void x;
}

// ── Ship ───────────────────────────────────────────────────────────────────

function drawShip(world: WorldState, alpha: number): void {
  const ship = world.ship;
  const view = world.view;
  const x = view.vanishX + lerp(ship.prevX, ship.x, alpha);
  const y = view.nearY + lerp(ship.prevY, ship.y, alpha);
  const size = SHIP.sizePx;
  // Sprites point up; the ship flies "into" the screen, so it is drawn
  // nose-up with roll applied.
  const rotation = ship.bank;

  // Invulnerability strobe. Skipping frames outright is the clearest signal
  // there is that damage is not currently landing.
  const strobing = ship.iframesMs > 0 && Math.floor(ship.iframesMs / 70) % 2 === 0;
  const hullAlpha = strobing ? 0.4 : 1;

  // Engine trail: a tapering column behind the ship, longer with speed.
  const wash = 1 + clamp01((world.speed - RUN.baseSpeed) / (RUN.maxSpeed - RUN.baseSpeed));
  for (let i = 1; i <= 4; i++) {
    node(
      Sprite.Glow,
      x - Math.sin(ship.bank) * size * 0.3 * i,
      y + size * 0.34 * i * wash,
      size * (0.8 - i * 0.14),
      0,
      i <= 1 ? COLORS.cyanPale : COLORS.cyan,
      (0.6 - i * 0.11) * hullAlpha,
    );
  }

  node(Sprite.Glow, x, y, size * 1.9, 0, COLORS.cyanDeep, 0.45 * hullAlpha);
  node(Sprite.Hull, x, y, size, rotation, COLORS.cyanPale, hullAlpha);
  node(Sprite.Canopy, x, y, size * 0.82, rotation, COLORS.cyanDeep, 0.9 * hullAlpha);

  // Shield bubble, brightness tracking remaining hull.
  const shield01 = clamp01(world.shield / RUN.maxShield);
  if (shield01 > 0) {
    ring(x, y, size * 0.85, shield01 > 0.35 ? COLORS.cyan : COLORS.red, 0.18 + shield01 * 0.35);
  }

  // Triple-shot upgrade: violet outriggers, so the state is on the ship and
  // not only in the HUD.
  if (ship.upgradeMs > 0) {
    for (const side of [-1, 1]) {
      node(Sprite.Bolt, x + side * size * 0.42, y + size * 0.05, size * 0.34, rotation, COLORS.violet, 0.95);
    }
  }

  // Full-energy ready ring — the prompt for the one control the player has
  // not used yet.
  if (world.energy >= RUN.maxEnergy && world.specialMs <= 0) {
    const beat = 0.5 + 0.5 * Math.sin(world.elapsedMs * 0.012) * ctx.motion;
    ring(x, y, size * (1.15 + beat * 0.2), COLORS.amber, 0.55 + beat * 0.45);
  }
}

/** The special attack: a lance up the corridor plus a shockwave ring. */
function drawSpecial(world: WorldState): void {
  if (world.specialMs <= 0) return;
  const view = world.view;
  const t01 = clamp01(1 - world.specialMs / 900);
  const fade = 1 - t01;

  const segments = 16;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const z = t * view.farZ * 0.7;
    const at = project(view, world.ship.x * (1 - t), world.ship.y * (1 - t), z);
    node(Sprite.Glow, at.x, at.y, (200 + t * 260) * scaleAt(view, z) * 3 * fade, 0, COLORS.cyanPale, 0.5 * fade);
    node(Sprite.Capsule, at.x, at.y, 200 * at.k * 2.4 * fade, 0, COLORS.white, 0.8 * fade);
  }
  ring(view.vanishX, view.nearY, view.halfWidth * (0.3 + t01 * 1.6), COLORS.cyanPale, fade * 0.9);
}

/** Red rim when the hull is critical, plus a flash on the frame damage
 *  lands. Drawn as four big edge glows — cheap, and it never obscures the
 *  centre of the corridor where the player is actually looking. */
function drawDamageVignette(world: WorldState): void {
  const ship = world.ship;
  const hurt = clamp01(1 - world.shield / RUN.maxShield);
  const flash = ship.hitMs >= 0 && ship.hitMs < 260 ? 1 - ship.hitMs / 260 : 0;
  const intensity = Math.max(flash, hurt > 0.65 ? (hurt - 0.65) / 0.35 * 0.5 : 0);
  if (intensity <= 0.02) return;

  const w = world.width;
  const h = world.height;
  node(Sprite.Glow, w * 0.5, 0, w * 1.6, 0, COLORS.red, intensity * 0.5);
  node(Sprite.Glow, w * 0.5, h, w * 1.6, 0, COLORS.red, intensity * 0.5);
  node(Sprite.Glow, 0, h * 0.5, h * 1.1, 0, COLORS.red, intensity * 0.45);
  node(Sprite.Glow, w, h * 0.5, h * 1.1, 0, COLORS.red, intensity * 0.45);
}
