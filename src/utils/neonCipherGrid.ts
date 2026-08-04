import { pickRandom, randomInt, shuffle, type SeededRandom } from './seededRandom';
import {
  SYMBOL_BASE_SHAPES,
  SYMBOL_ROTATIONS,
  symbolId,
  symbolsEqual,
  type SymbolBaseShape,
  type SymbolSpec,
} from './neonCipherSymbols';

/**
 * Controls how close a distractor is to the target. "obvious" distractors
 * may differ by base shape entirely (Gentle); "close" distractors share the
 * base shape and differ only by rotation/mirroring (Sharp/Elite) — the
 * hardest, most genuine visual-search case. Phase A only ever requests
 * 'obvious' or 'moderate' (Gentle/Casual); 'close' exists for Phase B.
 */
export type DistractorSimilarity = 'obvious' | 'moderate' | 'close';

/**
 * Generates one distractor for `target`, guaranteed to not be an exact
 * trait-match (never returns something `symbolsEqual` to the target).
 */
export function generateDistractor(
  rng: SeededRandom,
  target: SymbolSpec,
  similarity: DistractorSimilarity,
): SymbolSpec {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = buildDistractorCandidate(rng, target, similarity);
    if (!symbolsEqual(candidate, target)) return candidate;
  }
  // Extremely unlikely fallback (traits space is large relative to 20
  // attempts) — force a difference on the trait that's cheapest to vary.
  return { ...target, accentCount: target.accentCount === 3 ? 1 : ((target.accentCount + 1) as 1 | 2 | 3) };
}

function buildDistractorCandidate(
  rng: SeededRandom,
  target: SymbolSpec,
  similarity: DistractorSimilarity,
): SymbolSpec {
  if (similarity === 'obvious') {
    // May differ by base shape entirely, or by an obvious accent-count gap.
    const differByShape = rng() < 0.6;
    const baseShape: SymbolBaseShape = differByShape
      ? pickRandom(rng, SYMBOL_BASE_SHAPES.filter(s => s !== target.baseShape))
      : target.baseShape;
    return {
      baseShape,
      rotationDeg: pickRandom(rng, SYMBOL_ROTATIONS),
      mirrored: rng() < 0.5,
      accentCount: pickRandom(rng, [1, 2, 3] as const),
      strokeWeight: rng() < 0.5 ? 'thin' : 'bold',
    };
  }

  if (similarity === 'moderate') {
    // Same base shape, exactly one other trait varied.
    const varyRotation = rng() < 0.5;
    return {
      baseShape: target.baseShape,
      rotationDeg: varyRotation ? pickRandom(rng, SYMBOL_ROTATIONS) : target.rotationDeg,
      mirrored: varyRotation ? target.mirrored : !target.mirrored,
      accentCount: target.accentCount,
      strokeWeight: target.strokeWeight,
    };
  }

  // 'close' — same base shape, differs only by rotation and/or mirroring.
  const rotationOptions = SYMBOL_ROTATIONS.filter(r => r !== target.rotationDeg);
  const varyMirror = rng() < 0.5;
  return {
    baseShape: target.baseShape,
    rotationDeg: varyMirror ? target.rotationDeg : pickRandom(rng, rotationOptions),
    mirrored: varyMirror ? !target.mirrored : target.mirrored,
    accentCount: target.accentCount,
    strokeWeight: target.strokeWeight,
  };
}

export interface GeneratedGrid {
  cells: SymbolSpec[];
  targetIndex: number;
}

/**
 * Builds a full grid containing exactly one true match to `target` and
 * `gridSize * gridSize - 1` distractors, unique wherever the trait space for
 * the requested similarity allows it.
 *
 * 'moderate'/'close' hold base shape, accent count, and stroke weight fixed
 * to the target and only vary rotation/mirroring — a deliberately small,
 * genuinely-similar-looking space (at most 15 combinations: 8 rotations x
 * 2 mirror states, minus the target's own). At small grids (Gentle's 3x3,
 * Casual's 4x4) that's enough for full distractor uniqueness. At larger
 * grids with 'close' similarity (Sharp/Elite's 5x5, needing 24), the pool
 * is smaller than the grid — some visual repetition among distractors is
 * then unavoidable and realistic (many real visual-search puzzles repeat
 * near-identical foils at their hardest setting). The only guarantee that
 * always holds is exactly one true match to the target.
 */
