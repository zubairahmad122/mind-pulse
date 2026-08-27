import type {
  FlowLayout,
  GridConfig,
  TimeFlowDifficulty,
  TimeFlowMechanic,
  TimeFlowRound,
  TimeFlowRoundResult,
  TimeFlowProgress,
} from "./types";

function rng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function shuffle<T>(items: T[], random: () => number) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function difficultyForTier(tier: number): TimeFlowDifficulty {
  const t = Math.max(1, Math.min(10, tier)),
    grid: GridConfig =
      t >= 5
        ? { rows: 4, columns: 4 }
        : t >= 3
          ? { rows: 4, columns: 3 }
          : { rows: 3, columns: 3 };
  const sequenceLength =
      t === 1 ? 3 : t === 2 ? 4 : t === 4 ? 4 : Math.min(8, t + 2),
    activationMs = Math.max(340, 500 - (t - 1) * 20),
    gapMs = Math.max(110, 150 - (t - 1) * 5);
  return {
    tier: t,
    grid,
    sequenceLength,
    eventMs: activationMs + gapMs,
    activationMs,
    gapMs,
    answerMs: t <= 2 ? 0 : Math.max(9000, 15000 - t * 450),
    recallDelayMs: t >= 8 ? Math.min(1500, 500 + (t - 8) * 400) : 250,
    allowRepeats: t >= 2,
    simultaneousCount: t >= 6 ? Math.min(6, t - 2) : 0,
  };
}
export function mechanicsForLevel(level: number): TimeFlowMechanic[] {
  const result: TimeFlowMechanic[] = ["sequence"];
  if (level >= 6) result.push("reverse");
  if (level >= 7) result.push("pattern");
  return result;
}
export function generateLayout(seed: number, grid: GridConfig): FlowLayout {
  const { rows, columns } = grid;
  return {
    id: `time-grid-${seed}-${columns}x${rows}`,
    type:
      columns === 4 && rows === 4
        ? "grid4x4"
        : rows === 4 || columns === 4
          ? "grid3x4"
          : "grid3x3",
    rows,
    columns,
    cells: Array.from({ length: rows * columns }, (_, index) => ({
      id: `cell-${index}`,
      index,
      row: Math.floor(index / columns),
      column: index % columns,
    })),
  };
}
export function generateSequence(
  seed: number,
  difficulty: TimeFlowDifficulty,
  cellIds: string[],
) {
  const random = rng(seed);
  if (!difficulty.allowRepeats)
    return shuffle(cellIds, random).slice(0, difficulty.sequenceLength);
  const result: string[] = [];
  while (result.length < difficulty.sequenceLength) {
    const choices = cellIds.filter((id) => id !== result.at(-1));
    result.push(choices[Math.floor(random() * choices.length)]!);
  }
  return result;
}
export function createRound(input: {
  seed: number;
  index: number;
  tier: number;
  level: number;
  difficulty?: TimeFlowDifficulty;
}): TimeFlowRound {
  const tierDifficulty = input.difficulty ?? difficultyForTier(input.tier),
    unlockedGrid = gridForLevel(input.level),
    difficulty: TimeFlowDifficulty = {
      ...tierDifficulty,
      grid: clampGrid(tierDifficulty.grid, unlockedGrid),
      recallDelayMs: input.level >= 9 ? tierDifficulty.recallDelayMs : 250,
    },
    layout = generateLayout(input.seed, difficulty.grid),
    ids = layout.cells.map((cell) => cell.id),
    canPattern = input.level >= 7 && input.tier >= 6,
    canReverse = input.level >= 6 && input.tier >= 5,
    pattern =
      canPattern && input.index > 1 && (input.seed + input.index) % 5 === 0,
    reverse =
      !pattern &&
      canReverse &&
      input.index > 1 &&
      (input.seed + input.index) % 4 === 0,
    mechanic: TimeFlowMechanic = pattern
      ? "pattern"
      : reverse
        ? "reverse"
        : "sequence",
    targetOrder = pattern
      ? shuffle(ids, rng(input.seed + 17)).slice(
          0,
          difficulty.simultaneousCount,
        )
      : generateSequence(input.seed + 17, difficulty, ids),
    events = pattern
      ? [{ type: "patternFlash" as const, cellIds: targetOrder }]
      : targetOrder.map((cellId) => ({
          type: "cellPulse" as const,
          cellIds: [cellId],
        })),
    correctOrder = reverse ? [...targetOrder].reverse() : targetOrder;
  return {
    id: `time-flow-${input.seed}-${input.index}`,
    index: input.index,
    phase:
      input.index < 3
        ? "warmup"
        : input.index < 6
          ? "build"
          : input.index < 9
            ? "focus"
            : input.index < 11
              ? "push"
              : "final",
    mechanic,
    layout,
    sequence: {
      id: `sequence-${input.seed}`,
      seed: input.seed,
      events,
      targetOrder,
      durationMs: events.length * difficulty.eventMs,
      difficulty: input.tier,
    },
    question: {
      kind: pattern ? "pattern" : "ordered",
      instruction: pattern
        ? "REBUILD THE PATTERN"
        : reverse
          ? "REPEAT IN REVERSE"
          : "REPEAT THE FLOW",
      correctOrder,
    },
    difficulty,
  };
}

export function gridForLevel(level: number): GridConfig {
  if (level >= 5) return { rows: 4, columns: 4 };
  if (level >= 3) return { rows: 4, columns: 3 };
  return { rows: 3, columns: 3 };
}

