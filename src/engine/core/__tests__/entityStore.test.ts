import { createEntityStore } from '../entities/entityStore';

describe('createEntityStore', () => {
  it('spawns, reads back and kills', () => {
    const store = createEntityStore(4);
    const id = store.spawn({ kind: 'target', x: 10, y: 20, radius: 5 });
    expect(store.count).toBe(1);
    expect(store.get(id)?.x).toBe(10);
    store.kill(id);
    expect(store.count).toBe(0);
    expect(store.get(id)).toBeUndefined();
  });

  it('returns -1 rather than growing past capacity', () => {
    const store = createEntityStore(2);
    expect(store.spawn({ kind: 'a' })).toBeGreaterThanOrEqual(0);
    expect(store.spawn({ kind: 'a' })).toBeGreaterThanOrEqual(0);
    expect(store.spawn({ kind: 'a' })).toBe(-1);
    expect(store.count).toBe(2);
  });

  it('invalidates a stale id after the slot is recycled', () => {
    const store = createEntityStore(1);
    const first = store.spawn({ kind: 'a', x: 1 });
    store.kill(first);
    const second = store.spawn({ kind: 'b', x: 2 });
    // Same underlying slot, different generation — the old handle must not
    // silently address the new entity.
    expect(second).not.toBe(first);
    expect(store.get(first)).toBeUndefined();
    expect(store.get(second)?.kind).toBe('b');
  });

  it('killing a stale id does not disturb the live entity', () => {
    const store = createEntityStore(1);
    const first = store.spawn({ kind: 'a' });
    store.kill(first);
    const second = store.spawn({ kind: 'b' });
    store.kill(first);
    expect(store.count).toBe(1);
    expect(store.get(second)).toBeDefined();
  });

  it('integrates position from velocity in px/second', () => {
    const store = createEntityStore(2);
    const id = store.spawn({ kind: 'a', x: 0, y: 0, vx: 100, vy: -50 });
    store.integrate(1000);
    const e = store.get(id)!;
    expect(e.x).toBeCloseTo(100);
    expect(e.y).toBeCloseTo(-50);
    expect(e.prevX).toBe(0);
  });

  it('expires entities at their ttl', () => {
    const store = createEntityStore(2);
    store.spawn({ kind: 'a', ttlMs: 100 });
    store.integrate(50);
    expect(store.count).toBe(1);
    store.integrate(60);
    expect(store.count).toBe(0);
  });

  it('treats ttl -1 as immortal', () => {
    const store = createEntityStore(1);
    store.spawn({ kind: 'a', ttlMs: -1 });
    store.integrate(100_000);
    expect(store.count).toBe(1);
  });

  it('seeds prev position to the spawn point so a recycled slot never streaks', () => {
    const store = createEntityStore(1);
    const first = store.spawn({ kind: 'a', x: 0, y: 0, vx: 500 });
    store.integrate(1000);
    store.kill(first);
    const second = store.spawn({ kind: 'b', x: 10, y: 10 });
    const e = store.get(second)!;
    expect(e.prevX).toBe(10);
    expect(e.prevY).toBe(10);
  });

  it('queries by kind into a reused array', () => {
    const store = createEntityStore(4);
    store.spawn({ kind: 'target' });
    store.spawn({ kind: 'decoy' });
    store.spawn({ kind: 'target' });
    // The same array is reused across queries — that reuse is the point,
    // since a per-frame query must not allocate.
    const out: Parameters<typeof store.queryInto>[1] = [];
    expect(store.queryInto('target', out)).toHaveLength(2);
    expect(store.queryInto('decoy', out)).toHaveLength(1);
  });

  it('clear frees every slot and invalidates outstanding ids', () => {
    const store = createEntityStore(3);
    const id = store.spawn({ kind: 'a' });
    store.spawn({ kind: 'b' });
    store.clear();
    expect(store.count).toBe(0);
    expect(store.get(id)).toBeUndefined();
    expect(store.spawn({ kind: 'c' })).toBeGreaterThanOrEqual(0);
  });
});
