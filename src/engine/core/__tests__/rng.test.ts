import { createSeededRandom, pickRandom, randomInt, randomRange, shuffle } from '../rng';

/**
 * Moved here from `src/utils/__tests__/seededRandom.test.ts` when the shim in
 * `src/utils/seededRandom.ts` was deleted — the PRNG is engine
 * infrastructure, so its coverage lives beside the implementation.
 */

describe('createSeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('always returns values in [0, 1)', () => {
    const rng = createSeededRandom(7);
    for (let i = 0; i < 500; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('does not immediately repeat for seed 0', () => {
    // Guards the `seed >>> 0` path — a generator that returns a constant for
    // seed 0 would make every default-seeded session identical and static.
    const rng = createSeededRandom(0);
    const values = Array.from({ length: 10 }, () => rng());
    expect(new Set(values).size).toBeGreaterThan(1);
  });
});

describe('randomInt', () => {
  it('stays within [min, max] inclusive', () => {
    const rng = createSeededRandom(3);
    for (let i = 0; i < 200; i++) {
      const v = randomInt(rng, 2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('reaches both endpoints of the range', () => {
    const rng = createSeededRandom(31);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randomInt(rng, 0, 3));
    expect(seen).toEqual(new Set([0, 1, 2, 3]));
  });

  it('is deterministic under a fixed seed', () => {
    const a = randomInt(createSeededRandom(9), 0, 100);
    const b = randomInt(createSeededRandom(9), 0, 100);
    expect(a).toBe(b);
  });
});

describe('randomRange', () => {
  it('stays within [min, max)', () => {
    const rng = createSeededRandom(17);
    for (let i = 0; i < 300; i++) {
      const v = randomRange(rng, -5, 5);
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThan(5);
    }
  });

  it('is deterministic under a fixed seed', () => {
    expect(randomRange(createSeededRandom(4), 0, 1)).toBe(randomRange(createSeededRandom(4), 0, 1));
  });
});

describe('pickRandom', () => {
  it('only returns items from the input list', () => {
    const rng = createSeededRandom(5);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(pickRandom(rng, items));
    }
  });

  it('throws on an empty list', () => {
    expect(() => pickRandom(createSeededRandom(1), [])).toThrow();
  });
});

describe('shuffle', () => {
  it('does not mutate the input array', () => {
    const rng = createSeededRandom(11);
    const items = [1, 2, 3, 4, 5];
    const copy = [...items];
    shuffle(rng, items);
    expect(items).toEqual(copy);
  });

  it('is a permutation of the input (same elements, same length)', () => {
    const rng = createSeededRandom(11);
    const items = [1, 2, 3, 4, 5];
    const result = shuffle(rng, items);
    expect(result).toHaveLength(items.length);
    expect([...result].sort()).toEqual([...items].sort());
  });

  it('is deterministic under a fixed seed', () => {
    const a = shuffle(createSeededRandom(20), [1, 2, 3, 4, 5]);
    const b = shuffle(createSeededRandom(20), [1, 2, 3, 4, 5]);
    expect(a).toEqual(b);
  });
});
