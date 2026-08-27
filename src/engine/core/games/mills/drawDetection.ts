import type { Board, GamePhase, GameResult, MillsSettings, Player } from './types';
import { POSITION_IDS } from './types';

export function serializeRepetitionState(board: Board, currentPlayer: Player, phase: GamePhase): string {
  return `${phase}|${currentPlayer}|${POSITION_IDS.map(id => board[id] ?? '-').join('')}`;
}

export function getDrawResult(
  repetitionCounts: Readonly<Record<string, number>>,
  stateKey: string,
  completedPlayerTurnsWithoutCapture: number,
  settings: MillsSettings,
): GameResult | null {
  if ((repetitionCounts[stateKey] ?? 0) >= 3) return { type: 'draw', reason: 'threefold-repetition' };
  if (
    settings.noCaptureDrawEnabled &&
    completedPlayerTurnsWithoutCapture >= settings.noCaptureFullTurnLimit * 2
  ) return { type: 'draw', reason: 'no-capture-limit' };
  return null;
}

