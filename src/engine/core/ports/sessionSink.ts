import type { MetricsSnapshot } from '../metrics/metricsRecorder';
import type { EndReason } from '../types';

/**
 * Where a finished session goes — an interface, so `core/` never imports
 * Firestore or AsyncStorage and a test can assert on what *would* have been
 * saved without touching either.
 */
export interface SessionResult {
  /** Client-generated, created once when the session ends. The dedupe key. */
  sessionResultId: string;
  gameId: string;
  score: number;
  starRating: 1 | 2 | 3;
  metrics: MetricsSnapshot;
  endReason: EndReason;
  /** The seed the session ran under — makes a reported run reproducible. */
  seed: number;
  endedAt: number;
}

export type SaveStatus = 'saved' | 'duplicate' | 'failed';

export interface SaveOutcome {
  status: SaveStatus;
  isNewRecord: boolean;
}

export interface SessionSink {
  save(result: SessionResult): Promise<SaveOutcome>;
}

/** Records calls instead of persisting — used by engine tests and by the
 *  benchmark screen, which must never write a real score. */
export function createMemorySessionSink(): SessionSink & { readonly saved: SessionResult[] } {
  const saved: SessionResult[] = [];
  const seen = new Set<string>();
  return {
    saved,
    async save(result) {
      if (seen.has(result.sessionResultId)) {
        return { status: 'duplicate', isNewRecord: false };
      }
      seen.add(result.sessionResultId);
      saved.push(result);
      return { status: 'saved', isNewRecord: true };
    },
  };
}
