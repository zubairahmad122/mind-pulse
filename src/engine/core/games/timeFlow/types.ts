export type TimeFlowMechanic = "sequence" | "reverse" | "pattern";
export type GridConfig = { rows: 3 | 4; columns: 3 | 4 };
export type FlowCell = {
  id: string;
  index: number;
  row: number;
  column: number;
};
export type FlowLayout = {
  id: string;
  type: "grid3x3" | "grid3x4" | "grid4x4";
  rows: 3 | 4;
  columns: 3 | 4;
  cells: FlowCell[];
};
export type TimeFlowEvent = {
  type: "cellPulse" | "patternFlash";
  cellIds: string[];
};
export type TimeFlowSequence = {
  id: string;
  seed: number;
  events: TimeFlowEvent[];
  targetOrder: string[];
  durationMs: number;
  difficulty: number;
};
export type TimeFlowQuestion = {
  kind: "ordered" | "pattern";
  instruction: "REPEAT THE FLOW" | "REPEAT IN REVERSE" | "REBUILD THE PATTERN";
  correctOrder: string[];
};
export type TimeFlowDifficulty = {
  tier: number;
  grid: GridConfig;
  sequenceLength: number;
  eventMs: number;
  activationMs: number;
  gapMs: number;
  answerMs: number;
  recallDelayMs: number;
  allowRepeats: boolean;
  simultaneousCount: number;
};
export type TimeFlowRound = {
  id: string;
  index: number;
  phase: "warmup" | "build" | "focus" | "push" | "final";
  mechanic: TimeFlowMechanic;
  layout: FlowLayout;
  sequence: TimeFlowSequence;
  question: TimeFlowQuestion;
  difficulty: TimeFlowDifficulty;
};
export type TimeFlowRoundResult = {
  roundId: string;
  mechanic: TimeFlowMechanic;
  correct: boolean;
  responseMs: number;
  tier: number;
  sequenceLength: number;
  gridSize: number;
  gridRows: number;
  gridColumns: number;
  score: number;
};
export type TimeFlowSessionRecord = {
  id: string;
  startedAt: string;
  completedAt: string;
  score: number;
  xpEarned: number;
  accuracy: number;
  averageRecallMs: number;
  correctRounds: number;
  totalRounds: number;
  bestStreak: number;
  highestTier: number;
  highestSequenceLength: number;
  highestGridSize?: number;
  highestGridRows?: number;
  highestGridColumns?: number;
  mechanicsPlayed?: TimeFlowMechanic[];
  levelBefore: number;
  levelAfter: number;
};
export type TimeFlowProgress = {
  version: number;
  level: number;
  xp: number;
  lifetimeXp: number;
  totalSessions: number;
  completedSessions: number;
  bestScore: number;
  bestStreak: number;
  bestAccuracy?: number;
  bestRecallMs?: number;
  highestTier: number;
  highestSequenceLength: number;
  highestGridSize: number;
  preferredGrid: GridConfig;
  stableSequenceLength: number;
  accuracyWindow: number[];
  currentAdaptiveTier: number;
  unlockedMechanics: TimeFlowMechanic[];
  seenModeIntros: TimeFlowMechanic[];
  lastPlayedAt?: string;
  recentPerformance: {
    accuracy: number;
    averageRecallMs: number;
    tier: number;
    completedAt: string;
  }[];
  sessionHistory: TimeFlowSessionRecord[];
};
