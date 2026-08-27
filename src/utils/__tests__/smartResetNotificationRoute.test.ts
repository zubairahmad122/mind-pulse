import {
  recommendedResetFromParam,
  smartResetNotificationKey,
} from '../smartResetNotificationRoute';

describe('smart reset notification route helpers', () => {
  it('extracts a valid recommended reset for the picker badge', () => {
    expect(recommendedResetFromParam('eye-break')).toBe('eye-break');
    expect(recommendedResetFromParam('offline')).toBe('offline');
  });

  it('ignores invalid recommended reset params', () => {
    expect(recommendedResetFromParam('unknown')).toBeUndefined();
    expect(recommendedResetFromParam(undefined)).toBeUndefined();
  });

  it('uses notification id as the one-time consumption key', () => {
    expect(smartResetNotificationKey('123')).toBe('123');
    expect(smartResetNotificationKey(undefined)).toBe('smart-reset');
  });
});