function gridRank(grid: GridConfig) {
  return grid.rows * grid.columns;
}
function clampGrid(requested: GridConfig, unlocked: GridConfig) {
  return gridRank(requested) <= gridRank(unlocked) ? requested : unlocked;
}

export function planSessionDifficulty(input: {
  index: number;
  progress: TimeFlowProgress;
  results: TimeFlowRoundResult[];
}): TimeFlowDifficulty {
  const { index, progress, results } = input,
    firstSession = progress.completedSessions === 0,
    recent = results.slice(-3),
    failures = recent.filter((result) => !result.correct).length,
    strong = recent.length === 3 && failures === 0,
    repeatedFailures = recent.length === 3 && failures >= 2,
    historicalBase = Math.max(
      3,
      Math.min(8, progress.stableSequenceLength - 1),
    ),
    firstCurve = [3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5],
    baseLength = firstSession
      ? (firstCurve[index] ?? 6)
      : index < 2
        ? historicalBase
        : Math.max(historicalBase, progress.stableSequenceLength),
    availableGrid = gridForLevel(progress.level),
    preferredGrid = clampGrid(progress.preferredGrid, availableGrid),
    grid = firstSession
      ? { rows: 3 as const, columns: 3 as const }
      : index < 6
        ? preferredGrid
        : strong
          ? availableGrid
          : preferredGrid,
    expandingGrid = gridRank(grid) > gridRank(preferredGrid),
    growth = repeatedFailures
      ? -1
      : index === 11 && failures <= 1
        ? 1
        : strong && index >= 5 && !expandingGrid
          ? 1
          : 0,
    sequenceLength = Math.max(3, Math.min(10, baseLength + growth)),
    tier = Math.max(
      1,
      Math.min(10, sequenceLength - 2 + (gridRank(grid) >= 12 ? 1 : 0)),
    ),
    base = difficultyForTier(tier);
  return {
    ...base,
    tier,
    grid,
    sequenceLength,
    eventMs: repeatedFailures ? Math.min(760, base.eventMs + 70) : base.eventMs,
    activationMs: repeatedFailures
      ? Math.min(600, base.activationMs + 70)
      : base.activationMs,
    allowRepeats: progress.level >= 4 && sequenceLength >= 4,
    recallDelayMs: progress.level >= 8 ? base.recallDelayMs : 250,
    answerMs: progress.level <= 2 ? 0 : base.answerMs,
  };
}

export function roundTransitionTiming(
  correct: boolean,
  reducedMotion: boolean,
) {
  return reducedMotion
    ? { feedbackMs: 360, nextCueMs: 220 }
    : { feedbackMs: correct ? 680 : 760, nextCueMs: 380 };
}

export function restartRoundAfterPause() {
  return {
    eventIndex: 0,
    selectedOrder: [] as string[],
    phase: "ready" as const,
  };
}
export function sequenceNodeOrder(round: TimeFlowRound) {
  return round.sequence.targetOrder;
}
export function evaluateAnswer(round: TimeFlowRound, answer: unknown) {
  if (!Array.isArray(answer)) return false;
  if (round.question.kind === "pattern")
    return (
      answer.length === round.question.correctOrder.length &&
      [...answer].sort().join("|") ===
        [...round.question.correctOrder].sort().join("|")
    );
  return answer.join("|") === round.question.correctOrder.join("|");
}
export function firstMismatch(expected: string[], actual: string[]) {
  return actual.findIndex((value, index) => value !== expected[index]);
}
export function assessRoundInput(round: TimeFlowRound, actual: string[]) {
  if (round.question.kind === "pattern") {
    const mismatch = actual.findIndex(
        (id) => !round.question.correctOrder.includes(id),
      ),
      complete =
        mismatch >= 0 || actual.length >= round.question.correctOrder.length;
    return {
      complete,
      mismatch,
      correct: complete && mismatch < 0 && evaluateAnswer(round, actual),
    };
  }
  const mismatch = firstMismatch(round.question.correctOrder, actual),
    complete =
      mismatch >= 0 || actual.length >= round.question.correctOrder.length;
  return {
    complete,
    mismatch,
    correct:
      complete &&
      mismatch < 0 &&
      actual.length === round.question.correctOrder.length,
  };
}
export function assessRepeat(expected: string[], actual: string[]) {
  const mismatch = firstMismatch(expected, actual),
    complete = mismatch >= 0 || actual.length >= expected.length;
  return {
    complete,
    mismatch,
    correct: complete && mismatch < 0 && actual.length === expected.length,
  };
}
export function scoreRound(
  correct: boolean,
  responseMs: number,
  tier: number,
  length: number,
  streak: number,
  answerMs: number,
) {
  if (!correct) return 0;
  const speed =
    answerMs > 0 ? 0.8 + 0.2 * Math.max(0, 1 - responseMs / answerMs) : 1;
  return Math.round(
    20 *
      (1 + (tier - 1) * 0.1) *
      (1 + (length - 3) * 0.1) *
      speed *
      (1 + Math.min(streak, 8) * 0.025),
  );
}
export function adaptDifficulty(
  current: number,
  recent: TimeFlowRoundResult[],
) {
  const window = recent.slice(-5);
  if (window.length < 3) return current;
  const accuracy =
    window.filter((result) => result.correct).length / window.length;
  if (accuracy >= 0.8) return Math.min(10, current + 1);
  if (accuracy < 0.55) return Math.max(1, current - 1);
  return current;
}
