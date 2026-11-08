import { getMindGamesUnlock } from '../mindGamesUnlock';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('getMindGamesUnlock', () => {
  it('keeps games hidden on days 1 and 2', () => {
    expect(getMindGamesUnlock('2026-11-09', '2026-11-09').unlocked).toBe(false);
    expect(getMindGamesUnlock('2026-11-09', '2026-11-10').unlocked).toBe(false);
  });

  it('unlocks on day 3 and marks them as new', () => {
    expect(getMindGamesUnlock('2026-11-09', '2026-11-11')).toEqual({ unlocked: true, isNew: true });
  });

  it('stops calling them new after a week', () => {
    expect(getMindGamesUnlock('2026-11-09', '2026-11-18')).toEqual({ unlocked: true, isNew: false });
  });
});
