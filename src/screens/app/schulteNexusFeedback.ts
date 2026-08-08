export const SCHULTE_MICRO_MESSAGES = [
  'Nice',
  'Clean',
  'Sharp',
  'Perfect',
  'Locked',
  'Smooth',
  'Great',
] as const;

export function getCleanStreakMessage(streak: number): string | null {
  if (streak === 3) return 'Clean x3';
  if (streak === 5) return 'Flow x5';
  return null;
}

/** Restrained cadence: milestones plus one rotating word every third clean tap. */
export function shouldShowPositiveMessage(streak: number): boolean {
  return getCleanStreakMessage(streak) !== null || streak % 3 === 2;
}

export function pickPositiveMessage(
  previous: string | null,
  choice: number = Math.random(),
): string {
  const pool = SCHULTE_MICRO_MESSAGES.filter(word => word !== previous);
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, choice) * pool.length));
  return pool[index];
}

export interface SchulteResultPresentation {
  previousLevel: number;
  newLevel: number;
  previousProgress: number;
  newProgress: number;
  progressGain: number;
  wasLevelUp: boolean;
  wasPersonalBest: boolean;
}

export function createResultPresentation(input: {
  previousLevel: number;
  newLevel: number;
  previousProgress: number;
  newProgress: number;
  wasPersonalBest: boolean;
}): SchulteResultPresentation {
  const wasLevelUp = input.newLevel > input.previousLevel;
  const progressGain = wasLevelUp
    ? 100 - input.previousProgress + input.newProgress
    : input.newProgress - input.previousProgress;
  return { ...input, progressGain: Math.max(0, progressGain), wasLevelUp };
}

export function getCompletionCtaLabel(result: SchulteResultPresentation): string {
  return result.wasLevelUp ? `Continue to Level ${result.newLevel}` : 'Next Challenge';
}
