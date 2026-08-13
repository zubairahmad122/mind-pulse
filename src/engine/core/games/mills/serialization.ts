import { isPositionId } from './boardConfig';
import { createInitialGame } from './gameEngine';
import { POSITION_IDS, type GameSnapshot, type GameState, type Player } from './types';

export const MILLS_SCHEMA_VERSION = 1;
interface Envelope { schemaVersion: number; savedAt: number; state: GameState }

const isPlayer = (value: unknown): value is Player => value === 'P1' || value === 'P2';

function isSnapshot(value: unknown): value is GameSnapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<GameSnapshot>;
  if (!s.board || typeof s.board !== 'object' || !POSITION_IDS.every(id => isPlayer(s.board?.[id]) || s.board?.[id] === null)) return false;
  return isPlayer(s.currentPlayer)
    && (s.phase === 'placement' || s.phase === 'movement')
    && !!s.players && typeof s.players === 'object'
    && isPlayerState(s.players.P1) && isPlayerState(s.players.P2)
    && (s.selectedPosition === null || isPositionId(s.selectedPosition))
    && typeof s.capturePending === 'boolean'
    && Number.isInteger(s.turnNumber) && (s.turnNumber ?? -1) >= 0
    && Number.isInteger(s.completedPlayerTurnsWithoutCapture)
    && !!s.repetitionCounts && typeof s.repetitionCounts === 'object'
    && Object.values(s.repetitionCounts).every(n => Number.isInteger(n) && n > 0)
    && typeof s.startedAt === 'number'
    && Array.isArray(s.lastCompletedMills);
}

function isPlayerState(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return ['piecesToPlace','piecesCaptured','millsFormed'].every(k => Number.isInteger(p[k]) && (p[k] as number) >= 0);
}

function isGameState(value: unknown): value is GameState {
  if (!isSnapshot(value)) return false;
  const s = value as Partial<GameState>;
  const settings = s.settings;
  return !!settings
    && isPlayer(settings.startingPlayer)
    && typeof settings.playerNames?.P1 === 'string'
    && typeof settings.playerNames?.P2 === 'string'
    && typeof settings.soundEnabled === 'boolean'
    && typeof settings.hapticsEnabled === 'boolean'
    && typeof settings.hintsEnabled === 'boolean'
    && (settings.pieceTheme === 'classic' || settings.pieceTheme === 'slate')
    && typeof settings.noCaptureDrawEnabled === 'boolean'
    && Number.isInteger(settings.noCaptureFullTurnLimit) && settings.noCaptureFullTurnLimit > 0
    && Array.isArray(s.undoHistory) && s.undoHistory.every(isSnapshot)
    && (s.pendingTurnSnapshot === null || isSnapshot(s.pendingTurnSnapshot))
    && Number.isInteger(s.revision) && (s.revision ?? -1) >= 0
    && (!s.capturePending || s.pendingTurnSnapshot !== null);
}

export function serializeGameState(state: GameState, savedAt = Date.now()): string {
  return JSON.stringify({ schemaVersion: MILLS_SCHEMA_VERSION, savedAt, state } satisfies Envelope);
}

export function deserializeGameState(raw: string | null | undefined, now = Date.now()): GameState {
  if (!raw) return createInitialGame({}, now);
  try {
    const envelope = JSON.parse(raw) as Partial<Envelope>;
    if (envelope.schemaVersion !== MILLS_SCHEMA_VERSION || typeof envelope.savedAt !== 'number' || !isGameState(envelope.state)) {
      return createInitialGame({}, now);
    }
    return envelope.state;
  } catch {
    return createInitialGame({}, now);
  }
}
