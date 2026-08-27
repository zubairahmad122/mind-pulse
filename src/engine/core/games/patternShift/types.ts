export type PatternShiftRoundType =
  | 'exact'
  | 'recall'
  | 'missing'
  | 'mirror'
  | 'rotation'
  | 'sequence';

export type Vec2 = { x: number; y: number };
export type GlyphFamily = 'network' | 'orbital' | 'circuit';
export type MutationStrength = 'obvious' | 'moderate' | 'subtle' | 'precision';
export type GlyphNodeKind = 'filled' | 'ring' | 'diamond' | 'terminal' | 'hub' | 'junction';
export type GlyphNode = { id: string; x: number; y: number; kind: GlyphNodeKind; salient?: boolean };
export type GlyphEdge = { id: string; from: string; to: string; kind: 'straight' | 'curved' | 'orthogonal'; salient?: boolean };
export type GlyphArc = { id: string; center: Vec2; radius: number; startAngle: number; sweepAngle: number; ring: 1 | 2 | 3; salient?: boolean };

export type PatternDefinition = {
  id: string;
  seed: number;
  family: GlyphFamily;
  nodes: GlyphNode[];
  edges: GlyphEdge[];
  arcs: GlyphArc[];
  rotation: number;
  mirrorX: boolean;
  mirrorY: boolean;
  complexity: number;
  mutation?: { kind: string; description: string; affectedIds: string[] };
};

export type DifficultyConfig = {
  tier: number;
  choiceCount: number;
  elementCount: number;
  previewMs: number;
  answerMs: number;
  similarity: number;
};

export type PatternShiftRound = {
  id: string;
  type: PatternShiftRoundType;
  instruction: string;
  target: PatternDefinition;
  sequence?: PatternDefinition[];
  candidates: PatternDefinition[];
  correctCandidateId: string;
  difficulty: DifficultyConfig;
  targetVisibleDuringAnswer: boolean;
  phase: 'warmup' | 'adaptive' | 'shift' | 'challenge';
};

export type RoundResult = {
  roundId: string;
  roundType: PatternShiftRoundType;
  correct: boolean;
  responseMs: number;
  difficulty: number;
  score: number;
};

export type PatternShiftSessionRecord = {
  id: string;
  startedAt: string;
  completedAt: string;
  score: number;
  xpEarned: number;
  accuracy: number;
  averageResponseMs: number;
  correctRounds: number;
  totalRounds: number;
  bestStreak: number;
  highestDifficulty: number;
  playerLevelBefore: number;
  playerLevelAfter: number;
  roundTypeBreakdown: Record<string, { attempted: number; correct: number }>;
};

export type PatternShiftProgress = {
  version: number;
  playerLevel: number;
  xp: number;
  lifetimeXp: number;
  totalSessions: number;
  completedSessions: number;
  totalRounds: number;
  correctRounds: number;
  highestDifficulty: number;
  bestScore: number;
  bestStreak: number;
  bestAccuracy?: number;
  bestAverageResponseMs?: number;
  unlockedRoundTypes: PatternShiftRoundType[];
  lastPlayedAt?: string;
  recentPerformance: { accuracy: number; averageResponseMs: number; difficulty: number; completedAt: string }[];
  sessionHistory: PatternShiftSessionRecord[];
};
