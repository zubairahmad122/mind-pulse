import {
  createResultPresentation,
  getCompletionCtaLabel,
  getCleanStreakMessage,
  pickPositiveMessage,
  shouldShowPositiveMessage,
} from '../schulteNexusFeedback';

describe('Schulte Nexus transient tap feedback', () => {
  it('shows clean-streak feedback only at the requested thresholds', () => {
    expect(getCleanStreakMessage(2)).toBeNull();
    expect(getCleanStreakMessage(3)).toBe('Clean x3');
    expect(getCleanStreakMessage(4)).toBeNull();
    expect(getCleanStreakMessage(5)).toBe('Flow x5');
  });

  it('keeps ordinary positive messages restrained', () => {
    expect([1, 2, 3, 4, 5, 6].map(shouldShowPositiveMessage)).toEqual([
      false,
      true,
      true,
      false,
      true,
      false,
    ]);
  });

  it('never repeats the previous rotating word', () => {
    expect(pickPositiveMessage('Nice', 0)).not.toBe('Nice');
    expect(pickPositiveMessage('Great', 0.999)).not.toBe('Great');
  });

  it('describes normal progress from its persisted previous value', () => {
    const result = createResultPresentation({
      previousLevel: 4,
      newLevel: 4,
      previousProgress: 42,
      newProgress: 66,
      wasPersonalBest: false,
    });
    expect(result).toMatchObject({ progressGain: 24, wasLevelUp: false });
    expect(getCompletionCtaLabel(result)).toBe('Next Challenge');
  });

  it('describes level-up overflow and the actual unlocked level', () => {
    const result = createResultPresentation({
      previousLevel: 4,
      newLevel: 5,
      previousProgress: 90,
      newProgress: 22,
      wasPersonalBest: true,
    });
    expect(result).toMatchObject({ progressGain: 32, wasLevelUp: true, wasPersonalBest: true });
    expect(getCompletionCtaLabel(result)).toBe('Continue to Level 5');
  });

  it('never invents a previous-best time when none was supplied', () => {
    const result = createResultPresentation({
      previousLevel: 4,
      newLevel: 4,
      previousProgress: 42,
      newProgress: 66,
      wasPersonalBest: true,
    });
    expect(result.previousBestMs).toBeNull();
  });

  it('passes through a real previous-best time when the director reports one', () => {
    const result = createResultPresentation({
      previousLevel: 4,
      newLevel: 4,
      previousProgress: 42,
      newProgress: 66,
      wasPersonalBest: true,
      previousBestMs: 25_120,
    });
    expect(result.previousBestMs).toBe(25_120);
  });
});
