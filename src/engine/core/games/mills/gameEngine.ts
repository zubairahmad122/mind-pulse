import { createEmptyBoard } from './boardConfig';
import { getDrawResult, serializeRepetitionState } from './drawDetection';
import { canCapturePiece, countPieces, getLegalDestinations, isPlayerBlocked, opponentOf } from './legalMoves';
import { millId, newlyCompletedMills } from './mills';
import type { GameResult, GameSnapshot, GameState, MillsSettings, Player, PositionId } from './types';

export const DEFAULT_MILLS_SETTINGS: MillsSettings = {
  playerNames: { P1: 'Player 1', P2: 'Player 2' },
  startingPlayer: 'P1',
  soundEnabled: true,
  hapticsEnabled: true,
  hintsEnabled: true,
  pieceTheme: 'classic',
  noCaptureDrawEnabled: true,
  noCaptureFullTurnLimit: 50,
};

function cloneSnapshot(state: GameSnapshot): GameSnapshot {
  return {
    board: { ...state.board },
    currentPlayer: state.currentPlayer,
    phase: state.phase,
    players: { P1: { ...state.players.P1 }, P2: { ...state.players.P2 } },
    selectedPosition: state.selectedPosition,
    capturePending: state.capturePending,
    turnNumber: state.turnNumber,
    completedPlayerTurnsWithoutCapture: state.completedPlayerTurnsWithoutCapture,
    repetitionCounts: { ...state.repetitionCounts },
    result: state.result ? { ...state.result } : null,
    lastMove: state.lastMove ? { ...state.lastMove } : null,
    lastCompletedMills: [...state.lastCompletedMills],
    startedAt: state.startedAt,
  };
}

function snapshotForUndo(state: GameState): GameSnapshot {
  return cloneSnapshot({ ...state, selectedPosition: null, capturePending: false });
}

export function createInitialGame(settings: Partial<MillsSettings> = {}, now = Date.now()): GameState {
  const merged: MillsSettings = {
    ...DEFAULT_MILLS_SETTINGS,
    ...settings,
    playerNames: { ...DEFAULT_MILLS_SETTINGS.playerNames, ...settings.playerNames },
  };
  const board = createEmptyBoard();
  const key = serializeRepetitionState(board, merged.startingPlayer, 'placement');
  return {
    board,
    currentPlayer: merged.startingPlayer,
    phase: 'placement',
    players: {
      P1: { piecesToPlace: 9, piecesCaptured: 0, millsFormed: 0 },
      P2: { piecesToPlace: 9, piecesCaptured: 0, millsFormed: 0 },
    },
    selectedPosition: null,
    capturePending: false,
    turnNumber: 0,
    completedPlayerTurnsWithoutCapture: 0,
    repetitionCounts: { [key]: 1 },
    result: null,
    lastMove: null,
    lastCompletedMills: [],
    startedAt: now,
    settings: merged,
    undoHistory: [],
    pendingTurnSnapshot: null,
    revision: 0,
  };
}

function getWinResult(state: GameState, playerToAct: Player): GameResult | null {
  if (state.phase === 'placement') return null;
  const winner = opponentOf(playerToAct);
  if (countPieces(state.board, playerToAct) < 3) {
    return { type: 'win', winner, loser: playerToAct, reason: 'fewer-than-three' };
  }
  if (isPlayerBlocked(state.board, playerToAct)) {
    return { type: 'win', winner, loser: playerToAct, reason: 'blocked' };
  }
  return null;
}

function completeTurn(state: GameState, undoSnapshot: GameSnapshot, captured: boolean): GameState {
  const nextPlayer = opponentOf(state.currentPlayer);
  const phase = state.players.P1.piecesToPlace === 0 && state.players.P2.piecesToPlace === 0
    ? 'movement' : 'placement';
  const withoutCapture = phase === 'movement'
    ? (captured ? 0 : state.completedPlayerTurnsWithoutCapture + 1)
    : 0;
  const key = serializeRepetitionState(state.board, nextPlayer, phase);
  const repetitions = phase === 'movement'
    ? { ...state.repetitionCounts, [key]: (state.repetitionCounts[key] ?? 0) + 1 }
    : state.repetitionCounts;
  const advanced: GameState = {
    ...state,
    currentPlayer: nextPlayer,
    phase,
    selectedPosition: null,
    capturePending: false,
    pendingTurnSnapshot: null,
    turnNumber: state.turnNumber + 1,
    completedPlayerTurnsWithoutCapture: withoutCapture,
    repetitionCounts: repetitions,
    undoHistory: [...state.undoHistory, cloneSnapshot(undoSnapshot)],
    revision: state.revision + 1,
  };
  const result = getWinResult(advanced, nextPlayer)
    ?? (phase === 'movement' ? getDrawResult(repetitions, key, withoutCapture, advanced.settings) : null);
  return result ? { ...advanced, result } : advanced;
}

