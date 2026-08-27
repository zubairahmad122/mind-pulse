import { summarizeScreenHabits } from '@/utils/eyeScreenHabits';

describe('screen habit summary', () => {
  it('summarizes recent manually reported screen sessions', () => {
    expect(summarizeScreenHabits([
      { recordedAt: 200, context: 'work', continuousMinutes: 60 },
      { recordedAt: 300, context: 'work', continuousMinutes: 40 },
      { recordedAt: 50, context: 'gaming', continuousMinutes: 90 },
    ], 100)).toEqual({
      checkIns: 2,
      longestMinutes: 60,
      averageMinutes: 50,
      mostFrequentContext: 'work',
    });
  });
});
