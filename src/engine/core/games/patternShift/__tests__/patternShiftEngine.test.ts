import {
  adaptDifficulty, applySession, applyXp, buildSessionRecord, chooseRoundType, createRound,
  freshPatternShiftProgress, generatePattern, isValidSession, patternSignature, scoreRound, unlockedTypes,
  type RoundResult,
} from '..';

const results = (correct: boolean, responseMs = 1800): RoundResult[] => Array.from({ length: 5 }, (_, index) => ({
  roundId: String(index), roundType: 'exact', correct, responseMs, difficulty: 2, score: 100,
}));

describe('Pattern Shift engine', () => {
  test('generation is deterministic', () => expect(generatePattern(42, 5)).toEqual(generatePattern(42, 5)));
  test.each(['exact', 'recall', 'missing', 'mirror', 'rotation', 'sequence'] as const)('%s has exactly one valid answer', type => {
    const round = createRound({ seed: 91, index: 1, tier: 8, type });
    expect(round.candidates.filter(candidate => candidate.id === round.correctCandidateId)).toHaveLength(1);
    expect(new Set(round.candidates.map(patternSignature)).size).toBe(round.candidates.length);
  });
  test('distractors differ from answer', () => {
    const round = createRound({ seed: 12, index: 2, tier: 4, type: 'exact' });
    const answer = round.candidates.find(item => item.id === round.correctCandidateId)!;
    expect(round.candidates.filter(item => item.id !== answer.id).every(item => patternSignature(item) !== patternSignature(answer))).toBe(true);
  });
  test('difficulty responds only to a stable performance window', () => {
    expect(adaptDifficulty(3, results(true))).toBe(4);
    expect(adaptDifficulty(3, results(false))).toBe(2);
    expect(adaptDifficulty(3, results(true).slice(0, 2))).toBe(3);
  });
  test('score rewards speed, difficulty and streak', () => {
    expect(scoreRound(true, 1000, 5, 5, 8000)).toBeGreaterThan(scoreRound(true, 5000, 2, 0, 8000));
    expect(scoreRound(false, 100, 8, 10, 8000)).toBe(0);
  });
  test('xp levels repeatedly and unlocks mechanics', () => {
    expect(applyXp(1, 0, 700).level).toBeGreaterThan(1);
    expect(unlockedTypes(8)).toEqual(expect.arrayContaining(['recall', 'missing', 'mirror', 'rotation', 'sequence']));
    expect(chooseRoundType(12, 8, 4)).toBe('sequence');
  });
  test('invalid short sessions are not record eligible and duplicate records are ignored', () => {
    expect(isValidSession(results(true))).toBe(false);
    const many = [...results(true), ...results(true)];
    const record = buildSessionRecord({ id: 'one', startedAt: 'a', completedAt: 'b', results: many, bestStreak: 10, levelBefore: 1, xpBefore: 0 });
    const once = applySession(freshPatternShiftProgress(), record);
    expect(applySession(once, record)).toEqual(once);
    expect(once.completedSessions).toBe(1);
  });
});
