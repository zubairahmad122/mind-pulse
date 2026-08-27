import { addDaysISO, daysBetween, getLocalDateISO, getMondayISO } from '../dateUtils';

describe('getLocalDateISO', () => {
  const ORIGINAL_TZ = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'Asia/Karachi'; // UTC+5, no DST — matches the bug report
  });
  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  it('reads the local calendar day, not the UTC day', () => {
    // 2026-07-24 22:30 local (UTC+5) is still 2026-07-24 17:30 UTC — sanity check.
    expect(getLocalDateISO(new Date(2026, 6, 24, 22, 30))).toBe('2026-07-24');
  });

  it('rolls over exactly at local midnight, independent of the UTC day', () => {
    const beforeMidnight = new Date(2026, 6, 24, 23, 59);
    expect(getLocalDateISO(beforeMidnight)).toBe('2026-07-24');

    const afterMidnight = new Date(2026, 6, 25, 0, 1);
    expect(getLocalDateISO(afterMidnight)).toBe('2026-07-25');

    // The bug this replaces: UTC-slicing reports the previous day for the
    // first ~5 hours of every new local day in a UTC+5 timezone.
    expect(afterMidnight.toISOString().slice(0, 10)).toBe('2026-07-24');
  });
});

describe('addDaysISO', () => {
  it('adds days within a month', () => {
    expect(addDaysISO('2026-07-24', 3)).toBe('2026-07-27');
  });

  it('rolls over a month boundary', () => {
    expect(addDaysISO('2026-07-30', 3)).toBe('2026-08-02');
  });

  it('rolls over a year boundary', () => {
    expect(addDaysISO('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('subtracts days for a negative offset', () => {
    expect(addDaysISO('2026-08-02', -3)).toBe('2026-07-30');
  });
});

describe('getMondayISO', () => {
  it('returns the same date when today is already Monday', () => {
    expect(getMondayISO(new Date(2026, 6, 20, 10, 0))).toBe('2026-07-20');
  });

  it("returns this week's Monday for a mid-week date", () => {
    expect(getMondayISO(new Date(2026, 6, 23, 10, 0))).toBe('2026-07-20'); // Thursday
  });

  it('treats Sunday as the last day of the same week (not a new week)', () => {
    expect(getMondayISO(new Date(2026, 6, 26, 10, 0))).toBe('2026-07-20'); // Sunday
  });

  it('rolls the Monday back across a month boundary', () => {
    expect(getMondayISO(new Date(2026, 7, 2, 10, 0))).toBe('2026-07-27'); // Sunday Aug 2
  });
});

describe('daysBetween', () => {
  it('counts whole days regardless of timezone', () => {
    expect(daysBetween('2026-07-30', '2026-08-02')).toBe(3);
    expect(daysBetween('2026-07-24', '2026-07-24')).toBe(0);
  });
});
