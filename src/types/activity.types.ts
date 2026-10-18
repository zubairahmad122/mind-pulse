// ──────────────────────────────────────────────────────────────────────────────
// Unified activity model — one record per genuinely COMPLETED activity, across
// every pillar. Feature-specific stores (game progress, eye sessions, relax
// history, sleep sessions, focus stats) keep their own richer data; this log is
// the single cross-feature source for "what did the user actually do, when".
// ──────────────────────────────────────────────────────────────────────────────

export const ACTIVITY_TYPES = [
  'MIND_GAME_COMPLETED',
  'EYE_RESET_COMPLETED',
  'EYE_BREAK_COMPLETED',
  /** Focus Switch — the eye game that already credited progress before this log existed. */
  'EYE_GAME_COMPLETED',
  'FOCUS_SESSION_COMPLETED',
  'RELAX_SESSION_COMPLETED',
  'SLEEP_SESSION_COMPLETED',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Where a completion came from — the feature, not the screen that showed it. */
export type ActivitySource =
  | 'pattern-shift'
  | 'time-flow'
  | 'math-gap'
  | 'schulte-nexus'
  | 'mills'
  | 'cvs-protocol'
  | 'eye-break'
  | 'focus-sprint'
  | 'focus-block'
  | 'relax-player'
  | 'body-scan'
  | 'muscle-release'
  | 'grounding'
  | 'sleep-tracker';

/** Small, non-sensitive scalars only — never user-written text (goals, journal, names). */
export type ActivityMetadata = Record<string, string | number | boolean>;

export interface ActivityEvent {
  /** Deterministic where the feature has its own id, so a retried write can't double-count. */
  id: string;
  type: ActivityType;
  /** Completion time, epoch ms. */
  timestamp: number;
  /** Local calendar day of `timestamp` (YYYY-MM-DD, never the UTC day). */
  date: string;
  /** Real elapsed/planned length of the completed activity. */
  durationSeconds: number;
  /** Only completions are ever recorded — starts, opens and abandons are not activity. */
  completed: true;
  source: ActivitySource;
  score?: number;
  metadata?: ActivityMetadata;
}

/** What a completion point passes in — `date`/`completed` are always derived. */
export type ActivityInput = Omit<ActivityEvent, 'date' | 'completed' | 'timestamp'> & {
  timestamp?: number;
};
