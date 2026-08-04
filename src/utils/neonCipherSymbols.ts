import { pickRandom, randomInt, type SeededRandom } from './seededRandom';

/**
 * Original, procedurally generated game symbols for Neon Cipher — never
 * letters/emoji/brand icons. A symbol is a base geometric form plus a small
 * set of independent traits (rotation, mirroring, accent-dot count, stroke
 * weight). Distractor generation (`neonCipherGrid.ts`) varies a controlled
 * subset of these traits to create genuinely similar-but-distinct symbols —
 * that variety is what makes the "visual search" mechanic real instead of
 * random noise.
 *
 * Correctness never depends on color — every trait here is shape/geometry
 * based, which satisfies "never depend only on color differences" by
 * construction rather than as a bolt-on accessibility mode.
 */
export const SYMBOL_BASE_SHAPES = [
  'triangle',
  'diamond',
  'hex',
  'chevron',
  'prism',
  'orbitRing',
  'spark',
  'arcCross',
] as const;

export type SymbolBaseShape = (typeof SYMBOL_BASE_SHAPES)[number];

/** 8-way rotation — enough visual variety without being indistinguishable. */
export const SYMBOL_ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const;

export type SymbolRotation = (typeof SYMBOL_ROTATIONS)[number];

export type SymbolStrokeWeight = 'thin' | 'bold';

export interface SymbolSpec {
  baseShape: SymbolBaseShape;
  rotationDeg: SymbolRotation;
  mirrored: boolean;
  /** Small accent dots/notches on the shape — a secondary, non-color trait. */
  accentCount: 1 | 2 | 3;
  strokeWeight: SymbolStrokeWeight;
}

/** Deterministic id from a symbol's traits — two specs with identical traits
 *  always produce the same id, used for grid dedupe and test assertions. */
export function symbolId(spec: SymbolSpec): string {
  return `${spec.baseShape}:${spec.rotationDeg}:${spec.mirrored ? 'm' : 'n'}:${spec.accentCount}:${spec.strokeWeight}`;
}

export function symbolsEqual(a: SymbolSpec, b: SymbolSpec): boolean {
  return symbolId(a) === symbolId(b);
}

export function generateSymbol(rng: SeededRandom): SymbolSpec {
  return {
    baseShape: pickRandom(rng, SYMBOL_BASE_SHAPES),
    rotationDeg: pickRandom(rng, SYMBOL_ROTATIONS),
    mirrored: rng() < 0.5,
    accentCount: randomInt(rng, 1, 3) as 1 | 2 | 3,
    strokeWeight: rng() < 0.5 ? 'thin' : 'bold',
  };
}
