/**
 * Deterministic PRNG (mulberry32) — shared by any eye-game engine that needs
 * reproducible round generation for tests, without pulling in a dependency.
 * Not cryptographically secure; not intended for anything beyond gameplay
 * randomness and deterministic test fixtures.
 */
export type SeededRandom = () => number;

export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max], inclusive. */
export function randomInt(rng: SeededRandom, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Picks one element deterministically. Throws on an empty array — callers
 *  own an obviously-empty list, this isn't a runtime data condition. */
export function pickRandom<T>(rng: SeededRandom, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pickRandom: items must not be empty');
  return items[randomInt(rng, 0, items.length - 1)];
}

/** Fisher-Yates shuffle, deterministic under the given rng. Does not mutate the input. */
export function shuffle<T>(rng: SeededRandom, items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
