import { getEyeWeeklyRecommendation } from '@/utils/eyeWeeklyRecommendation';

const comfort = {
  sessions: 2,
  comparedSessions: 2,
  improvedSessions: 1,
  sameSessions: 1,
  worsenedSessions: 0,
  averageChange: 0.5,
};
const reminders = {
  interactions: 4,
  opened: 4,
  snoozed: 0,
  completed: 3,
  abandoned: 1,
  completionRate: 75,
};

describe('weekly eye recommendation', () => {
  it('prioritizes safety when a session felt worse', () => {
    expect(getEyeWeeklyRecommendation(
      { ...comfort, worsenedSessions: 1 },
      reminders,
    )).toContain('professional eye care');
  });

  it('recommends consistency when follow-through is low', () => {
    expect(getEyeWeeklyRecommendation(
      comfort,
      { ...reminders, completed: 1, completionRate: 25 },
    )).toContain('complete one guided break');
  });
});
