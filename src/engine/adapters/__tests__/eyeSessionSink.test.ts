import type { SessionResult } from '@/engine/core/ports/sessionSink';
import { createEyeSessionSink } from '../eyeSessionSink';
import type { DuplicateGuard } from '../persistentDuplicateGuard';

// The sink only needs `submitGameScore` and the default guard as fallbacks;
// every test injects its own. Mocking both keeps Firebase and AsyncStorage's
// native modules out of a pure unit test.
jest.mock('@/services/gameRecords', () => ({
  submitGameScore: jest.fn().mockResolvedValue(false),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function result(id: string, score = 1000): SessionResult {
  return {
    sessionResultId: id,
    gameId: 'signal-ops',
    score,
    starRating: 3,
    endReason: 'completed',
    seed: 1,
    endedAt: 1_700_000_000_000,
    metrics: {
      score, combo: 0, bestCombo: 4, hits: 10, misses: 1, accuracy01: 0.9,
      avgReactionMs: 320, bestReactionMs: 180, durationMs: 120_000, stages: [],
    },
  };
}

/** In-memory stand-in with the same claim/release semantics. */
function fakeGuard(): DuplicateGuard {
  const seen = new Set<string>();
  return {
    async claim(id) {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    },
    async release(id) {
      seen.delete(id);
    },
  };
}

describe('createEyeSessionSink', () => {
  it('saves a new session and reports a personal best', async () => {
    const submit = jest.fn().mockResolvedValue(true);
    const sink = createEyeSessionSink({ uid: 'u1', guard: fakeGuard(), submit });
    await expect(sink.save(result('s1'))).resolves.toEqual({ status: 'saved', isNewRecord: true });
    expect(submit).toHaveBeenCalledWith('u1', 'signal-ops', 1000);
  });

  it('rejects a repeated save of the same session id', async () => {
    const submit = jest.fn().mockResolvedValue(true);
    const sink = createEyeSessionSink({ uid: 'u1', guard: fakeGuard(), submit });
    await sink.save(result('s1'));
    await expect(sink.save(result('s1'))).resolves.toEqual({
      status: 'duplicate',
      isNewRecord: false,
    });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('rejects a concurrent double-fire, not just a sequential one', async () => {
    const submit = jest.fn().mockResolvedValue(true);
    const sink = createEyeSessionSink({ uid: 'u1', guard: fakeGuard(), submit });
    // The real failure mode: two completion callbacks in the same tick.
    const [a, b] = await Promise.all([sink.save(result('s1')), sink.save(result('s1'))]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual(['duplicate', 'saved']);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('still saves distinct sessions', async () => {
    const submit = jest.fn().mockResolvedValue(false);
    const sink = createEyeSessionSink({ uid: 'u1', guard: fakeGuard(), submit });
    await sink.save(result('s1'));
    await expect(sink.save(result('s2'))).resolves.toEqual({
      status: 'saved',
      isNewRecord: false,
    });
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('releases the claim when the write fails so a retry can succeed', async () => {
    const submit = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(true);
    const sink = createEyeSessionSink({ uid: 'u1', guard: fakeGuard(), submit });

    await expect(sink.save(result('s1'))).resolves.toEqual({
      status: 'failed',
      isNewRecord: false,
    });
    // Same id retried after a genuine failure must be allowed through.
    await expect(sink.save(result('s1'))).resolves.toEqual({
      status: 'saved',
      isNewRecord: true,
    });
  });

  it('works for a signed-out user', async () => {
    const submit = jest.fn().mockResolvedValue(true);
    const sink = createEyeSessionSink({ uid: undefined, guard: fakeGuard(), submit });
    await sink.save(result('s1'));
    expect(submit).toHaveBeenCalledWith(undefined, 'signal-ops', 1000);
  });
});
