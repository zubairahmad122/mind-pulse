import { ADJACENCY } from './boardConfig';
import { isPieceInMill } from './mills';
import { POSITION_IDS, type Board, type LegalMove, type Player, type PositionId } from './types';

export const opponentOf = (player: Player): Player => player === 'P1' ? 'P2' : 'P1';
export const countPieces = (board: Board, player: Player): number => POSITION_IDS.filter(id => board[id] === player).length;

export function getLegalDestinations(board: Board, player: Player, from: PositionId): readonly PositionId[] {
  if (board[from] !== player) return [];
  const candidates = countPieces(board, player) === 3 ? POSITION_IDS : ADJACENCY[from];
  return candidates.filter(id => board[id] === null);
}

export function getLegalMoves(board: Board, player: Player): readonly LegalMove[] {
  return POSITION_IDS.filter(id => board[id] === player).flatMap(from =>
    getLegalDestinations(board, player, from).map(to => ({ from, to })),
  );
}

export function isPlayerBlocked(board: Board, player: Player): boolean {
  return countPieces(board, player) >= 3 && getLegalMoves(board, player).length === 0;
}

export function canCapturePiece(board: Board, captor: Player, position: PositionId): boolean {
  const opponent = opponentOf(captor);
  if (board[position] !== opponent) return false;
  const opponentPieces = POSITION_IDS.filter(id => board[id] === opponent);
  const outsideMills = opponentPieces.filter(id => !isPieceInMill(board, id));
  return outsideMills.length === 0 || !isPieceInMill(board, position);
}

