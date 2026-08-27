import { getInsightMessage } from '@/utils/scoring';

describe('getInsightMessage — Eyes focus area', () => {
  it('does not reference the removed Comet Trace activity', () => {
    expect(getInsightMessage('Eyes', 100, 12)).not.toMatch(/Comet Trace/i);
    expect(getInsightMessage('Eyes', 100, 12)).not.toMatch(/comet-trace/i);
  });

  it('points a healthy Eyes score at the Eye Reset activity', () => {
    expect(getInsightMessage('Eyes', 100, 12)).toMatch(/Eye Reset/);
  });

  it('still offers recovery guidance for low Eyes scores', () => {
    expect(getInsightMessage('Eyes', 10, 9)).toMatch(/Eye Reset Protocol/);
    expect(getInsightMessage('Eyes', 40, 14)).toMatch(/breaks/);
  });
});
