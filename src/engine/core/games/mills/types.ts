export const POSITION_IDS = [
  'a7','d7','g7','b6','d6','f6','c5','d5','e5','a4','b4','c4',
  'e4','f4','g4','c3','d3','e3','b2','d2','f2','a1','d1','g1',
] as const;

export type PositionId = (typeof POSITION_IDS)[number];
export type Player = 'P1' | 'P2';
export type Board = Record<PositionId, Player | null>;
export type GamePhase = 'placement' | 'movement';
export type DrawReason = 'threefold-repetition' | 'no-capture-limit';
export type WinReason = 'fewer-than-three' | 'blocked';
export type GameResult =
  | { type: 'win'; winner: Player; loser: Player; reason: WinReason }
  | { type: 'draw'; reason: DrawReason };

export interface MillsSettings {
  playerNames: Record<Player, string>;
  startingPlayer: Player;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  hintsEnabled: boolean;
  pieceTheme: 'classic' | 'slate';
  noCaptureDrawEnabled: boolean;
  noCaptureFullTurnLimit: number;
}

export interface PlayerState {
  piecesToPlace: number;
  piecesCaptured: number;
  millsFormed: number;
}

export interface GameSnapshot {
  board: Board;
  currentPlayer: Player;
  phase: GamePhase;
  players: Record<Player, PlayerState>;
  selectedPosition: PositionId | null;
  capturePending: boolean;
  turnNumber: number;
  completedPlayerTurnsWithoutCapture: number;
  repetitionCounts: Record<string, number>;
  result: GameResult | null;
  lastMove: { from: PositionId | null; to: PositionId } | null;
  lastCompletedMills: readonly string[];
  startedAt: number;
}

export interface GameState extends GameSnapshot {
  settings: MillsSettings;
  undoHistory: readonly GameSnapshot[];
  pendingTurnSnapshot: GameSnapshot | null;
  revision: number;
}

export interface LegalMove { from: PositionId; to: PositionId }

export type GameAction =
  | { type: 'PLACE'; position: PositionId; expectedRevision?: number }
  | { type: 'SELECT'; position: PositionId }
  | { type: 'MOVE'; to: PositionId; expectedRevision?: number }
  | { type: 'CAPTURE'; position: PositionId; expectedRevision?: number }
  | { type: 'UNDO' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<MillsSettings> }
  | { type: 'RESTORE'; state: GameState }
  | { type: 'RESTART'; startingPlayer?: Player; now?: number };
