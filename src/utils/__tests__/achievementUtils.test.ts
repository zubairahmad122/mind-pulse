import { computeHasPerfectWeek } from '../achievementUtils';

describe('computeHasPerfectWeek', () => {
  it('is false with fewer than 7 days in any week', () => {
    const log = ['2026-07-20', '2026-07-21', '2026-07-22']; // Mon-Wed only
    expect(computeHasPerfectWeek(log)).toBe(false);
  });

  it('is true when one Mon-Sun week has all 7 days', () => {
    const log = [
      '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23',
      '2026-07-24', '2026-07-25', '2026-07-26',
    ]; // Mon -> Sun
    expect(computeHasPerfectWeek(log)).toBe(true);
  });

  it('does not count 7 days spanning two different weeks as perfect', () => {
    // Thu -> Wed next week — 7 consecutive days, but split 4/3 across weeks.
    const log = [
      '2026-07-23', '2026-07-24', '2026-07-25', '2026-07-26',
      '2026-07-27', '2026-07-28', '2026-07-29',
    ];
    expect(computeHasPerfectWeek(log)).toBe(false);
  });
});
