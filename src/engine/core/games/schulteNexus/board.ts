import { shuffle, type SeededRandom } from '../../rng';
import type { SchulteBoardPosition, SchulteChallenge, SchulteTransformRule } from './types';

/**
 * Board layout and transforms.
 *
 * Everything here is a permutation of *positions*. No function adds, removes
 * or duplicates a value, which is the mechanical reason a transformed board is
 * still solvable: the tap order is expressed in values, and every value the
 * player still needs is still somewhere on the grid.
 */

/** Scatters `values` across a `size` × `size` grid, row-major, deterministically. */
export function layoutBoard(rng: SeededRandom, values: readonly number[]): SchulteBoardPosition[] {
  const size = Math.round(Math.sqrt(values.length));
  const scattered = shuffle(rng, values);
  return scattered.map((value, index) => ({
    value,
    row: Math.floor(index / size),
    column: index % size,
  }));
}

function toGrid(positions: readonly SchulteBoardPosition[], size: number): number[][] {
  const grid: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  for (const position of positions) grid[position.row][position.column] = position.value;
  return grid;
}

function fromGrid(grid: readonly (readonly number[])[]): SchulteBoardPosition[] {
  const positions: SchulteBoardPosition[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let column = 0; column < grid.length; column++) {
      positions.push({ value: grid[row][column], row, column });
    }
  }
  return positions;
}

function rotateRow(grid: number[][], row: number, offset: number): void {
  const size = grid.length;
  const source = grid[row].slice();
  for (let column = 0; column < size; column++) {
    grid[row][(((column + offset) % size) + size) % size] = source[column];
  }
}

function rotateColumn(grid: number[][], column: number, offset: number): void {
  const size = grid.length;
  const source = grid.map((cells) => cells[column]);
  for (let row = 0; row < size; row++) {
    grid[(((row + offset) % size) + size) % size][column] = source[row];
  }
}

/**
 * How many times the transform has fired after `stepIndex` taps.
 *
 * Applications happen *between* taps, so the count at step 0 is always 0 —
 * the board a player sees when the mission opens is `boardPositions` exactly.
 */
export function transformApplicationCount(rule: SchulteTransformRule, stepIndex: number): number {
  if (rule.kind === 'none' || rule.everySteps < 1) return 0;
  return Math.floor(Math.max(0, stepIndex) / rule.everySteps);
}

/**
 * The board as it looks after `stepIndex` taps.
 *
 * Pure — it never mutates `challenge.boardPositions`, it replays the shifts
 * from the original layout. Replaying rather than accumulating means the
 * caller can jump to any step (a resume, a test assertion, a replay scrubber)
 * without having walked the ones before it.
 */
export function applyTransformAtStep(
  challenge: SchulteChallenge,
  stepIndex: number,
): readonly SchulteBoardPosition[] {
  const rule = challenge.transformRule;
  const applications = transformApplicationCount(rule, stepIndex);
  if (applications === 0) return challenge.boardPositions;

  const size = challenge.boardSize;
  const grid = toGrid(challenge.boardPositions, size);

  for (let application = 0; application < applications; application++) {
    const axis = rule.advanceAxis
      ? (rule.axisIndex + application) % size
      : rule.axisIndex % size;
    if (rule.kind === 'row-shift') rotateRow(grid, axis, rule.offset);
    else rotateColumn(grid, axis, rule.offset);
  }

  return fromGrid(grid);
}
