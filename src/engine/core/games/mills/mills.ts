import type { Board, Player, PositionId } from './types';

export const MILL_LINES = [
  ['a7','d7','g7'], ['b6','d6','f6'], ['c5','d5','e5'],
  ['a4','b4','c4'], ['e4','f4','g4'], ['c3','d3','e3'],
  ['b2','d2','f2'], ['a1','d1','g1'], ['a7','a4','a1'],
  ['b6','b4','b2'], ['c5','c4','c3'], ['d7','d6','d5'],
  ['d3','d2','d1'], ['e5','e4','e3'], ['f6','f4','f2'],
  ['g7','g4','g1'],
] as const satisfies readonly (readonly PositionId[])[];

export function millId(line: readonly PositionId[]): string { return line.join('-'); }

export function getCompletedMills(board: Board, player: Player): readonly (readonly PositionId[])[] {
  return MILL_LINES.filter(line => line.every(position => board[position] === player));
}

export function isPieceInMill(board: Board, position: PositionId): boolean {
  const player = board[position];
  return player !== null && MILL_LINES.some(line => (line as readonly PositionId[]).includes(position) && line.every(id => board[id] === player));
}

export function newlyCompletedMills(before: Board, after: Board, player: Player): readonly (readonly PositionId[])[] {
  const previous = new Set(getCompletedMills(before, player).map(millId));
  return getCompletedMills(after, player).filter(line => !previous.has(millId(line)));
}
