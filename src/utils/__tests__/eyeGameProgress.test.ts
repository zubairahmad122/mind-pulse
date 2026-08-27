import {
  calculateEyeGameLevel,
  getEyeGameMilestone,
  xpForGameRating,
} from '@/utils/eyeGameProgress';

describe('eye game progression', () => {
  it('awards more XP for stronger game performance', () => {
    expect(xpForGameRating(1)).toBe(15);
    expect(xpForGameRating(2)).toBe(25);
    expect(xpForGameRating(3)).toBe(40);
  });

  it('calculates level progress from total XP', () => {
    expect(calculateEyeGameLevel(240)).toEqual({
      level: 3,
      totalXp: 240,
      xpIntoLevel: 40,
      xpToNextLevel: 60,
      progress: 0.4,
    });
  });

  it('returns the current and next non-medical game milestone', () => {
    expect(getEyeGameMilestone(4)).toEqual({
      current: {
        level: 3,
        title: 'Steady Player',
        badge: '✨',
        cosmetic: 'Starlight badge',
      },
      next: {
        level: 5,
        title: 'Focused Player',
        badge: '💫',
        cosmetic: 'Comet badge',
      },
    });
    expect(getEyeGameMilestone(10).next).toBeNull();
  });
});
