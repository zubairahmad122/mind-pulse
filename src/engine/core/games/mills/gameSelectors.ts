import { canCapturePiece, getLegalDestinations } from './legalMoves';
import { POSITION_IDS, type GameState, type PositionId } from './types';

export function getSelectablePieces(state: GameState): readonly PositionId[] {
  if (state.phase !== 'movement' || state.capturePending || state.result) return [];
  return POSITION_IDS.filter(id => state.board[id] === state.currentPlayer && getLegalDestinations(state.board, state.currentPlayer, id).length > 0);
}

export function getVisibleLegalDestinations(state: GameState): readonly PositionId[] {
  if (state.phase === 'placement' && !state.capturePending) return POSITION_IDS.filter(id => state.board[id] === null);
  return state.selectedPosition ? getLegalDestinations(state.board, state.currentPlayer, state.selectedPosition) : [];
}

export function getCapturablePieces(state: GameState): readonly PositionId[] {
  if (!state.capturePending) return [];
  return POSITION_IDS.filter(id => canCapturePiece(state.board, state.currentPlayer, id));
}

export function getTurnInstruction(state: GameState): string {
  const name = state.settings.playerNames[state.currentPlayer];
  if (state.capturePending) return 'Mill formed — remove one opponent piece';
  if (state.phase === 'placement') return `${name}: Place a piece`;
  if (!state.selectedPosition) return `${name}: Select a piece`;
  if (state.players[state.currentPlayer].piecesToPlace === 0 && POSITION_IDS.filter(id => state.board[id] === state.currentPlayer).length === 3) {
    return 'Flying active — move to any empty position';
  }
  return 'Choose a highlighted position';
}

