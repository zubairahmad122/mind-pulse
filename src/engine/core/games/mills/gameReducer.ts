import { capturePiece, createInitialGame, movePiece, placePiece, selectPiece, undoTurn } from './gameEngine';
import type { GameAction, GameState } from './types';

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLACE': return placePiece(state, action.position, action.expectedRevision);
    case 'SELECT': return selectPiece(state, action.position);
    case 'MOVE': return movePiece(state, action.to, action.expectedRevision);
    case 'CAPTURE': return capturePiece(state, action.position, action.expectedRevision);
    case 'UNDO': return undoTurn(state);
    case 'UPDATE_SETTINGS': return { ...state, settings: { ...state.settings, ...action.settings }, revision: state.revision + 1 };
    case 'RESTORE': return action.state;
    case 'RESTART': return createInitialGame(
      { ...state.settings, startingPlayer: action.startingPlayer ?? state.settings.startingPlayer },
      action.now,
    );
  }
}
