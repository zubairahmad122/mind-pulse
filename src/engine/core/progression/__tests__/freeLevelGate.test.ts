import { canAccessLevel, resolveLevelAccess, FREE_LEVEL_MAX } from '../freeLevelGate';

describe('canAccessLevel', () => {
  it('treats levels 1 through FREE_LEVEL_MAX as free regardless of premium', () => {
    for (let level = 1; level <= FREE_LEVEL_MAX; level++) {
      expect(canAccessLevel(level, false)).toBe('free');
      expect(canAccessLevel(level, true)).toBe('free');
    }
  });

  it('requires premium above FREE_LEVEL_MAX', () => {
    expect(canAccessLevel(FREE_LEVEL_MAX + 1, false)).toBe('premiumRequired');
    expect(canAccessLevel(FREE_LEVEL_MAX + 1, true)).toBe('unlocked');
  });

  it('respects a custom freeLevelMax override', () => {
    expect(canAccessLevel(10, false, 10)).toBe('free');
    expect(canAccessLevel(11, false, 10)).toBe('premiumRequired');
  });

  it('clamps non-finite or sub-1 levels to 1', () => {
    expect(canAccessLevel(0, false)).toBe('free');
    expect(canAccessLevel(-5, false)).toBe('free');
    expect(canAccessLevel(Number.NaN, false)).toBe('free');
  });
});

describe('resolveLevelAccess', () => {
  it('allows play within the free tier', () => {
    expect(resolveLevelAccess(FREE_LEVEL_MAX, false)).toEqual({
      canPlay: true,
      reason: 'ok',
      requiredLevel: FREE_LEVEL_MAX,
    });
  });

  it('blocks play above the free tier for non-premium', () => {
    expect(resolveLevelAccess(FREE_LEVEL_MAX + 1, false)).toEqual({
      canPlay: false,
      reason: 'premium_required',
      requiredLevel: FREE_LEVEL_MAX + 1,
    });
  });

  it('allows play above the free tier for premium', () => {
    expect(resolveLevelAccess(FREE_LEVEL_MAX + 1, true)).toEqual({
      canPlay: true,
      reason: 'ok',
      requiredLevel: FREE_LEVEL_MAX + 1,
    });
  });
});
