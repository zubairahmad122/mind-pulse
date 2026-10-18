/* eslint-disable import/first, @typescript-eslint/no-require-imports -- TZ is pinned before any Date-dependent import; jest.mock factories use require. */
// Pin the app's real-world timezone (PKT, UTC+5) so local-date rules are exercised.
process.env.TZ = 'Asia/Karachi';

import type { ActivityEvent, ActivityType } from '@/types/activity.types';
import {
  activityDateKey,
  getActiveDates,
  getActivitiesInRange,
  getDailyProgress,
  getLatestActivity,
  getWeeklySummary,
  hasCompletedOnDate,
} from '../activityQueries';
import { sleepSessionDate } from '../sleepUtils';

function ev(id: string, type: ActivityType, iso: string, metadata?: ActivityEvent['metadata']): ActivityEvent {
  const timestamp = new Date(iso).getTime();
  return {
    id,
    type,
    timestamp,
    date: activityDateKey(timestamp),
    durationSeconds: 60,
    completed: true,
    source: 'pattern-shift',
    ...(metadata ? { metadata } : {}),
  };
}

describe('activityDateKey — local calendar day, never the UTC day', () => {
  test('00:30 PKT belongs to the local day even though UTC is still the previous day', () => {
    // 2026-10-08 00:30 PKT == 2026-10-07 19:30 UTC
    expect(activityDateKey(new Date('2026-10-07T19:30:00Z').getTime())).toBe('2026-10-08');
  });
  test('05:00 PKT (the reported Sleep bug case) is the local day', () => {
    expect(activityDateKey(new Date('2026-10-08T00:00:00Z').getTime())).toBe('2026-10-08');
  });
  test('23:59 PKT stays on its local day', () => {
    expect(activityDateKey(new Date('2026-10-08T18:59:00Z').getTime())).toBe('2026-10-08');
  });
});

describe('sleepSessionDate — derives the local night from startTime', () => {
  test('repairs a legacy UTC-sliced date on read', () => {
    const start = new Date('2026-10-08T00:00:00Z').getTime(); // 05:00 PKT on the 8th
    expect(sleepSessionDate({ date: '2026-10-07', startTime: start })).toBe('2026-10-08');
  });
  test('falls back to the stored date without a usable startTime', () => {
    expect(sleepSessionDate({ date: '2026-10-07', startTime: 0 })).toBe('2026-10-07');
  });
});

describe('daily progress', () => {
  const events = [
    ev('a', 'MIND_GAME_COMPLETED', '2026-10-08T04:00:00Z'),
    ev('b', 'EYE_BREAK_COMPLETED', '2026-10-08T06:00:00Z'),
    ev('c', 'MIND_GAME_COMPLETED', '2026-10-08T07:00:00Z'),
    ev('d', 'SLEEP_SESSION_COMPLETED', '2026-10-07T01:00:00Z'),
  ];

  test('counts every completion today, distinct types and pillars once, latest last', () => {
    const p = getDailyProgress(events, '2026-10-08');
    expect(p.isActive).toBe(true);
    expect(p.count).toBe(3);
    expect(p.types).toEqual(['MIND_GAME_COMPLETED', 'EYE_BREAK_COMPLETED']);
    expect(p.pillars).toEqual(['mind', 'eye']);
    expect(p.latest?.id).toBe('c');
  });

  test('a day with nothing completed is not active and has no latest', () => {
    const p = getDailyProgress(events, '2026-10-09');
    expect(p).toMatchObject({ isActive: false, count: 0, types: [], latest: null });
  });

  test.each([
    ['Mind only', 'MIND_GAME_COMPLETED'],
    ['Sleep only', 'SLEEP_SESSION_COMPLETED'],
    ['Relax only', 'RELAX_SESSION_COMPLETED'],
    ['Focus only', 'FOCUS_SESSION_COMPLETED'],
  ] as const)('%s is an active day', (_label, type) => {
    expect(getDailyProgress([ev('x', type, '2026-10-08T10:00:00Z')], '2026-10-08').isActive).toBe(true);
  });

  test('hasCompletedOnDate honours type, date and predicate', () => {
    const relax = [ev('r', 'RELAX_SESSION_COMPLETED', '2026-10-08T10:00:00Z', { sessionId: 'calm-flow' })];
    expect(hasCompletedOnDate(relax, 'RELAX_SESSION_COMPLETED', '2026-10-08')).toBe(true);
    expect(hasCompletedOnDate(relax, 'RELAX_SESSION_COMPLETED', '2026-10-07')).toBe(false);
    expect(
      hasCompletedOnDate(relax, 'RELAX_SESSION_COMPLETED', '2026-10-08', e => e.metadata?.sessionId === 'box-breathing'),
    ).toBe(false);
  });
});

describe('range, active days and week', () => {
  // 2026-10-05 is a Monday.
  const events = [
    ev('sun', 'EYE_RESET_COMPLETED', '2026-10-04T08:00:00Z'), // previous week
    ev('mon1', 'MIND_GAME_COMPLETED', '2026-10-05T08:00:00Z'),
    ev('mon2', 'RELAX_SESSION_COMPLETED', '2026-10-05T09:00:00Z'),
    ev('wed', 'SLEEP_SESSION_COMPLETED', '2026-10-07T02:00:00Z'),
  ];

  test('active dates are unique per day — many activities on one day count once', () => {
    expect(getActiveDates(events)).toEqual(['2026-10-04', '2026-10-05', '2026-10-07']);
  });

  test('inclusive date range', () => {
    expect(getActivitiesInRange(events, '2026-10-05', '2026-10-07').map(e => e.id)).toEqual(['mon1', 'mon2', 'wed']);
  });

  test('weekly summary covers Monday→Sunday of the given day only', () => {
    const w = getWeeklySummary(events, '2026-10-08');
    expect(w.weekStart).toBe('2026-10-05');
    expect(w.activities.map(e => e.id)).toEqual(['mon1', 'mon2', 'wed']);
    expect(w.activeDayCount).toBe(2);
    expect(w.countsByType.MIND_GAME_COMPLETED).toBe(1);
    expect(w.countsByType.EYE_RESET_COMPLETED).toBe(0);
  });

  test('latest activity across all days', () => {
    expect(getLatestActivity(events)?.id).toBe('wed');
    expect(getLatestActivity([])).toBeNull();
  });
});
