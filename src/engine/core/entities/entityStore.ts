import type { Entity, EntityId, EntityInit } from '../types';

/**
 * Fixed-capacity entity pool.
 *
 * Every entity is allocated once at construction and recycled forever after,
 * so a live session never triggers GC from spawning. That matters more than
 * it sounds: a mid-session garbage collection on a low-end Android device is
 * exactly the 100ms+ frame spike the Phase 1 gate forbids.
 *
 * Capacity is hard. `spawn` past capacity returns -1 rather than growing —
 * a dropped particle is invisible, a reallocation mid-frame is a stutter the
 * player feels. Callers that care can check the return value.
 *
 * Ids encode a generation counter so a stale id held across a recycle
 * resolves to `undefined` instead of silently addressing a different entity.
 */
export interface EntityStore<TData = unknown> {
  readonly capacity: number;
  readonly count: number;

  spawn(init: EntityInit<TData>): EntityId;
  kill(id: EntityId): void;
  get(id: EntityId): Entity<TData> | undefined;

  /** Iterates live entities. The callback must not spawn or kill. */
  forEachActive(fn: (e: Entity<TData>) => void): void;
  /** Fills `out` with live entities of `kind` and returns it — pass a reused
   *  array to keep per-frame allocation at zero. */
  queryInto(kind: string, out: Entity<TData>[]): Entity<TData>[];

  /** Advances position by velocity and ages entities, killing expired ones. */
  integrate(dtMs: number): void;

  clear(): void;
}

function reset<TData>(e: Entity<TData>, id: EntityId, init: EntityInit<TData>): void {
  e.id = id;
  e.kind = init.kind;
  e.active = true;
  e.layer = init.layer ?? 0;
  e.x = init.x ?? 0;
  e.y = init.y ?? 0;
  e.vx = init.vx ?? 0;
  e.vy = init.vy ?? 0;
  // A fresh entity has no motion history — seeding prev to the spawn point
  // stops the renderer interpolating it in from wherever the recycled slot
  // happened to die.
  e.prevX = e.x;
  e.prevY = e.y;
  e.radius = init.radius ?? 0;
  e.w = init.w ?? 0;
  e.h = init.h ?? 0;
  e.useRectHit = init.useRectHit ?? false;
  e.rotation = init.rotation ?? 0;
  e.scale = init.scale ?? 1;
  e.sprite = init.sprite ?? 1;
  e.r = init.r ?? 1;
  e.g = init.g ?? 1;
  e.b = init.b ?? 1;
  e.a = init.a ?? 1;
  e.ageMs = 0;
  e.ttlMs = init.ttlMs ?? -1;
  e.data = init.data ?? null;
}

export function createEntityStore<TData = unknown>(capacity: number): EntityStore<TData> {
  if (capacity < 1) throw new Error('createEntityStore: capacity must be >= 1');

  const slots: Entity<TData>[] = new Array(capacity);
  const generation = new Int32Array(capacity);
  const free: number[] = new Array(capacity);

  for (let i = 0; i < capacity; i++) {
    slots[i] = {
      id: -1, kind: '', active: false, layer: 0,
      x: 0, y: 0, vx: 0, vy: 0, prevX: 0, prevY: 0,
      radius: 0, w: 0, h: 0, useRectHit: false,
      rotation: 0, scale: 1,
      sprite: 1, r: 1, g: 1, b: 1, a: 1,
      ageMs: 0, ttlMs: -1, data: null,
    };
    // Reverse order so the first spawns come out of slot 0 upward, which
    // keeps early entities contiguous and makes benchmark traces readable.
    free[i] = capacity - 1 - i;
  }

  let live = 0;

  const indexOf = (id: EntityId): number => {
    if (id < 0) return -1;
    const index = id % capacity;
    const gen = Math.floor(id / capacity);
    return generation[index] === gen && slots[index].active ? index : -1;
  };

  return {
    capacity,
    get count() {
      return live;
    },

    spawn(init) {
      const index = free.pop();
      if (index === undefined) return -1;
      const id = generation[index] * capacity + index;
      reset(slots[index], id, init);
      live++;
      return id;
    },

    kill(id) {
      const index = indexOf(id);
      if (index === -1) return;
      slots[index].active = false;
      slots[index].data = null;
      // Bumping the generation invalidates every outstanding copy of this id.
      generation[index]++;
      free.push(index);
      live--;
    },

    get(id) {
      const index = indexOf(id);
      return index === -1 ? undefined : slots[index];
    },

    forEachActive(fn) {
      for (let i = 0; i < capacity; i++) {
        const e = slots[i];
        if (e.active) fn(e);
      }
    },

    queryInto(kind, out) {
      out.length = 0;
      for (let i = 0; i < capacity; i++) {
        const e = slots[i];
        if (e.active && e.kind === kind) out.push(e);
      }
      return out;
    },

    integrate(dtMs) {
      const dtSec = dtMs / 1000;
      for (let i = 0; i < capacity; i++) {
        const e = slots[i];
        if (!e.active) continue;
        e.prevX = e.x;
        e.prevY = e.y;
        e.x += e.vx * dtSec;
        e.y += e.vy * dtSec;
        e.ageMs += dtMs;
        if (e.ttlMs >= 0 && e.ageMs >= e.ttlMs) {
          e.active = false;
          e.data = null;
          generation[i]++;
          free.push(i);
          live--;
        }
      }
    },

    clear() {
      free.length = 0;
      for (let i = 0; i < capacity; i++) {
        if (slots[i].active) generation[i]++;
        slots[i].active = false;
        slots[i].data = null;
        free[i] = capacity - 1 - i;
      }
      live = 0;
    },
  };
}
