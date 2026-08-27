import type { WellnessSnapshot } from '@/services/streakSync';
import { mergeWellnessSnapshots } from '../streakMerge';

function snapshot(overrides: Partial<WellnessSnapshot> = {}): WellnessSnapshot {
  return {
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    streakFreezeAvailable: true,
    freezeWeekStart: null,
    activityLog: [],
    ...overrides,
  };
}

describe('mergeWellnessSnapshots', () => {
  it('takes the remote side when it is more recently active', () => {
    const local = snapshot({ streak: 2, longestStreak: 5, lastActiveDate: '2026-07-20', activityLog: ['2026-07-19', '2026-07-20'] });
    const remote = snapshot({ streak: 6, longestStreak: 6, lastActiveDate: '2026-07-24', streakFreezeAvailable: false, activityLog: ['2026-07-23', '2026-07-24'] });

    const merged = mergeWellnessSnapshots(local, remote);

    expect(merged.streak).toBe(6);
    expect(merged.lastActiveDate).toBe('2026-07-24');
    expect(merged.streakFreezeAvailable).toBe(false);
  });

  it('takes the local side when it is more recently active', () => {
    const local = snapshot({ streak: 4, longestStreak: 4, lastActiveDate: '2026-07-24' });
    const remote = snapshot({ streak: 1, longestStreak: 3, lastActiveDate: '2026-07-10' });

    const merged = mergeWellnessSnapshots(local, remote);

    expect(merged.streak).toBe(4);
    expect(merged.lastActiveDate).toBe('2026-07-24');
  });

  it('picks the higher streak when both sides were credited the same day', () => {
    const local = snapshot({ streak: 3, longestStreak: 5, lastActiveDate: '2026-07-24' });
    const remote = snapshot({ streak: 7, longestStreak: 7, lastActiveDate: '2026-07-24' });

    const merged = mergeWellnessSnapshots(local, remote);

    expect(merged.streak).toBe(7);
    expect(merged.lastActiveDate).toBe('2026-07-24');
  });

  it('never regresses longestStreak, even if the losing side had a higher lifetime best', () => {
    const local = snapshot({ streak: 1, longestStreak: 30, lastActiveDate: '2026-06-01' });
    const remote = snapshot({ streak: 5, longestStreak: 5, lastActiveDate: '2026-07-24' });

    const merged = mergeWellnessSnapshots(local, remote);

    expect(merged.longestStreak).toBe(30);
  });

  it('unions and caps the activity log, deduping overlapping dates', () => {
    const local = snapshot({ lastActiveDate: '2026-07-22', activityLog: ['2026-07-20', '2026-07-21', '2026-07-22'] });
    const remote = snapshot({ lastActiveDate: '2026-07-22', activityLog: ['2026-07-21', '2026-07-22', '2026-07-23'] });

    const merged = mergeWellnessSnapshots(local, remote);

    expect(merged.activityLog).toEqual(['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23']);
  });

  it('handles a brand-new local device with no prior activity', () => {
    const local = snapshot(); // fresh install, lastActiveDate: null
    const remote = snapshot({ streak: 10, longestStreak: 10, lastActiveDate: '2026-07-24', activityLog: ['2026-07-24'] });

    const merged = mergeWellnessSnapshots(local, remote);

    expect(merged.streak).toBe(10);
    expect(merged.lastActiveDate).toBe('2026-07-24');
  });

  it('handles a brand-new remote (nothing pushed yet) by keeping local', () => {
    const local = snapshot({ streak: 3, longestStreak: 3, lastActiveDate: '2026-07-24', activityLog: ['2026-07-22', '2026-07-23', '2026-07-24'] });
    const remote = snapshot(); // nothing remote yet

    const merged = mergeWellnessSnapshots(local, remote);

    expect(merged.streak).toBe(3);
    expect(merged.lastActiveDate).toBe('2026-07-24');
  });
});
