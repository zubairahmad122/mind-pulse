import type { EntityStore } from '../entities/entityStore';
import type { Entity, EntityId } from '../types';

export interface HitTestOptions {
  /** Extra forgiveness in px added to every target's radius/extent. The
   *  accessibility policy raises this; it must never change scoring — only
   *  how easy the target is to physically acquire. */
  slopPx?: number;
  /** Restrict to one entity kind (e.g. only 'threat' is tappable). */
  kind?: string;
  /** Ignore entities below this layer. */
  minLayer?: number;
}

export function pointInCircle(
  px: number, py: number,
  cx: number, cy: number, r: number,
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

export function pointInRect(
  px: number, py: number,
  cx: number, cy: number, w: number, h: number,
): boolean {
  const hw = w / 2;
  const hh = h / 2;
  return px >= cx - hw && px <= cx + hw && py >= cy - hh && py <= cy + hh;
}

export function circlesOverlap(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}

function hits<TData>(e: Entity<TData>, x: number, y: number, slop: number): boolean {
  // `scale` is a visual property, but a target that has animated up to 1.4×
  // genuinely looks bigger, so the hit area follows it. Anything else feels
  // broken to the player.
  return e.useRectHit
    ? pointInRect(x, y, e.x, e.y, e.w * e.scale + slop * 2, e.h * e.scale + slop * 2)
    : pointInCircle(x, y, e.x, e.y, e.radius * e.scale + slop);
}

/**
 * Topmost entity under a point, or -1.
 *
 * Ties on layer are broken by whichever centre is nearer the touch, so two
 * overlapping same-layer targets resolve the way the player expects rather
 * than by pool order.
 */
export function hitTest<TData>(
  store: EntityStore<TData>,
  x: number,
  y: number,
  options: HitTestOptions = {},
): EntityId {
  const slop = options.slopPx ?? 0;
  const { kind, minLayer } = options;

  let bestId: EntityId = -1;
  let bestLayer = -Infinity;
  let bestDistSq = Infinity;

  store.forEachActive(e => {
    if (kind !== undefined && e.kind !== kind) return;
    if (minLayer !== undefined && e.layer < minLayer) return;
    if (!hits(e, x, y, slop)) return;

    const dx = x - e.x;
    const dy = y - e.y;
    const distSq = dx * dx + dy * dy;

    if (e.layer > bestLayer || (e.layer === bestLayer && distSq < bestDistSq)) {
      bestLayer = e.layer;
      bestDistSq = distSq;
      bestId = e.id;
    }
  });

  return bestId;
}
