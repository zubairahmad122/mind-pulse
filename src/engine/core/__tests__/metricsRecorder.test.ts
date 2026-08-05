import { createMetricsRecorder, starRating, type ScoreRules } from '../metrics/metricsRecorder';

const rules: ScoreRules = {
  pointsForHit: (reactionMs, comboBefore) =>
    (100 + Math.max(0, 500 - reactionMs) / 10) * (1 + comboBefore * 0.1),
  penaltyForMiss: () => 50,
  comboMultiplier: combo => 1 + combo * 0.1,
};

describe('createMetricsRecorder', () => {
  it('awards points and grows the combo', () => {
    const m = createMetricsRecorder(rules);
    const first = m.hit(200);
    const second = m.hit(200);
    expect(second).toBeGreaterThan(first);
    expect(m.snapshot().combo).toBe(2);
  });

  it('breaks the combo on a miss by default', () => {
    const m = createMetricsRecorder(rules);
    m.hit(200);
    m.hit(200);
    m.miss('timeout');
    expect(m.snapshot().combo).toBe(0);
    expect(m.snapshot().bestCombo).toBe(2);
  });

  it('honours a miss tolerance when the game asks for one', () => {
    const m = createMetricsRecorder({ ...rules, missesToBreakCombo: 1 });
    m.hit(200);
    m.hit(200);
    m.miss('decoy');
    expect(m.snapshot().combo).toBe(2);
    m.miss('decoy');
    expect(m.snapshot().combo).toBe(0);
  });

  it('never lets the score go negative', () => {
    const m = createMetricsRecorder(rules);
    for (let i = 0; i < 10; i++) m.miss('wrong-target');
    expect(m.snapshot().score).toBe(0);
  });

  it('computes accuracy, average and best reaction', () => {
    const m = createMetricsRecorder(rules);
    m.hit(300);
    m.hit(100);
    m.miss('timeout');
    const s = m.snapshot();
    expect(s.hits).toBe(2);
    expect(s.misses).toBe(1);
    expect(s.accuracy01).toBeCloseTo(2 / 3);
    expect(s.avgReactionMs).toBe(200);
    expect(s.bestReactionMs).toBe(100);
  });

  it('reports zeroed reaction stats before any hit', () => {
    const m = createMetricsRecorder(rules);
    const s = m.snapshot();
    expect(s.avgReactionMs).toBe(0);
    expect(s.bestReactionMs).toBe(0);
    expect(s.accuracy01).toBe(0);
  });

  it('records stages with their own duration and tallies', () => {
    const m = createMetricsRecorder(rules);
    m.beginStage('wave-1');
    m.tick(1000);
    m.hit(150);
    m.miss('decoy');
    m.endStage('complete');
    m.tick(500);
    m.beginStage('boss');
    m.tick(2000);
    m.endStage('failed');

    const { stages } = m.snapshot();
    expect(stages).toHaveLength(2);
    expect(stages[0]).toMatchObject({ id: 'wave-1', hits: 1, misses: 1, outcome: 'complete' });
    expect(stages[0].durationMs).toBe(1000);
    expect(stages[1]).toMatchObject({ id: 'boss', outcome: 'failed' });
    expect(stages[1].durationMs).toBe(2000);
  });

  it('closes an unterminated stage as failed rather than losing it', () => {
    const m = createMetricsRecorder(rules);
    m.beginStage('a');
    m.beginStage('b');
    const { stages } = m.snapshot();
    expect(stages).toHaveLength(1);
    expect(stages[0]).toMatchObject({ id: 'a', outcome: 'failed' });
  });

  it('snapshots are immutable against later mutation', () => {
    const m = createMetricsRecorder(rules);
    m.beginStage('a');
    m.endStage('complete');
    const before = m.snapshot();
    m.beginStage('b');
    m.endStage('complete');
    expect(before.stages).toHaveLength(1);
  });

  it('reset clears everything', () => {
    const m = createMetricsRecorder(rules);
    m.hit(100);
    m.tick(500);
    m.reset();
    expect(m.snapshot()).toMatchObject({ score: 0, hits: 0, combo: 0, durationMs: 0 });
  });
});

describe('starRating', () => {
  const base = { score: 0, combo: 0, bestCombo: 0, hits: 0, misses: 0,
    avgReactionMs: 0, bestReactionMs: 0, durationMs: 0, stages: [] };

  it('maps accuracy onto three tiers', () => {
    expect(starRating({ ...base, accuracy01: 0.95 })).toBe(3);
    expect(starRating({ ...base, accuracy01: 0.75 })).toBe(2);
    expect(starRating({ ...base, accuracy01: 0.4 })).toBe(1);
  });
});
