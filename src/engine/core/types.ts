/**
 * Core engine types — pure TypeScript.
 *
 * NOTHING in `src/engine/core/**` may import from `react`, `react-native`,
 * `@shopify/react-native-skia`, `three`, or any `expo-*` package. The whole
 * point of this layer is that a session can be stepped, scored and asserted
 * on in a plain Node test with no renderer attached. The ESLint boundary in
 * `eslint.config.js` enforces it; this comment explains why it exists.
 */

export type EntityId = number;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Why a session stopped — threaded into metrics and persistence. */
export type EndReason = 'completed' | 'failed' | 'quit' | 'timeout';

/**
 * Which sprite-sheet cell a node draws with. The engine only ever names a
 * shape; how that shape is rasterised is entirely the renderer's business,
 * which is what keeps `core/` free of Skia.
 *
 * Cells 0–3 are the generic primitives the runtime itself needs (particles,
 * glows, telegraph rings). Cells 4–19 are *silhouettes*: a hull reads as a
 * spacecraft, a drone reads as a hostile, a rock reads as debris. That
 * distinction is the whole reason they exist — a scene built only from discs
 * and rings reads as a benchmark no matter how well it is animated, because
 * the player has nothing to recognise. Adding shapes here costs nothing at
 * draw time: the atlas is still a single draw call, it just samples a
 * different cell.
 *
 * **Directional sprites point along −Y (up) at rotation 0.** A node aiming
 * along a heading therefore uses `rotation = heading + Math.PI / 2`.
 */
export const Sprite = {
  Glow: 0,
  Disc: 1,
  Ring: 2,
  Square: 3,
  /** Player spacecraft hull — swept-wing dart. */
  Hull: 4,
  /** Cockpit canopy, overlaid on the hull in a brighter tint. */
  Canopy: 5,
  /** Hostile drone — hexagonal body with forward mandibles. */
  Drone: 6,
  /** Energy gate — two facing staple brackets with a clear gap between. */
  Gate: 7,
  /**
   * One arc segment of a segmented ring.
   *
   * Unlike every other cell, this shape is drawn *around* the cell centre
   * rather than filling it: the node is positioned at the ring's centre and
   * rotated, so N nodes at the same position with different rotations form a
   * ring. Corridor frames and gate rings are built this way. See
   * `RING_SEG_MID_RATIO` for turning a radius into a node size.
   */
  RingSeg: 8,
  /** Trapezoid armour plate — hull plating on large ships and structures. */
  ArmorPlate: 9,
  /** Solid chevron — direction cues and speed marks. */
  Chevron: 10,
  /** Four-point sparkle for starfield and impact glints. */
  Star: 11,
  /** Rounded capsule — beams, engine trails and speed lines. */
  Capsule: 12,
  /** Filled hexagon — ship cores, turret housings, pickup interiors. */
  Hex: 13,
  /** Four-corner targeting bracket — attack telegraphs and lock-ons. */
  Reticle: 14,
  /** Elongated triangle — destruction debris. */
  Shard: 15,
  /** Irregular asteroid / relay wreckage. */
  Rock: 16,
  /** Structural beam with end caps — corridor pylons and barriers. */
  Strut: 17,
  /** Tapered projectile. */
  Bolt: 18,
  /** Pickup shell — a notched hexagonal pod. */
  Pod: 19,
} as const;
export type SpriteId = (typeof Sprite)[keyof typeof Sprite];

/** Number of distinct sprite cells — sizes the sprite sheet and its rects. */
export const SPRITE_COUNT = 20;

/**
 * Where `Sprite.RingSeg`'s arc sits, as a fraction of the node's size.
 *
 * The arc's mid-line is at 29px in a 64px cell, so a segment ring of radius R
 * needs `size = R / RING_SEG_MID_RATIO`. Exported from core because the
 * *game* decides ring radii and must be able to express them in px without
 * knowing anything else about how the sheet is rasterised.
 */
export const RING_SEG_MID_RATIO = 29 / 64;

/** Same idea for `Sprite.Ring`: its stroke circle sits at 29px of 64. */
export const RING_RADIUS_RATIO = 29 / 64;

/**
 * One simulated object.
 *
 * Every field is a primitive and every entity is pre-allocated by the pool,
 * so a running session performs zero allocations per frame. `data` is the
 * one escape hatch for game-specific payload; keep it small and flat.
 *
 * Velocities are in **px/second** (not px/frame) so tuning numbers stay
 * readable and frame-rate independent.
 */
export interface Entity<TData = unknown> {
  id: EntityId;
  kind: string;
  active: boolean;
  /** Higher layers draw on top and win hit-tests. */
  layer: number;

  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Position at the previous fixed step — the renderer interpolates
   *  between prev and current using the loop's alpha, so motion stays
   *  smooth at 120Hz even though logic runs at 60Hz. */
  prevX: number;
  prevY: number;

  /** Circle collider / hit radius. Also the tap target radius. */
  radius: number;
  /** Rect collider extents, used only when `useRectHit` is true. */
  w: number;
  h: number;
  useRectHit: boolean;

  rotation: number;
  scale: number;

  sprite: SpriteId;
  /** Tint, 0..1 per channel. Multiplied onto a white sprite by the renderer. */
  r: number;
  g: number;
  b: number;
  a: number;

  ageMs: number;
  /** -1 = never expires. */
  ttlMs: number;

  data: TData | null;
}

/** Everything optional except `kind` — the pool fills the rest with defaults. */
export type EntityInit<TData = unknown> = Partial<Omit<Entity<TData>, 'id' | 'active'>> & {
  kind: string;
};

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Parses `#rrggbb` / `#rrggbbaa` into 0..1 channels the engine can carry. */
export function rgba(hex: string, alpha = 1): { r: number; g: number; b: number; a: number } {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : alpha;
  return { r, g, b, a };
}
