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
 */
export const Sprite = {
  Glow: 0,
  Disc: 1,
  Ring: 2,
  Square: 3,
} as const;
export type SpriteId = (typeof Sprite)[keyof typeof Sprite];

/** Number of distinct sprite cells — sizes the sprite sheet and its rects. */
export const SPRITE_COUNT = 4;

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
