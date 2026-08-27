import {
  bestFocusDay,
  buildWeeklyTrends,
  chartMaxScreenTimeMs,
  dayDetailText,
  weekDayAccessibilityLabel,
  type WeekDayTrend,
} from '../weeklyTrends';

// Fixed "now" — a Wednesday — so weekday labels and ordering are deterministic.
const NOW = new Date('2026-08-12T15:00:00');

function day(date: string, overrides: Partial<WeekDayTrend> = {}): WeekDayTrend {
  return {
    date,
    label: 'Wed',
    isToday: false,
    screenTimeMs: 0,
    focusMinutes: 0,
    offlineMinutes: 0,
    resetsCompleted: 0,
    ...overrides,
  };
}

describe('buildWeeklyTrends', () => {
  it('produces 7 days ending on today, oldest first', () => {
    const trends = buildWeeklyTrends({ hasPermission: true, days: [] }, [], NOW, 7);
    expect(trends.days).toHaveLength(7);
    expect(trends.days[6].date).toBe('2026-08-12');
    expect(trends.days[6].isToday).toBe(true);
    expect(trends.days[0].date).toBe('2026-08-06');
    expect(trends.days[0].isToday).toBe(false);
  });

  it('merges screen-time history and local daily aggregates by date key, not by index', () => {
    const trends = buildWeeklyTrends(
      {
        hasPermission: true,
        days: [
          { date: '2026-08-12', screenTimeMs: 7_200_000 },
          { date: '2026-08-11', screenTimeMs: 3_600_000 },
        ],
      },
      [
        { date: '2026-08-12', focusMinutes: 25, offlineMinutes: 0, resetsCompleted: 1 },
        { date: '2026-08-10', focusMinutes: 10, offlineMinutes: 5, resetsCompleted: 0 },
      ],
      NOW,
      7,
    );
    const aug12 = trends.days.find(d => d.date === '2026-08-12')!;
    expect(aug12.screenTimeMs).toBe(7_200_000);
    expect(aug12.focusMinutes).toBe(25);
    expect(aug12.resetsCompleted).toBe(1);

    const aug10 = trends.days.find(d => d.date === '2026-08-10')!;
    expect(aug10.screenTimeMs).toBeNull(); // no screen-time entry for this date
    expect(aug10.focusMinutes).toBe(10);
    expect(aug10.offlineMinutes).toBe(5);
  });

  it('defaults missing days to zero aggregates and null (unavailable) screen time', () => {
    const trends = buildWeeklyTrends({ hasPermission: true, days: [] }, [], NOW, 7);
    for (const d of trends.days) {
      expect(d.screenTimeMs).toBeNull();
      expect(d).toMatchObject({ focusMinutes: 0, offlineMinutes: 0, resetsCompleted: 0 });
    }
  });

  it('sums totals across the week, excluding null (unavailable) screen-time days', () => {
    const trends = buildWeeklyTrends(
      {
        hasPermission: true,
        days: [
          { date: '2026-08-12', screenTimeMs: 3_600_000 },
          { date: '2026-08-11', screenTimeMs: null },
        ],
      },
      [
        { date: '2026-08-12', focusMinutes: 10, offlineMinutes: 5, resetsCompleted: 1 },
        { date: '2026-08-11', focusMinutes: 20, offlineMinutes: 0, resetsCompleted: 2 },
      ],
      NOW,
      7,
    );
    expect(trends.totals).toEqual({
      screenTimeMs: 3_600_000, // the null day contributes 0, not an error
      focusMinutes: 30,
      offlineMinutes: 5,
      resetsCompleted: 3,
    });
  });

  it('propagates hasScreenTimePermission from the native history response', () => {
    const trends = buildWeeklyTrends({ hasPermission: false, days: [] }, [], NOW, 7);
    expect(trends.hasScreenTimePermission).toBe(false);
  });
});

describe('chartMaxScreenTimeMs', () => {
  it('returns the highest non-null screen time in the week', () => {
    const days = [day('a', { screenTimeMs: 1_000 }), day('b', { screenTimeMs: 5_000 }), day('c', { screenTimeMs: null })];
    expect(chartMaxScreenTimeMs(days)).toBe(5_000);
  });

  it('returns null (not zero/NaN) when every day is zero or unavailable', () => {
    const days = [day('a', { screenTimeMs: 0 }), day('b', { screenTimeMs: null })];
    expect(chartMaxScreenTimeMs(days)).toBeNull();
  });

  it('returns null for an empty week rather than throwing', () => {
    expect(chartMaxScreenTimeMs([])).toBeNull();
  });
});

describe('bestFocusDay', () => {
  it('picks the day with the most focus minutes', () => {
    const days = [day('a', { focusMinutes: 10 }), day('b', { focusMinutes: 45 }), day('c', { focusMinutes: 20 })];
    expect(bestFocusDay(days)?.date).toBe('b');
  });

  it('returns null when no day has any focus minutes', () => {
    const days = [day('a', { focusMinutes: 0 }), day('b', { focusMinutes: 0 })];
    expect(bestFocusDay(days)).toBeNull();
  });
});

describe('weekDayAccessibilityLabel', () => {
  it('reads the full spoken duration for a real screen-time day', () => {
    const label = weekDayAccessibilityLabel(day('2026-08-11', { screenTimeMs: 8_040_000 })); // 2h14m
    expect(label).toBe('Tuesday, 2 hours 14 minutes screen time');
  });

  it('reads "unavailable" for a null day, not a fabricated duration', () => {
    const label = weekDayAccessibilityLabel(day('2026-08-11', { screenTimeMs: null }));
    expect(label).toBe('Tuesday, screen time unavailable');
  });

  it('reads "no screen time" for a genuine zero day', () => {
    const label = weekDayAccessibilityLabel(day('2026-08-11', { screenTimeMs: 0 }));
    expect(label).toBe('Tuesday, no screen time');
  });

  it("uses 'Today' instead of the weekday name when isToday is set", () => {
    const label = weekDayAccessibilityLabel(day('2026-08-12', { isToday: true, screenTimeMs: 60_000 }));
    expect(label).toContain('Today,');
  });
});

describe('dayDetailText', () => {
  it('omits zero-valued metrics', () => {
    const text = dayDetailText(day('a', { screenTimeMs: 8_040_000, focusMinutes: 0, offlineMinutes: 0, resetsCompleted: 0 }));
    expect(text).toBe('2h 14m screen');
  });

  it('includes every non-zero metric, in order', () => {
    const text = dayDetailText(
      day('a', { screenTimeMs: 6_480_000, focusMinutes: 25, offlineMinutes: 15, resetsCompleted: 1 }),
    );
    expect(text).toBe('1h 48m screen · 25m focus · 15m offline · 1 reset');
  });

  it('pluralizes "resets" correctly', () => {
    expect(dayDetailText(day('a', { resetsCompleted: 1 }))).toContain('1 reset');
    expect(dayDetailText(day('a', { resetsCompleted: 3 }))).toContain('3 resets');
  });

  it('reads "Screen time unavailable" instead of a fabricated duration', () => {
    expect(dayDetailText(day('a', { screenTimeMs: null }))).toContain('Screen time unavailable');
  });
});
