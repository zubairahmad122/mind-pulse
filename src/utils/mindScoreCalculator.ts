export interface MindScoreInputs {
  stressLevel: number;              // 1–5
  recoverySessionsToday: number;    // breathing, body scan, grounding etc.
  lastRelaxSessionHoursAgo: number; // hours since last mind activity
  journalEntriesToday: number;      // journal entries written today
  audioSessionsToday: number;       // guided audio sessions today
  hasJournalStreak3: boolean;       // journal entries on 3+ consecutive days
}

export function calculateMindScore({
  stressLevel,
  recoverySessionsToday,
  lastRelaxSessionHoursAgo,
  journalEntriesToday,
  audioSessionsToday,
  hasJournalStreak3,
}: MindScoreInputs): number {
  // Base: 30 + stress contribution (10–50 for levels 1–5)
  let score = 30 + stressLevel * 10;

  // Recovery sessions reduce score
  score -= recoverySessionsToday * 6;

  // Audio sessions help
  score -= audioSessionsToday * 4;

  // Journal entries help (each entry = small reduction)
  score -= journalEntriesToday * 5;

  // Journal streak bonus
  if (hasJournalStreak3) score -= 8;

  // Late relaxation penalty
  if (lastRelaxSessionHoursAgo > 24) score += 15;
  else if (lastRelaxSessionHoursAgo > 12) score += 8;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/** Map numeric score to readable status */
export function mindScoreTheme(score: number): {
  color: string;
  label: string;
  emoji: string;
} {
  if (score <= 20) return { color: '#4CAF50', label: 'Peaceful', emoji: '🧘' };
  if (score <= 40) return { color: '#8BC34A', label: 'Mild Stress', emoji: '😌' };
  if (score <= 60) return { color: '#FF9800', label: 'Moderate Impact', emoji: '😤' };
  if (score <= 80) return { color: '#FF5722', label: 'High Stress', emoji: '🔥' };
  return { color: '#F44336', label: 'Critical', emoji: '💀' };
}

