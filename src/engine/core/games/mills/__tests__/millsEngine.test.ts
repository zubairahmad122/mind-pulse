import {
  MILL_LINES, POSITION_IDS, canCapturePiece, capturePiece, createInitialGame,
  deserializeGameState, getCompletedMills, getLegalDestinations, getLegalMoves,
  getDrawResult, isPlayerBlocked, movePiece, placePiece, selectPiece,
  getCapturablePieces, getVisibleLegalDestinations, serializeGameState, serializeRepetitionState, undoTurn,
  type Board, type GameState, type Player, type PositionId,
} from '..';
import { createEmptyBoard } from '../boardConfig';

function withBoard(entries: Partial<Record<PositionId, Player>>, currentPlayer: Player = 'P1'): GameState {
  const state = createInitialGame({ startingPlayer: currentPlayer }, 100);
  const board: Board = { ...createEmptyBoard(), ...entries };
  return {
    ...state, board, currentPlayer, phase: 'movement',
    players: {
      P1: { ...state.players.P1, piecesToPlace: 0 },
      P2: { ...state.players.P2, piecesToPlace: 0 },
    },
    repetitionCounts: {},
  };
}

describe('Mills engine', () => {
  test('creates the complete empty initial state', () => {
    const state = createInitialGame({}, 42);
    expect(POSITION_IDS).toHaveLength(24);
    expect(Object.values(state.board).every(v => v === null)).toBe(true);
    expect(state.players.P1.piecesToPlace).toBe(9);
    expect(state.players.P2.piecesToPlace).toBe(9);
    expect(state.currentPlayer).toBe('P1');
    expect(state.startedAt).toBe(42);
  });

  test('alternates valid placements and rejects occupied placement', () => {
    const first = placePiece(createInitialGame(), 'a7');
    expect(first.board.a7).toBe('P1');
    expect(first.currentPlayer).toBe('P2');
    const illegal = placePiece(first, 'a7');
    expect(illegal).toBe(first);
    expect(placePiece(first, 'd7').currentPlayer).toBe('P1');
  });

  test('pieces cannot be selected or moved during standard placement', () => {
    const placed = placePiece(createInitialGame(), 'a7');
    expect(selectPiece(placed, 'a7')).toBe(placed);
    expect(movePiece({ ...placed, selectedPosition:'a7' }, 'd7')).toEqual({ ...placed, selectedPosition:'a7' });
  });

  test.each(MILL_LINES)('recognizes valid mill %s and no false mill', (...line) => {
    const [a,b,c] = line as PositionId[];
    const board = { ...createEmptyBoard(), [a]:'P1', [b]:'P1', [c]:'P1' } as Board;
    expect(getCompletedMills(board, 'P1').some(found => found.join() === line.join())).toBe(true);
    board[c] = 'P2';
    expect(getCompletedMills(board, 'P1').some(found => found.join() === line.join())).toBe(false);
  });

  test('forming a mill enters capture mode without advancing the turn', () => {
    let state = createInitialGame();
    state = placePiece(state, 'a7'); state = placePiece(state, 'b6');
    state = placePiece(state, 'd7'); state = placePiece(state, 'd6');
    state = placePiece(state, 'g7');
    expect(state.capturePending).toBe(true);
    expect(state.currentPlayer).toBe('P1');
    expect(state.undoHistory).toHaveLength(4);
    expect(getVisibleLegalDestinations(state)).toEqual([]);
    expect(getCapturablePieces(state)).toEqual(expect.arrayContaining(['b6','d6']));
  });

  test('requires capture outside a mill unless all opponent pieces are in mills', () => {
    const board = withBoard({ a7:'P2',d7:'P2',g7:'P2',b6:'P2' }).board;
    expect(canCapturePiece(board, 'P1', 'a7')).toBe(false);
    expect(canCapturePiece(board, 'P1', 'b6')).toBe(true);
    board.b6 = null;
    expect(canCapturePiece(board, 'P1', 'a7')).toBe(true);
  });

  test('capture completes one turn and duplicate capture is rejected', () => {
    const base = withBoard({ a7:'P1',d7:'P1',g7:'P1',b6:'P2',d6:'P2',f6:'P2' });
    const pending = { ...base, capturePending:true, pendingTurnSnapshot: { ...base, undoHistory: undefined, settings: undefined, pendingTurnSnapshot: undefined, revision: undefined } as never };
    const captured = capturePiece(pending, 'b6', pending.revision);
    expect(captured.board.b6).toBeNull();
    expect(captured.currentPlayer).toBe('P2');
    expect(captured.players.P1.piecesCaptured).toBe(1);
    expect(capturePiece(captured, 'd6', pending.revision)).toBe(captured);
  });

  test('captures during placement do not change either piecesToPlace count', () => {
    let state=createInitialGame();
    state=placePiece(state,'a7');state=placePiece(state,'b6');
    state=placePiece(state,'d7');state=placePiece(state,'d6');
    state=placePiece(state,'g7');
    expect(state.capturePending).toBe(true);
    const before={P1:state.players.P1.piecesToPlace,P2:state.players.P2.piecesToPlace};
    state=capturePiece(state,'b6');
    expect(state.players.P1.piecesToPlace).toBe(before.P1);
    expect(state.players.P2.piecesToPlace).toBe(before.P2);
    expect(state.players.P1.piecesToPlace).toBe(6);
    expect(state.players.P2.piecesToPlace).toBe(7);
  });

  test('transitions only after all eighteen placements, including final capture', () => {
    let state = createInitialGame();
    const sequence: PositionId[] = ['a7','b6','d7','c5','a4','d5','b4','e5','c4','c3','d3','e3','b2','d2','f2','a1','d1','g1'];
    for (const id of sequence) {
      state = placePiece(state, id);
      if (state.capturePending) {
        const target = POSITION_IDS.find(p => canCapturePiece(state.board, state.currentPlayer, p));
        if (target) state = capturePiece(state, target);
      }
    }
    expect(state.players.P1.piecesToPlace + state.players.P2.piecesToPlace).toBe(0);
    expect(state.phase).toBe('movement');
  });

  test('allows adjacent moves, rejects non-adjacent moves, and switches selection', () => {
    let state = withBoard({ a7:'P1',a4:'P1',b6:'P1',d7:'P1',g7:'P2',d6:'P2',f6:'P2',g4:'P2' });
    state = selectPiece(state, 'a7');
    expect(getLegalDestinations(state.board, 'P1', 'a7')).toEqual([]);
    const switched = selectPiece(state, 'b6');
    expect(switched.selectedPosition).toBe('b6');
    expect(movePiece(switched, 'g1')).toBe(switched);
    const moved = movePiece(switched, 'b4');
    expect(moved.board.b4).toBe('P1');
  });

  test('flies with exactly three pieces but not with more than three', () => {
    const three = withBoard({ a7:'P1',d7:'P1',a4:'P1',g7:'P2',d6:'P2',f6:'P2' });
    expect(getLegalDestinations(three.board, 'P1', 'a7')).toContain('g1');
    const four = withBoard({ a7:'P1',d7:'P1',a4:'P1',b6:'P1',g7:'P2',d6:'P2',f6:'P2' });
    expect(getLegalDestinations(four.board, 'P1', 'a7')).not.toContain('g1');
  });

  test('detects blocked players while flying players are not blocked', () => {
    const blocked = withBoard({ a7:'P1',d7:'P1',g7:'P1',b6:'P1',a4:'P2',d6:'P2',g4:'P2',b4:'P2',f6:'P2' });
    expect(isPlayerBlocked(blocked.board, 'P1')).toBe(true);
    const flying = withBoard({ a7:'P1',d7:'P1',g7:'P1',a4:'P2',d6:'P2',g4:'P2',b4:'P2' });
    expect(isPlayerBlocked(flying.board, 'P1')).toBe(false);
  });

  test('does not declare defeat during placement', () => {
    let state = placePiece(createInitialGame(), 'a7');
    state = placePiece(state, 'd7');
    expect(state.result).toBeNull();
  });

  test('undo restores the previous complete turn and never capture mode', () => {
    const initial = createInitialGame();
    const placed = placePiece(initial, 'a7');
    const undone = undoTurn(placed);
    expect(undone.board.a7).toBeNull();
    expect(undone.currentPlayer).toBe('P1');
    expect(undone.capturePending).toBe(false);
  });

  test('undo snapshots stay flat and persistence grows linearly', () => {
    let state = createInitialGame();
    const placements: PositionId[] = ['a7','d7','g7','b6','d6','f6','c5','d5'];
    for (const position of placements) {
      state = placePiece(state, position);
      if (state.capturePending) {
        const target = POSITION_IDS.find(id => canCapturePiece(state.board, state.currentPlayer, id));
        if (target) state = capturePiece(state, target);
      }
    }
    expect(state.undoHistory.length).toBeGreaterThan(0);
    for (const snapshot of state.undoHistory) {
      expect('undoHistory' in snapshot).toBe(false);
      expect('settings' in snapshot).toBe(false);
      expect('pendingTurnSnapshot' in snapshot).toBe(false);
    }
    expect(serializeGameState(state).length).toBeLessThan(50_000);
  });

  test('round-trips valid persistence and falls back for corrupt data', () => {
    const state = placePiece(createInitialGame({}, 77), 'a7');
    expect(deserializeGameState(serializeGameState(state))).toEqual(state);
    const fallback = deserializeGameState('{bad', 99);
    expect(fallback.startedAt).toBe(99);
    expect(fallback.turnNumber).toBe(0);
  });

  test('persistence safely restores an unfinished capture mode', () => {
    let state=createInitialGame();
    state=placePiece(state,'a7');state=placePiece(state,'b6');
    state=placePiece(state,'d7');state=placePiece(state,'d6');
    state=placePiece(state,'g7');
    const restored=deserializeGameState(serializeGameState(state));
    expect(restored.capturePending).toBe(true);
    expect(restored.currentPlayer).toBe('P1');
    expect(restored.pendingTurnSnapshot).not.toBeNull();
    expect(canCapturePiece(restored.board,'P1','b6')).toBe(true);
  });

  test('revision guard rejects rapid duplicate committed actions', () => {
    const state = createInitialGame();
    const committed = placePiece(state, 'a7', 0);
    expect(placePiece(committed, 'd7', 0)).toBe(committed);
  });

  test('isolates threefold repetition and configurable no-capture draws', () => {
    const state = withBoard({ a7:'P1',d7:'P1',a4:'P1',b6:'P1',g7:'P2',d6:'P2',f6:'P2',g4:'P2' });
    const key = serializeRepetitionState(state.board, state.currentPlayer, state.phase);
    expect(getDrawResult({ [key]: 3 }, key, 0, state.settings)).toEqual({ type:'draw', reason:'threefold-repetition' });
    expect(getDrawResult({}, key, 99, state.settings)).toBeNull();
    expect(getDrawResult({}, key, 100, state.settings)).toEqual({ type:'draw', reason:'no-capture-limit' });
    expect(getDrawResult({}, key, 100, { ...state.settings, noCaptureDrawEnabled:false })).toBeNull();
  });

  test('one move forming two mills still enters one capture mode', () => {
    const initial = createInitialGame();
    let state: GameState = {
      ...initial,
      board: { ...initial.board, b6:'P1', f6:'P1', d7:'P1', d5:'P1', a7:'P2', g7:'P2', a4:'P2' },
      players: { ...initial.players, P1:{ ...initial.players.P1, piecesToPlace:5 }, P2:{ ...initial.players.P2, piecesToPlace:6 } },
    };
    state = placePiece(state, 'd6');
    expect(state.capturePending).toBe(true);
    expect(state.lastCompletedMills).toHaveLength(2);
    const target = POSITION_IDS.find(id => canCapturePiece(state.board, 'P1', id));
    expect(target).toBeDefined();
    const captured = capturePiece(state, target!);
    expect(captured.players.P1.piecesCaptured).toBe(1);
    expect(captured.capturePending).toBe(false);
    const undone = undoTurn(captured);
    expect(undone.board.d6).toBeNull();
    expect(undone.board[target!]).toBe('P2');
    expect(undone.capturePending).toBe(false);
  });

  test('breaking and later reforming the same mill grants a new capture', () => {
    let state=withBoard({a7:'P1',d7:'P1',g7:'P1',b6:'P1',a4:'P2',b4:'P2',c4:'P2',f6:'P2'});
    state=selectPiece(state,'d7');
    state=movePiece(state,'d6');
    expect(state.capturePending).toBe(false);
    state=selectPiece(state,'f6');
    state=movePiece(state,'f4');
    state=selectPiece(state,'d6');
    state=movePiece(state,'d7');
    expect(state.capturePending).toBe(true);
    expect(state.lastCompletedMills).toContain('a7-d7-g7');
  });

  test('wins by reducing the opponent below three after placement', () => {
    const base = withBoard({ a7:'P1',d7:'P1',g7:'P1',b6:'P2',d6:'P2',f6:'P2' });
    const snapshot = { ...base, undoHistory: undefined, settings: undefined, pendingTurnSnapshot: undefined, revision: undefined } as never;
    const pending = { ...base, capturePending:true, pendingTurnSnapshot:snapshot };
    const won = capturePiece(pending, 'b6');
    expect(won.result).toEqual({ type:'win', winner:'P1', loser:'P2', reason:'fewer-than-three' });
  });

  test('wins by leaving the next player with no legal move', () => {
    let state = withBoard({ a7:'P2',d7:'P2',g7:'P2',b6:'P2',a4:'P1',d6:'P1',g4:'P1',b4:'P1',f6:'P1' });
    state = selectPiece(state, 'f6');
    const won = movePiece(state, 'f4');
    expect(won.result).toEqual({ type:'win', winner:'P1', loser:'P2', reason:'blocked' });
  });

  test('enumerates legal moves from topology', () => {
    const state = withBoard({ a7:'P1',d7:'P1',a4:'P1',b6:'P1',g7:'P2',d6:'P2',f6:'P2',g4:'P2' });
    expect(getLegalMoves(state.board, 'P1')).toContainEqual({ from:'b6', to:'b4' });
  });
});
