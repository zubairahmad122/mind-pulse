import { createSeededRandom } from '../seededRandom';
import { generateSymbol, symbolsEqual, type SymbolSpec } from '../neonCipherSymbols';
import {
  computeSafeGridLayout,
  generateDistractor,
  generateGrid,
  type DistractorSimilarity,
} from '../neonCipherGrid';

const SIMILARITIES: DistractorSimilarity[] = ['obvious', 'moderate', 'close'];

describe('generateDistractor', () => {
  it.each(SIMILARITIES)('never produces an exact trait-match to the target (%s)', similarity => {
    const rng = createSeededRandom(1);
    const target = generateSymbol(createSeededRandom(5));
    for (let i = 0; i < 100; i++) {
      const distractor = generateDistractor(rng, target, similarity);
      expect(symbolsEqual(distractor, target)).toBe(false);
    }
  });

  it("'moderate' and 'close' distractors always share the target's base shape", () => {
    const rng = createSeededRandom(2);
    const target = generateSymbol(createSeededRandom(6));
    for (let i = 0; i < 100; i++) {
      expect(generateDistractor(rng, target, 'moderate').baseShape).toBe(target.baseShape);
      expect(generateDistractor(rng, target, 'close').baseShape).toBe(target.baseShape);
    }
  });

  it("'close' distractors differ from the target only by rotation and/or mirroring — never by color, and never by accent/stroke", () => {
    const rng = createSeededRandom(3);
    const target = generateSymbol(createSeededRandom(7));
    for (let i = 0; i < 100; i++) {
      const d = generateDistractor(rng, target, 'close');
      expect(d.accentCount).toBe(target.accentCount);
      expect(d.strokeWeight).toBe(target.strokeWeight);
      // Must differ by at least one geometric trait (rotation/mirror) —
      // this is the structural guarantee that discrimination never depends
      // on color, since no color property exists on SymbolSpec at all.
      expect(d.rotationDeg !== target.rotationDeg || d.mirrored !== target.mirrored).toBe(true);
    }
  });
});

describe('generateGrid', () => {
  it('contains exactly one exact match to the target, at targetIndex', () => {
    const rng = createSeededRandom(10);
    const target = generateSymbol(createSeededRandom(11));
    const { cells, targetIndex } = generateGrid(rng, 4, target, 'moderate');

    expect(cells).toHaveLength(16);
    expect(symbolsEqual(cells[targetIndex], target)).toBe(true);

    const exactMatches = cells.filter(c => symbolsEqual(c, target));
    expect(exactMatches).toHaveLength(1);
  });

  it('distractors are fully unique wherever the trait space allows it (Phase A sizes)', () => {
    // Gentle (3x3, 'obvious') and Casual (4x4, 'moderate') both stay within
    // the reachable trait-space ceiling, so every distractor must be unique.
    const rng = createSeededRandom(12);
    const gentleTarget = generateSymbol(createSeededRandom(13));
    const gentle = generateGrid(rng, 3, gentleTarget, 'obvious');
    expect(new Set(gentle.cells.map(c => `${c.baseShape}:${c.rotationDeg}:${c.mirrored}:${c.accentCount}:${c.strokeWeight}`)).size).toBe(9);

    const casualTarget = generateSymbol(createSeededRandom(14));
    const casual = generateGrid(rng, 4, casualTarget, 'moderate');
    expect(new Set(casual.cells.map(c => `${c.baseShape}:${c.rotationDeg}:${c.mirrored}:${c.accentCount}:${c.strokeWeight}`)).size).toBe(16);
  });

  it("'close' similarity at a 5x5 grid may repeat distractors (24 needed > 15 reachable combinations) but always keeps exactly one true target match", () => {
    const rng = createSeededRandom(12);
    const target = generateSymbol(createSeededRandom(13));
    const { cells, targetIndex } = generateGrid(rng, 5, target, 'close');

    expect(symbolsEqual(cells[targetIndex], target)).toBe(true);
    expect(cells.filter(c => symbolsEqual(c, target))).toHaveLength(1);

    const ids = cells.map(c => `${c.baseShape}:${c.rotationDeg}:${c.mirrored}:${c.accentCount}:${c.strokeWeight}`);
    // At most 15 reachable non-target combinations for 'close', plus the
    // target's own id = 16 max unique ids across all 25 cells — this is
    // documented, expected behavior, not a bug (see generateGrid's doc
    // comment), so this asserts the ceiling rather than full uniqueness.
    expect(new Set(ids).size).toBeLessThanOrEqual(16);
  });

  it('is deterministic under a fixed seed', () => {
    const target = generateSymbol(createSeededRandom(1));
    const a = generateGrid(createSeededRandom(50), 4, target, 'moderate');
    const b = generateGrid(createSeededRandom(50), 4, target, 'moderate');
    expect(a).toEqual(b);
  });

  it('works at every supported grid size without throwing', () => {
    const rng = createSeededRandom(21);
    for (const size of [3, 4, 5]) {
      const target = generateSymbol(rng);
      expect(() => generateGrid(rng, size, target, 'obvious')).not.toThrow();
    }
  });
});

describe('computeSafeGridLayout', () => {
  it('never returns a cell size below the 48dp minimum touch target', () => {
    const scenarios: [number, number, number][] = [
      [400, 700, 5], // typical phone
      [320, 568, 5], // small Android
      [280, 500, 4], // very small screen
      [1024, 1366, 5], // tablet
    ];
    for (const [w, h, desired] of scenarios) {
      const { cellSize } = computeSafeGridLayout(w, h, desired);
      expect(cellSize).toBeGreaterThanOrEqual(48);
    }
  });

  it('degrades grid size on a small screen rather than shrinking below 48dp', () => {
    const { gridSize, cellSize } = computeSafeGridLayout(280, 500, 5);
    expect(gridSize).toBeLessThanOrEqual(5);
    expect(gridSize).toBeGreaterThanOrEqual(3);
    expect(cellSize).toBeGreaterThanOrEqual(48);
  });

  it('never returns a grid smaller than 3x3', () => {
    const { gridSize } = computeSafeGridLayout(100, 100, 5);
    expect(gridSize).toBeGreaterThanOrEqual(3);
  });

  it('does not increase the grid size beyond what was requested', () => {
    const { gridSize } = computeSafeGridLayout(2000, 2000, 4);
    expect(gridSize).toBe(4);
  });
});

// Guards the "no duplicate target/distractor" contract across a wide seed
// range — a lightweight fuzz pass on top of the fixed-seed tests above.
describe('generateGrid — fuzz coverage', () => {
  it('holds the single-target invariant across many seeds and sizes', () => {
    for (let seed = 0; seed < 40; seed++) {
      const rng = createSeededRandom(seed);
      const target: SymbolSpec = generateSymbol(rng);
      const size = [3, 4, 5][seed % 3];
      const similarity = (['obvious', 'moderate', 'close'] as const)[seed % 3];
      const { cells, targetIndex } = generateGrid(rng, size, target, similarity);
      expect(symbolsEqual(cells[targetIndex], target)).toBe(true);
      expect(cells.filter(c => symbolsEqual(c, target))).toHaveLength(1);
    }
  });
});
