import { summarizeEyeBreakReminderEvents } from '@/utils/eyeBreakReminderStats';

describe('summarizeEyeBreakReminderEvents', () => {
  it('calculates seven-day reminder follow-through', () => {
    const now = 10_000;
    const summary = summarizeEyeBreakReminderEvents([
      { type: 'opened', occurredAt: now },
      { type: 'completed', occurredAt: now },
      { type: 'opened', occurredAt: now - 1 },
      { type: 'abandoned', occurredAt: now - 1 },
      { type: 'snoozed', occurredAt: now - 2 },
      { type: 'opened', occurredAt: now - 100 },
    ], now - 5);

    expect(summary).toEqual({
      interactions: 3,
      opened: 2,
      snoozed: 1,
      completed: 1,
      abandoned: 1,
      completionRate: 50,
    });
  });
});
