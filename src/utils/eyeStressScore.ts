import { EyeSessionRecord } from '@/services/eyeProgressPersistence';

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}

function streakFromDays(days: string[]): number {
  if (days.length === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 90; i++) {
    const key = cursor.toLocaleDateString('sv');
    if (days.includes(key)) {
      streak++;
    } else if (i === 0) {
      // today not done yet — streak from yesterday still counts
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface EyeScoreResult {
  score: number;
  primaryReason: string;
}

export function calculateEyeStressScore({
  sessions,
  breakEnforcerEnabled,
}: {
  sessions: EyeSessionRecord[];
  breakEnforcerEnabled: boolean;
}): EyeScoreResult {
  let score = 45;
  let primaryReason = '';

  const days = [...new Set(sessions.map(s => s.dateKey))].sort().reverse();
  const today = todayKey();

  if (days.length === 0) {
    score += 10;
    primaryReason = 'Welcome — try your first eye protocol';
  } else if (days[0] === today) {
    score -= 20;
    primaryReason = 'Protocol completed today';
  } else {
    const last = new Date(days[0]);
    const diff = Math.max(1, Math.floor((Date.now() - last.getTime()) / 86_400_000));
    const add = Math.min(40, diff * 10);
    score += add;
    primaryReason = diff === 1
      ? 'No protocol yesterday'
      : `No protocol for ${diff} days`;
  }

  const streak = streakFromDays(days);
  if (streak >= 7) score -= 15;
  else if (streak >= 3) score -= 10;
  else if (streak >= 1) score -= 5;

  // Single low-engagement penalty (streak < 1 and enforcer off correlate)
  if (streak < 1 && !breakEnforcerEnabled) {
    score += 10;
  } else if (!breakEnforcerEnabled) {
    score += 6;
  } else {
    score -= 10;
  }

  if (!primaryReason.includes('today') && !breakEnforcerEnabled) {
    primaryReason += ' · No break reminders';
  }

  const h = new Date().getHours();
  if (h < 5 || h >= 23) score += 20;
  else if (h >= 21) score += 10;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    primaryReason,
  };
}

export function scoreTheme(score: number): {
  color: string;
  bg: string;
  label: string;
  emoji: string;
} {
  if (score <= 20) return { color: '#4CAF50', bg: 'rgba(76,175,80,0.12)', label: 'Healthy', emoji: '🌿' };
  if (score <= 40) return { color: '#8BC34A', bg: 'rgba(139,195,74,0.12)', label: 'Mild Strain', emoji: '😌' };
  if (score <= 60) return { color: '#FF9800', bg: 'rgba(255,152,0,0.12)', label: 'Moderate Strain', emoji: '😤' };
  if (score <= 80) return { color: '#FF5722', bg: 'rgba(255,87,34,0.12)', label: 'High Strain', emoji: '🔥' };
  return { color: '#F44336', bg: 'rgba(244,67,54,0.12)', label: 'Critical', emoji: '💀' };
}
