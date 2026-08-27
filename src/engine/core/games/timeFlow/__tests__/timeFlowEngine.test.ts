import {
  applySession,
  assessRoundInput,
  buildSessionRecord,
  createRound,
  evaluateAnswer,
  freshTimeFlowProgress,
  generateLayout,
  gridForLevel,
  mechanicsForLevel,
  planSessionDifficulty,
  restartRoundAfterPause,
  roundTransitionTiming,
  type TimeFlowProgress,
  type TimeFlowRoundResult,
} from "..";

const result = (
  correct: boolean,
  sequenceLength = 3,
  columns = 3,
  rows = 3,
): TimeFlowRoundResult => ({
  roundId: `${correct}-${sequenceLength}-${Math.random()}`,
  mechanic: "sequence",
  correct,
  responseMs: 1800,
  tier: Math.max(1, sequenceLength - 2),
  sequenceLength,
  gridSize: rows * columns,
  gridRows: rows,
  gridColumns: columns,
  score: correct ? 25 : 0,
});

describe("TimeFlow senior progression", () => {
  it("generates deterministic valid rectangular grids", () => {
    const layout = generateLayout(42, { rows: 4, columns: 3 });
    expect(layout).toEqual(generateLayout(42, { rows: 4, columns: 3 }));
    expect(layout.type).toBe("grid3x4");
    expect(layout.cells).toHaveLength(12);
    expect(layout.cells.every((cell) => cell.row < 4 && cell.column < 3)).toBe(
      true,
    );
  });

  it("uses the controlled first-session 3, 3, 3, 4, 4, 4 curve", () => {
    const progress = freshTimeFlowProgress();
    expect(
      [0, 1, 2, 3, 4, 5].map(
        (index) =>
          planSessionDifficulty({ index, progress, results: [] })
            .sequenceLength,
      ),
    ).toEqual([3, 3, 3, 4, 4, 4]);
    expect(
      planSessionDifficulty({ index: 5, progress, results: [] }).grid,
    ).toEqual({ rows: 3, columns: 3 });
  });

  it("grows one step only after a stable three-round success window", () => {
    const progress = freshTimeFlowProgress(),
      strong = [result(true), result(true), result(true)];
    expect(
      planSessionDifficulty({ index: 5, progress, results: strong })
        .sequenceLength,
    ).toBe(5);
  });

  it("does not reduce after one failure", () => {
    const progress = freshTimeFlowProgress(),
      recent = [result(true), result(false), result(true)];
    expect(
      planSessionDifficulty({ index: 5, progress, results: recent })
        .sequenceLength,
    ).toBe(4);
  });

  it("reduces only sequence length after repeated failures and slows playback", () => {
    const progress = freshTimeFlowProgress(),
      recent = [result(false), result(true), result(false)],
      planned = planSessionDifficulty({ index: 6, progress, results: recent }),
      baseline = planSessionDifficulty({ index: 6, progress, results: [] });
    expect(planned.sequenceLength).toBe(baseline.sequenceLength - 1);
    expect(planned.grid).toEqual(baseline.grid);
    expect(planned.eventMs).toBeGreaterThan(baseline.eventMs);
  });

  it("unlocks 3×4 at level 3 and 4×4 at level 5", () => {
    expect(gridForLevel(2)).toEqual({ rows: 3, columns: 3 });
    expect(gridForLevel(3)).toEqual({ rows: 4, columns: 3 });
    expect(gridForLevel(5)).toEqual({ rows: 4, columns: 4 });
  });

  it("uses returning capability minus one for warm-up", () => {
    const progress: TimeFlowProgress = {
      ...freshTimeFlowProgress(),
      completedSessions: 4,
      level: 3,
      stableSequenceLength: 6,
      preferredGrid: { rows: 4, columns: 3 },
    };
    const planned = planSessionDifficulty({ index: 0, progress, results: [] });
    expect(planned.sequenceLength).toBe(5);
    expect(planned.grid).toEqual({ rows: 4, columns: 3 });
  });

  it("keeps ordered input locked at its first mismatch and identifies expected cell", () => {
    const round = createRound({ seed: 7, index: 0, tier: 1, level: 1 }),
      expected = round.question.correctOrder,
      wrong = round.layout.cells.find((cell) => cell.id !== expected[1])!.id,
      assessment = assessRoundInput(round, [expected[0]!, wrong]);
    expect(assessment).toMatchObject({
      complete: true,
      mismatch: 1,
      correct: false,
    });
    expect(round.question.correctOrder[assessment.mismatch]).toBe(expected[1]);
  });

  it("supports exact, reverse, and simultaneous pattern correctness", () => {
    const exact = createRound({ seed: 3, index: 0, tier: 1, level: 1 });
    expect(evaluateAnswer(exact, exact.question.correctOrder)).toBe(true);
    const reverse = createRound({ seed: 8, index: 4, tier: 5, level: 6 });
    expect(reverse.mechanic).toBe("reverse");
    expect(reverse.question.correctOrder).toEqual(
      [...reverse.sequence.targetOrder].reverse(),
    );
    const pattern = createRound({ seed: 8, index: 2, tier: 6, level: 7 });
    expect(pattern.mechanic).toBe("pattern");
    expect(
      evaluateAnswer(pattern, [...pattern.question.correctOrder].reverse()),
    ).toBe(true);
  });

  it("provides explicit feedback and next-flow timing", () => {
    const correct = roundTransitionTiming(true, false),
      wrong = roundTransitionTiming(false, false);
    expect(correct.feedbackMs).toBeGreaterThanOrEqual(650);
    expect(wrong.feedbackMs).toBeGreaterThan(correct.feedbackMs);
    expect(correct.nextCueMs).toBeGreaterThanOrEqual(350);
  });

  it("restarts sequence memory cleanly after pause or background", () => {
    expect(restartRoundAfterPause()).toEqual({
      eventIndex: 0,
      selectedOrder: [],
      phase: "ready",
    });
  });

  it("makes Final Flow a one-step safe extension", () => {
    const progress = freshTimeFlowProgress(),
      recent = [result(true, 5), result(true, 5), result(false, 5)],
      normal = planSessionDifficulty({ index: 10, progress, results: recent }),
      final = planSessionDifficulty({ index: 11, progress, results: recent });
    expect(final.sequenceLength).toBe(normal.sequenceLength + 1);
    expect(final.grid).toEqual(normal.grid);
  });

  it("persists longest successful flow, highest grid, and duplicate protection", () => {
    const results = [
        result(true, 6, 3, 4),
        result(false, 8, 4, 4),
        ...Array.from({ length: 10 }, () => result(true, 5, 3, 4)),
      ],
      record = buildSessionRecord({
        id: "one",
        startedAt: "a",
        completedAt: "b",
        results,
        bestStreak: 5,
        levelBefore: 3,
        xpBefore: 0,
      }),
      once = applySession(freshTimeFlowProgress(), record);
    expect(record.highestSequenceLength).toBe(6);
    expect(record.highestGridColumns).toBe(4);
    expect(record.highestGridRows).toBe(4);
    expect(record.mechanicsPlayed).toContain("sequence");
    expect(applySession(once, record)).toEqual(once);
  });

  it("paces advanced mechanics by player level", () => {
    expect(mechanicsForLevel(1)).toEqual(["sequence"]);
    expect(mechanicsForLevel(6)).toContain("reverse");
    expect(mechanicsForLevel(7)).toContain("pattern");
  });
});
