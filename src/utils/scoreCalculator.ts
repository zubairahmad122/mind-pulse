export interface ScoreInputs {
  eyesScore: number;
  sleepScore: number;
  mindScore: number;
}

export interface ScoreStatus {
  label: string;
  emoji: string;
  color: string;
}

export function calculateMindPulseScore({ eyesScore, sleepScore, mindScore }: ScoreInputs): number {
  return Math.round((eyesScore * 0.35) + (sleepScore * 0.35) + (mindScore * 0.30));
}

export function getScoreStatus(score: number): ScoreStatus {
  if (score <= 25) return { label: 'Recovering', emoji: '🌱', color: '#6ee7b7' };
  if (score <= 50) return { label: 'Moderate Impact', emoji: '⚠️', color: '#f59e0b' };
  if (score <= 75) return { label: 'High Damage', emoji: '🔥', color: '#f97316' };
  return { label: 'Critical', emoji: '💀', color: '#e24b4a' };
}

export function getWorstArea(eyesScore: number, sleepScore: number, mindScore: number): string {
  const scores: Record<string, number> = { Eyes: eyesScore, Sleep: sleepScore, Mind: mindScore };
  return Object.keys(scores).reduce((a, b) => (scores[a] > scores[b] ? a : b));
}

export function getInsightMessage(worstArea: string, score: number, hour: number): string {
  const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'late night';
  if (worstArea === 'Eyes') {
    if (score >= 75) return `Your eyes are critically strained. Take a 20-20-20 break right now — look 20 ft away for 20 seconds.`;
    if (score >= 50) return `Eye strain is your main issue this ${tod}. Try the Eye Reset Protocol for quick relief.`;
    return `Your eyes are in decent shape. A Comet Trace session will keep smooth pursuit muscles strong.`;
  }
  if (worstArea === 'Sleep') {
    if (score >= 75) return `Sleep health is critical. Dim all screens now and aim for a consistent bedtime tonight.`;
    if (score >= 50) return `Sleep quality needs attention this ${tod}. Log tonight's session and try the Sleep Story audio.`;
    return `Your sleep streak is building. Keep the habit going and track tonight's session.`;
  }
  if (score >= 75) return `Mind stress is at a peak this ${tod}. Just 5 minutes of Box Breathing will reset your nervous system.`;
  if (score >= 50) return `Stress is elevated. The Body Scan exercise can reduce tension before it builds further.`;
  return `Mind health is moderate. A short journaling session could help ground your thoughts today.`;
}
