/**
 * The 2.5D projection — the one piece of maths the whole game rests on.
 *
 * Everything in Comet Run lives in a three-axis *world*: `x` across the
 * corridor, `y` up and down it, and `z` **ahead of the camera**. The corridor
 * flows toward the player, so an object's `z` falls every step; when it
 * reaches the near plane it is level with the ship, and past that it is gone.
 *
 * Projection is a single perspective divide:
 *
 *     k = 1 / (1 + z / DEPTH)          // 1 at the near plane, → 0 at infinity
 *     screenX = vanishX + x * k
 *     screenY = vanishY + (baseY + y) * k
 *
 * `k` is the whole illusion. It scales position *and* sprite size, so a rock
 * spawned at the horizon is a 3px speck that grows to a 90px boulder as it
 * arrives — which is the entire "objects spawn small at the horizon and
 * increase scale as they approach" requirement, expressed once, here, rather
 * than re-derived by every object that needs it.
 *
 * World units are chosen so that **1 unit = 1 screen pixel at the near
 * plane** (k = 1). That makes ship handling, collision radii and hit
 * distances all readable in px without a conversion in the reader's head.
 */

export interface Perspective {
  /** Screen x of the vanishing point. */
  vanishX: number;
  /** Screen y of the vanishing point — the horizon. */
  vanishY: number;
  /** Screen y a world-origin object sits at when it reaches the near plane. */
  nearY: number;
  /** Falloff constant: the z at which an object is drawn at half size. */
  depth: number;
  /** Corridor half-width in world units — the walls the player flies between. */
  halfWidth: number;
  /** Corridor half-height in world units. */
  halfHeight: number;
  /** How far ahead objects spawn. */
  farZ: number;
}

export interface Projected {
  x: number;
  y: number;
  /** Perspective scale at this depth: multiply any world size by it. */
  k: number;
}

const projected: Projected = { x: 0, y: 0, k: 1 };

export function createPerspective(width: number, height: number): Perspective {
  return {
    vanishX: width / 2,
    // The horizon sits high enough to leave a planet arc and a deep run of
    // corridor above the action, and low enough that the ship never has to
    // fly up into a squashed, unreadable part of the frame.
    vanishY: height * 0.3,
    nearY: height * 0.72,
    // Tuned against `farZ`: at z = farZ an object draws at ~6% scale, small
    // enough to read as "far away" and big enough to still be a visible
    // warning rather than a single pixel.
    depth: 700,
    halfWidth: width * 0.46,
    halfHeight: height * 0.2,
    farZ: 11_000,
  };
}

/** Perspective scale at depth `z`. Clamped so nothing behind the camera
 *  inverts — a negative `k` would mirror a sprite through the vanishing
 *  point, which looks like a rendering bug rather than a passed obstacle. */
export function scaleAt(view: Perspective, z: number): number {
  return z <= -view.depth * 0.9 ? 0 : 1 / (1 + z / view.depth);
}

/** Projects a world point. Returns a shared object — read it immediately. */
export function project(view: Perspective, x: number, y: number, z: number): Projected {
  const k = scaleAt(view, z);
  projected.k = k;
  projected.x = view.vanishX + x * k;
  projected.y = view.vanishY + (view.nearY - view.vanishY + y) * k;
  return projected;
}

/**
 * Fraction of the way in from the horizon, 0 (far) → 1 (at the near plane).
 *
 * Used for anything that should fade or thicken *with distance* rather than
 * with size — corridor frames brightening as they arrive, an enemy's aura
 * coming up out of the haze. Deriving it from `k` rather than from `z`
 * directly keeps it consistent with what the eye actually sees.
 */
export function nearness(view: Perspective, z: number): number {
  const k = scaleAt(view, z);
  const kFar = scaleAt(view, view.farZ);
  return k <= kFar ? 0 : (k - kFar) / (1 - kFar);
}