function revisionMatches(state: GameState, expected?: number): boolean {
  return expected === undefined || expected === state.revision;
}

export function placePiece(state: GameState, position: PositionId, expectedRevision?: number): GameState {
  if (!revisionMatches(state, expectedRevision) || state.result || state.capturePending || state.phase !== 'placement') return state;
  if (state.board[position] !== null || state.players[state.currentPlayer].piecesToPlace <= 0) return state;
  const undoSnapshot = snapshotForUndo(state);
  const board = { ...state.board, [position]: state.currentPlayer };
  const newMills = newlyCompletedMills(state.board, board, state.currentPlayer);
  const players = {
    ...state.players,
    [state.currentPlayer]: {
      ...state.players[state.currentPlayer],
      piecesToPlace: state.players[state.currentPlayer].piecesToPlace - 1,
      millsFormed: state.players[state.currentPlayer].millsFormed + newMills.length,
    },
  };
  const changed: GameState = {
    ...state, board, players,
    lastMove: { from: null, to: position },
    lastCompletedMills: newMills.map(millId),
    revision: state.revision + 1,
  };
  if (newMills.length > 0) return { ...changed, capturePending: true, pendingTurnSnapshot: undoSnapshot };
  return completeTurn(changed, undoSnapshot, false);
}

export function selectPiece(state: GameState, position: PositionId): GameState {
  if (state.result || state.capturePending || state.phase !== 'movement' || state.board[position] !== state.currentPlayer) return state;
  if (state.selectedPosition === position) return state;
  return { ...state, selectedPosition: position, revision: state.revision + 1 };
}

export function movePiece(state: GameState, to: PositionId, expectedRevision?: number): GameState {
  if (!revisionMatches(state, expectedRevision) || state.result || state.capturePending || state.phase !== 'movement') return state;
  const from = state.selectedPosition;
  if (!from || !getLegalDestinations(state.board, state.currentPlayer, from).includes(to)) return state;
  const undoSnapshot = snapshotForUndo(state);
  const board = { ...state.board, [from]: null, [to]: state.currentPlayer };
  const newMills = newlyCompletedMills(state.board, board, state.currentPlayer);
  const changed: GameState = {
    ...state,
    board,
    selectedPosition: null,
    lastMove: { from, to },
    lastCompletedMills: newMills.map(millId),
    players: newMills.length ? {
      ...state.players,
      [state.currentPlayer]: {
        ...state.players[state.currentPlayer],
        millsFormed: state.players[state.currentPlayer].millsFormed + newMills.length,
      },
    } : state.players,
    revision: state.revision + 1,
  };
  if (newMills.length > 0) return { ...changed, capturePending: true, pendingTurnSnapshot: undoSnapshot };
  return completeTurn(changed, undoSnapshot, false);
}

export function capturePiece(state: GameState, position: PositionId, expectedRevision?: number): GameState {
  if (!revisionMatches(state, expectedRevision) || state.result || !state.capturePending || !state.pendingTurnSnapshot) return state;
  if (!canCapturePiece(state.board, state.currentPlayer, position)) return state;
  const victim = opponentOf(state.currentPlayer);
  const changed: GameState = {
    ...state,
    board: { ...state.board, [position]: null },
    players: {
      ...state.players,
      [state.currentPlayer]: {
        ...state.players[state.currentPlayer],
        piecesCaptured: state.players[state.currentPlayer].piecesCaptured + 1,
      },
    },
    revision: state.revision + 1,
  };
  void victim;
  return completeTurn(changed, state.pendingTurnSnapshot, true);
}

export function undoTurn(state: GameState): GameState {
  if (state.capturePending || state.undoHistory.length === 0) return state;
  const previous = state.undoHistory[state.undoHistory.length - 1];
  return {
    ...state,
    ...cloneSnapshot(previous),
    settings: state.settings,
    undoHistory: state.undoHistory.slice(0, -1),
    pendingTurnSnapshot: null,
    revision: state.revision + 1,
  };
}
