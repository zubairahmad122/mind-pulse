import { shuffle, type SeededRandom } from '../../../rng';
import type { SchulteBoardPosition } from '../types';

/**
 * Non-square counterpart to `../board.ts`'s `layoutBoard` — same scatter
 * behaviour, independent row/column counts. Director-generated missions
 * never apply a board transform (row-shift/column-shift stay on the
 * existing square ladder path), so the transform-replay machinery in
 * `../board.ts` doesn't need to learn about rectangular grids at all.
 */
export function layoutRectBoard(
  rng: SeededRandom,
  values: readonly number[],
  rows: number,
  columns: number,
): SchulteBoardPosition[] {
  const scattered = shuffle(rng, values);
  return scattered.map((value, index) => ({
    value,
    row: Math.floor(index / columns),
    column: index % columns,
  }));
}
