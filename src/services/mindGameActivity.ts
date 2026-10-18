import { recordActivity } from '@/stores/useActivityStore';
import type { ActivityEvent, ActivityMetadata, ActivitySource } from '@/types/activity.types';

type MindGameSource = Extract<ActivitySource, 'pattern-shift' | 'time-flow' | 'math-gap' | 'schulte-nexus' | 'mills'>;

/**
 * Records one finished Mind game in the unified activity log. Call only from a
 * game's existing end-of-session handler, after its own progress save (XP,
 * level, personal best) has accepted the session. `sessionId` is the game's
 * own session/match id, so the same session can never be logged twice.
 */
export function recordMindGameActivity(
  uid: string | null | undefined,
  game: MindGameSource,
  sessionId: string,
  startedAt: string | number,
  completedAt: string | number,
  score?: number,
  metadata?: ActivityMetadata,
): Promise<ActivityEvent | null> {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const timestamp = Number.isFinite(end) ? end : Date.now();
  const durationSeconds = Number.isFinite(start) && timestamp >= start ? (timestamp - start) / 1000 : 0;
  return recordActivity(uid, {
    id: `mind-${game}-${sessionId}`,
    type: 'MIND_GAME_COMPLETED',
    source: game,
    timestamp,
    durationSeconds,
    ...(typeof score === 'number' && Number.isFinite(score) ? { score } : {}),
    metadata: { game, ...metadata },
  });
}
