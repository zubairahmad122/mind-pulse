import { migratePatternShiftProgress } from '../patternShiftPersistence';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})), doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(),
}));

describe('Pattern Shift persistence migration', () => {
  test('preserves known progression while filling new fields', () => {
    const migrated = migratePatternShiftProgress({ version: 1, playerLevel: 4, xp: 80, recentPerformance: [] });
    expect(migrated.playerLevel).toBe(4);
    expect(migrated.xp).toBe(80);
    expect(migrated.sessionHistory).toEqual([]);
  });
  test('rejects unknown future schemas safely', () => expect(migratePatternShiftProgress({ version: 99 }).playerLevel).toBe(1));
});
