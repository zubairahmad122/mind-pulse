import { getComfortChange, summarizeEyeComfort } from '@/utils/eyeComfort';

describe('getComfortChange', () => {
  it('reports improvement when discomfort decreases', () => {
    expect(getComfortChange({ before: 4, after: 2 })).toBe('better');
  });

  it('reports worsening when discomfort increases', () => {
    expect(getComfortChange({ before: 2, after: 4 })).toBe('worse');
  });

  it('reports no change for equal ratings', () => {
    expect(getComfortChange({ before: 3, after: 3 })).toBe('same');
  });

  it('does not infer an outcome from a skipped check-in', () => {
    expect(getComfortChange({ before: null, after: 2 })).toBe('unknown');
  });
});

describe('summarizeEyeComfort', () => {
  const now = new Date('2026-07-26T12:00:00Z').getTime();

  it('summarizes only recent comparable check-ins', () => {
    const summary = summarizeEyeComfort([
      { completedAt: now, before: 4, after: 2 },
      { completedAt: now - 1000, before: 2, after: 2 },
      { completedAt: now - 2000, before: 2, after: 3 },
      { completedAt: now - 3000, before: null, after: 2 },
      { completedAt: now - 10_000, before: 5, after: 1 },
    ], now - 5000);

    expect(summary).toEqual({
      sessions: 4,
      comparedSessions: 3,
      improvedSessions: 1,
      sameSessions: 1,
      worsenedSessions: 1,
      averageChange: 1 / 3,
    });
  });
});
