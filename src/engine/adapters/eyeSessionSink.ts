import type { SaveOutcome, SessionResult, SessionSink } from '../core/ports/sessionSink';
import { submitGameScore, type GameId } from '@/services/gameRecords';
import { createPersistentDuplicateGuard, type DuplicateGuard } from './persistentDuplicateGuard';

export interface EyeSessionSinkOptions {
  uid: string | undefined;
  /** Injectable for tests; defaults to the AsyncStorage-backed guard. */
  guard?: DuplicateGuard;
  /** Injectable for tests; defaults to the real records service. */
  submit?: (uid: string | undefined, gameId: GameId, score: number) => Promise<boolean>;
}

/**
 * Bridges the engine's `SessionSink` port to MindPulse's existing personal
 * best storage (`services/gameRecords`), adding the duplicate protection
 * that path never had.
 *
 * The ordering matters: **claim first, write second.** Claiming before the
 * write means a crash mid-write leaves the id claimed and the score
 * unwritten — losing one session. Writing first and claiming after means a
 * crash leaves the score written and unclaimed — recording the same session
 * twice and inflating a personal best. Losing a session is recoverable by
 * playing again; a corrupted best is not, so the claim goes first, and a
 * failed write explicitly releases the claim to allow a retry.
 */
export function createEyeSessionSink(options: EyeSessionSinkOptions): SessionSink {
  const guard = options.guard ?? createPersistentDuplicateGuard();
  const submit = options.submit ?? submitGameScore;
  const { uid } = options;

  return {
    async save(result: SessionResult): Promise<SaveOutcome> {
      const claimed = await guard.claim(result.sessionResultId);
      if (!claimed) return { status: 'duplicate', isNewRecord: false };

      try {
        const isNewRecord = await submit(uid, result.gameId as GameId, result.score);
        return { status: 'saved', isNewRecord };
      } catch {
        await guard.release(result.sessionResultId);
        return { status: 'failed', isNewRecord: false };
      }
    },
  };
}
