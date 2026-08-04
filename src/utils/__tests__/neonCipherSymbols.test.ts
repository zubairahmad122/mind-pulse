import { createSeededRandom } from '../seededRandom';
import {
  SYMBOL_BASE_SHAPES,
  SYMBOL_ROTATIONS,
  generateSymbol,
  symbolId,
  symbolsEqual,
} from '../neonCipherSymbols';

describe('generateSymbol', () => {
  it('only produces traits from the defined trait sets', () => {
    const rng = createSeededRandom(1);
    for (let i = 0; i < 200; i++) {
      const s = generateSymbol(rng);
      expect(SYMBOL_BASE_SHAPES).toContain(s.baseShape);
      expect(SYMBOL_ROTATIONS).toContain(s.rotationDeg);
      expect([1, 2, 3]).toContain(s.accentCount);
      expect(['thin', 'bold']).toContain(s.strokeWeight);
      expect(typeof s.mirrored).toBe('boolean');
    }
  });

  it('is deterministic under a fixed seed', () => {
    const a = generateSymbol(createSeededRandom(99));
    const b = generateSymbol(createSeededRandom(99));
    expect(a).toEqual(b);
  });
});

describe('symbolId / symbolsEqual', () => {
  it('produces the same id for identical traits', () => {
    const s1 = { baseShape: 'hex', rotationDeg: 90, mirrored: false, accentCount: 2, strokeWeight: 'bold' } as const;
    const s2 = { ...s1 };
    expect(symbolId(s1)).toBe(symbolId(s2));
    expect(symbolsEqual(s1, s2)).toBe(true);
  });

  it('produces a different id when any single trait differs', () => {
    const base = { baseShape: 'hex', rotationDeg: 90, mirrored: false, accentCount: 2, strokeWeight: 'bold' } as const;
    const variants = [
      { ...base, baseShape: 'diamond' as const },
      { ...base, rotationDeg: 180 as const },
      { ...base, mirrored: true },
      { ...base, accentCount: 3 as const },
      { ...base, strokeWeight: 'thin' as const },
    ];
    for (const v of variants) {
      expect(symbolsEqual(base, v)).toBe(false);
    }
  });
});
