import { POSITION_IDS, type Board, type PositionId } from './types';

export const ADJACENCY: Readonly<Record<PositionId, readonly PositionId[]>> = {
  a7:['d7','a4'], d7:['a7','g7','d6'], g7:['d7','g4'],
  b6:['d6','b4'], d6:['b6','f6','d7','d5'], f6:['d6','f4'],
  c5:['d5','c4'], d5:['c5','e5','d6'], e5:['d5','e4'],
  a4:['a7','a1','b4'], b4:['a4','c4','b6','b2'], c4:['b4','c5','c3'],
  e4:['e5','e3','f4'], f4:['e4','g4','f6','f2'], g4:['f4','g7','g1'],
  c3:['c4','d3'], d3:['c3','e3','d2'], e3:['d3','e4'],
  b2:['b4','d2'], d2:['b2','f2','d3','d1'], f2:['d2','f4'],
  a1:['a4','d1'], d1:['a1','g1','d2'], g1:['d1','g4'],
};

export const BOARD_COORDINATES: Readonly<Record<PositionId, readonly [number, number]>> = {
  a7:[0,0],d7:[3,0],g7:[6,0],b6:[1,1],d6:[3,1],f6:[5,1],
  c5:[2,2],d5:[3,2],e5:[4,2],a4:[0,3],b4:[1,3],c4:[2,3],
  e4:[4,3],f4:[5,3],g4:[6,3],c3:[2,4],d3:[3,4],e3:[4,4],
  b2:[1,5],d2:[3,5],f2:[5,5],a1:[0,6],d1:[3,6],g1:[6,6],
};

export function createEmptyBoard(): Board {
  return Object.fromEntries(POSITION_IDS.map(id => [id, null])) as Board;
}

export function isPositionId(value: unknown): value is PositionId {
  return typeof value === 'string' && (POSITION_IDS as readonly string[]).includes(value);
}

