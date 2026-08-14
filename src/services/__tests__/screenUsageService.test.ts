import { normalizeSnapshot, normalizeTopApps } from '../screenUsageService';

describe('normalizeTopApps', () => {
  it('maps well-formed native rows through unchanged (native response mapping)', () => {
    const raw = [
      { packageName: 'com.android.chrome', appName: 'Chrome', foregroundTimeMs: 2_520_000, iconAvailable: true },
    ];
    expect(normalizeTopApps(raw)).toEqual([
      { packageName: 'com.android.chrome', appName: 'Chrome', foregroundTimeMs: 2_520_000, iconAvailable: true },
    ]);
  });

  it('returns an empty list, never fake fallback rows, for an empty native array', () => {
    expect(normalizeTopApps([])).toEqual([]);
  });

  it('returns an empty list for a missing/undefined/null field (unavailable state)', () => {
    expect(normalizeTopApps(undefined)).toEqual([]);
    expect(normalizeTopApps(null)).toEqual([]);
    expect(normalizeTopApps('not-an-array')).toEqual([]);
  });

  it('preserves native ordering — never re-sorts', () => {
    const raw = [
      { packageName: 'com.b', appName: 'B', foregroundTimeMs: 60_000 },
      { packageName: 'com.a', appName: 'A', foregroundTimeMs: 500_000 },
    ];
    expect(normalizeTopApps(raw).map(a => a.packageName)).toEqual(['com.b', 'com.a']);
  });

  it('caps at 5 entries even if the native side somehow sent more', () => {
    const raw = Array.from({ length: 8 }, (_, i) => ({
      packageName: `com.app${i}`,
      appName: `App ${i}`,
      foregroundTimeMs: 60_000,
    }));
    expect(normalizeTopApps(raw)).toHaveLength(5);
  });

  it('drops malformed entries instead of fabricating a fallback for them', () => {
    const raw = [
      { packageName: 'com.a', appName: 'A', foregroundTimeMs: 60_000 },
      { packageName: 'com.b' /* missing appName/foregroundTimeMs */ },
      null,
      'garbage',
      { packageName: 'com.c', appName: 'C', foregroundTimeMs: 30_000 },
    ];
    expect(normalizeTopApps(raw).map(a => a.packageName)).toEqual(['com.a', 'com.c']);
  });

  it('passes long app names through untruncated — truncation is a UI concern, not a data concern', () => {
    const longName = 'A Very Long Application Name That Would Overflow A Row';
    const raw = [{ packageName: 'com.long', appName: longName, foregroundTimeMs: 60_000 }];
    expect(normalizeTopApps(raw)[0].appName).toBe(longName);
  });
});

describe('normalizeSnapshot — topAppsToday wiring', () => {
  it('includes topAppsToday from the native response', () => {
    const snapshot = normalizeSnapshot({
      hasPermission: true,
      screenTimeTodayMs: 3_600_000,
      currentSessionMs: 60_000,
      lastSessionMs: null,
      currentSessionAvailable: true,
      topAppsToday: [{ packageName: 'com.a', appName: 'A', foregroundTimeMs: 60_000 }],
      calculatedAt: 123,
    });
    expect(snapshot.topAppsToday).toEqual([{ packageName: 'com.a', appName: 'A', foregroundTimeMs: 60_000 }]);
  });

  it('defaults topAppsToday to an empty array when the native response omits it', () => {
    const snapshot = normalizeSnapshot({ hasPermission: false });
    expect(snapshot.topAppsToday).toEqual([]);
  });
});

describe('normalizeSnapshot — app switching wiring', () => {
  it('includes appSwitchesLast60Min and appSwitchingAvailable from the native response', () => {
    const snapshot = normalizeSnapshot({
      hasPermission: true,
      appSwitchesLast60Min: 18,
      appSwitchingAvailable: true,
    });
    expect(snapshot.appSwitchesLast60Min).toBe(18);
    expect(snapshot.appSwitchingAvailable).toBe(true);
  });

  it('defaults to unavailable (never a fabricated zero) when the native response omits the fields', () => {
    const snapshot = normalizeSnapshot({ hasPermission: true });
    expect(snapshot.appSwitchesLast60Min).toBeNull();
    expect(snapshot.appSwitchingAvailable).toBe(false);
  });
});
