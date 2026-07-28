export const XP_PER_LEVEL = 100;

export type GameRating = 1 | 2 | 3;

export interface EyeGameLevelProgress {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  progress: number;
}

export interface EyeGameMilestone {
  level: number;
  title: string;
  badge: string;
  cosmetic: string;
}

const GAME_MILESTONES: EyeGameMilestone[] = [
  { level: 1, title: 'New Player', badge: '🌱', cosmetic: 'Sprout badge' },
  { level: 3, title: 'Steady Player', badge: '✨', cosmetic: 'Starlight badge' },
  { level: 5, title: 'Focused Player', badge: '💫', cosmetic: 'Comet badge' },
  { level: 10, title: 'Game Master', badge: '🏆', cosmetic: 'Gold trophy badge' },
];

export function xpForGameRating(rating: GameRating): number {
  if (rating === 3) return 40;
  if (rating === 2) return 25;
  return 15;
}

export function calculateEyeGameLevel(totalXp: number): EyeGameLevelProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  const xpIntoLevel = safeXp % XP_PER_LEVEL;
  return {
    level: Math.floor(safeXp / XP_PER_LEVEL) + 1,
    totalXp: safeXp,
    xpIntoLevel,
    xpToNextLevel: XP_PER_LEVEL - xpIntoLevel,
    progress: xpIntoLevel / XP_PER_LEVEL,
  };
}

export function getEyeGameMilestone(level: number): {
  current: EyeGameMilestone;
  next: EyeGameMilestone | null;
} {
  const safeLevel = Math.max(1, Math.floor(level));
  const current =
    [...GAME_MILESTONES].reverse().find(milestone => milestone.level <= safeLevel)
    ?? GAME_MILESTONES[0];
  const next =
    GAME_MILESTONES.find(milestone => milestone.level > safeLevel) ?? null;
  return { current, next };
}
