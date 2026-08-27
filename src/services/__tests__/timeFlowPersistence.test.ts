import { migrateTimeFlowProgress } from "../timeFlowPersistence";
jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));
describe("TimeFlow migration", () => {
  it("preserves valid progress and repairs arrays", () => {
    const value = migrateTimeFlowProgress({
      version: 1,
      level: 4,
      xp: 22,
      sessionHistory: "bad",
      recentPerformance: null,
    });
    expect(value.level).toBe(4);
    expect(value.xp).toBe(22);
    expect(value.sessionHistory).toEqual([]);
    expect(value.recentPerformance).toEqual([]);
    expect(value.highestGridSize).toBe(3);
    expect(value.preferredGrid).toEqual({ rows: 3, columns: 3 });
    expect(value.stableSequenceLength).toBe(3);
    expect(value.accuracyWindow).toEqual([]);
    expect(value.unlockedMechanics).toEqual(["sequence"]);
    expect(value.seenModeIntros).toEqual(["sequence"]);
  });
  it("falls back for future schemas", () =>
    expect(migrateTimeFlowProgress({ version: 999, level: 9 }).level).toBe(1));
});