export function generateGrid(
  rng: SeededRandom,
  gridSize: number,
  target: SymbolSpec,
  similarity: DistractorSimilarity,
): GeneratedGrid {
  const cellCount = gridSize * gridSize;
  const targetIndex = randomInt(rng, 0, cellCount - 1);
  const distractorPool = generateDistractorPool(rng, target, similarity, cellCount - 1);

  const cells: SymbolSpec[] = [];
  let poolIndex = 0;
  for (let i = 0; i < cellCount; i++) {
    cells.push(i === targetIndex ? target : distractorPool[poolIndex++]);
  }

  return { cells, targetIndex };
}

/**
 * Builds `count` distractors for `target`. For 'obvious' (a large space),
 * generates uniquely via retry. For 'moderate'/'close', enumerates every
 * reachable rotation/mirror combination, shuffles it, and cycles through
 * it if `count` exceeds the pool size — see `generateGrid`'s doc comment
 * for why that cycling is expected, not a bug.
 */
function generateDistractorPool(
  rng: SeededRandom,
  target: SymbolSpec,
  similarity: DistractorSimilarity,
  count: number,
): SymbolSpec[] {
  if (similarity === 'obvious') {
    const pool: SymbolSpec[] = [];
    const usedIds = new Set<string>([symbolId(target)]);
    while (pool.length < count) {
      const candidate = buildDistractorCandidate(rng, target, similarity);
      const id = symbolId(candidate);
      if (usedIds.has(id)) continue;
      usedIds.add(id);
      pool.push(candidate);
    }
    return pool;
  }

  const allCombos: SymbolSpec[] = [];
  for (const rotationDeg of SYMBOL_ROTATIONS) {
    for (const mirrored of [false, true]) {
      const candidate: SymbolSpec = {
        baseShape: target.baseShape,
        rotationDeg,
        mirrored,
        accentCount: target.accentCount,
        strokeWeight: target.strokeWeight,
      };
      if (!symbolsEqual(candidate, target)) allCombos.push(candidate);
    }
  }
  const shuffled = shuffle(rng, allCombos);
  return Array.from({ length: count }, (_, i) => shuffled[i % shuffled.length]);
}

export interface SafeGridLayout {
  gridSize: number;
  cellSize: number;
}

const MIN_TOUCH_TARGET_DP = 48;
const MIN_GRID_SIZE = 3;

/**
 * Degrades the requested grid size (never increases it) until every cell
 * meets the 48dp minimum touch target, given the available canvas space and
 * a per-cell gap. Never returns a grid smaller than 3x3 — if even a 3x3
 * grid can't fit 48dp cells, cellSize is clamped to 48 and allowed to
 * overflow slightly rather than produce an unusable sub-3x3 grid.
 */
export function computeSafeGridLayout(
  availableWidth: number,
  availableHeight: number,
  desiredGridSize: number,
  gapDp = 8,
): SafeGridLayout {
  const shortestSide = Math.max(1, Math.min(availableWidth, availableHeight));

  let gridSize = desiredGridSize;
  while (gridSize > MIN_GRID_SIZE) {
    const cellSize = (shortestSide - gapDp * (gridSize - 1)) / gridSize;
    if (cellSize >= MIN_TOUCH_TARGET_DP) break;
    gridSize -= 1;
  }

  const rawCellSize = (shortestSide - gapDp * (gridSize - 1)) / gridSize;
  const cellSize = Math.max(MIN_TOUCH_TARGET_DP, Math.floor(rawCellSize));

  return { gridSize, cellSize };
}
