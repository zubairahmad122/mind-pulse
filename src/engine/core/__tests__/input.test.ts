import { createEntityStore } from '../entities/entityStore';
import { circlesOverlap, hitTest, pointInCircle, pointInRect } from '../input/hitTest';
import { createInputManager } from '../input/inputManager';

describe('createInputManager', () => {
  it('queues events and drains them in arrival order', () => {
    const input = createInputManager(8);
    input.enqueue(0, 'down', 1, 2, 100);
    input.enqueue(0, 'up', 3, 4, 120);
    const drained = input.drain();
    expect(drained).toHaveLength(2);
    expect(drained[0].phase).toBe('down');
    expect(drained[1].x).toBe(3);
  });

  it('empties the queue after draining', () => {
    const input = createInputManager(8);
    input.enqueue(0, 'down', 0, 0, 0);
    input.drain();
    expect(input.pending).toBe(0);
    expect(input.drain()).toHaveLength(0);
  });

  it('drops the oldest event when the queue overflows', () => {
    const input = createInputManager(2);
    input.enqueue(0, 'down', 1, 0, 0);
    input.enqueue(0, 'down', 2, 0, 0);
    input.enqueue(0, 'down', 3, 0, 0);
    const drained = input.drain();
    // Under a burst the newest intent is the one that still matters.
    expect(drained.map(e => e.x)).toEqual([2, 3]);
  });

  it('clear discards pending input', () => {
    const input = createInputManager(4);
    input.enqueue(0, 'down', 0, 0, 0);
    input.clear();
    expect(input.pending).toBe(0);
  });
});

describe('geometry', () => {
  it('tests points against circles and rects', () => {
    expect(pointInCircle(0, 0, 0, 0, 5)).toBe(true);
    expect(pointInCircle(6, 0, 0, 0, 5)).toBe(false);
    expect(pointInRect(4, 4, 0, 0, 10, 10)).toBe(true);
    expect(pointInRect(6, 0, 0, 0, 10, 10)).toBe(false);
  });

  it('detects circle overlap', () => {
    expect(circlesOverlap(0, 0, 5, 8, 0, 5)).toBe(true);
    expect(circlesOverlap(0, 0, 5, 11, 0, 5)).toBe(false);
  });
});

describe('hitTest', () => {
  it('returns -1 when nothing is under the point', () => {
    const store = createEntityStore(4);
    store.spawn({ kind: 'target', x: 100, y: 100, radius: 10 });
    expect(hitTest(store, 0, 0)).toBe(-1);
  });

  it('prefers the topmost layer', () => {
    const store = createEntityStore(4);
    store.spawn({ kind: 'target', x: 0, y: 0, radius: 20, layer: 1 });
    const top = store.spawn({ kind: 'target', x: 0, y: 0, radius: 20, layer: 5 });
    expect(hitTest(store, 0, 0)).toBe(top);
  });

  it('breaks a same-layer tie by proximity to centre', () => {
    const store = createEntityStore(4);
    store.spawn({ kind: 'target', x: 0, y: 0, radius: 30, layer: 1 });
    const nearer = store.spawn({ kind: 'target', x: 18, y: 0, radius: 30, layer: 1 });
    expect(hitTest(store, 20, 0)).toBe(nearer);
  });

  it('applies slop without changing the entity', () => {
    const store = createEntityStore(2);
    const id = store.spawn({ kind: 'target', x: 0, y: 0, radius: 10 });
    expect(hitTest(store, 14, 0)).toBe(-1);
    expect(hitTest(store, 14, 0, { slopPx: 6 })).toBe(id);
    expect(store.get(id)!.radius).toBe(10);
  });

  it('scales the hit area with the entity scale', () => {
    const store = createEntityStore(2);
    const id = store.spawn({ kind: 'target', x: 0, y: 0, radius: 10, scale: 2 });
    expect(hitTest(store, 18, 0)).toBe(id);
  });

  it('filters by kind and minimum layer', () => {
    const store = createEntityStore(4);
    store.spawn({ kind: 'decoy', x: 0, y: 0, radius: 20, layer: 9 });
    const target = store.spawn({ kind: 'target', x: 0, y: 0, radius: 20, layer: 1 });
    expect(hitTest(store, 0, 0, { kind: 'target' })).toBe(target);
    expect(hitTest(store, 0, 0, { minLayer: 20 })).toBe(-1);
  });

  it('supports rect colliders', () => {
    const store = createEntityStore(2);
    const id = store.spawn({ kind: 'bar', x: 0, y: 0, w: 100, h: 10, useRectHit: true });
    expect(hitTest(store, 40, 3)).toBe(id);
    expect(hitTest(store, 40, 9)).toBe(-1);
  });
});
