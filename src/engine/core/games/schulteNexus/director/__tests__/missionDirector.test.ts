import { validateChallenge } from '../../validate';
import type { SchulteChallenge, SchulteFamily } from '../../types';
import {
  changedDirectorDimensions,
  DIRECTOR_LADDER,
} from '../ladder';
import { calculateAdaptiveTimeLimit } from '../timer';
import { calculateNoveltyScore, createSemanticKey, shouldRejectCandidate } from '../novelty';
import { calculateFamilyMastery } from '../mastery';
import { calculateOverallRating } from '../rating';
import { buildPersonalMissionSeed } from '../seed';
import {
  createStartingSkillProfile,
  interpretRecentPerformance,
  recordMissionAttempt,
  selectNextMission,
  stepDirectionFor,
} from '../missionDirector';
import type { SchulteMissionAttempt, SchultePlayerSkillProfile } from '../types';

function attempt(
  challenge: SchulteChallenge,
  overrides: Partial<Omit<SchulteMissionAttempt, 'wasPersonalBest'>> = {},
): Omit<SchulteMissionAttempt, 'wasPersonalBest'> {
  const total = challenge.targetSequence.length;
  return {
    challengeId: challenge.id,
    challengeSignature: challenge.signature,
    generatorVersion: challenge.version,
    seed: challenge.seed,
    family: challenge.family,
    rows: challenge.boardSize,
    columns: challenge.columns ?? challenge.boardSize,
    targetCount: total,
    activeValueCount: challenge.activeValues.length,
    targetSequence: challenge.targetSequence,
    timeLimitMs: challenge.timeLimitMs,
    completionTimeMs: Math.round(challenge.timeLimitMs * 0.5),
    remainingTimeMs: Math.round(challenge.timeLimitMs * 0.5),
    mistakes: 0,
    allowedMistakes: challenge.maximumErrors,
    correctTaps: total,
    totalRequiredTaps: total,
    accuracy: 1,
    result: 'completed',
    difficulty: DIRECTOR_LADDER[0],
    startedAt: 0,
    completedAt: challenge.timeLimitMs,
    ...overrides,
  };
}

function playMissions(
  profile: SchultePlayerSkillProfile,
  userStableId: string,
  count: number,
  makeAttempt: (challenge: SchulteChallenge) => Partial<Omit<SchulteMissionAttempt, 'wasPersonalBest'>>,
): SchultePlayerSkillProfile {
  let current = profile;
  for (let i = 0; i < count; i++) {
    const { challenge } = selectNextMission({ profile: current, userStableId, mode: 'next' });
    const { profile: next } = recordMissionAttempt(current, attempt(challenge, makeAttempt(challenge)));
    current = next;
  }
  return current;
}

describe('Adaptive Mission Director', () => {
  it('1. first-time player receives a gentle calibration mission (3×3 ascending, generous timer)', () => {
    const profile = createStartingSkillProfile();
    const { challenge } = selectNextMission({ profile, userStableId: 'user-a', mode: 'next' });
    expect(challenge.boardSize).toBe(3);
    expect(challenge.columns ?? challenge.boardSize).toBe(3);
    expect(challenge.family).toBe('ascending');
    expect(challenge.targetSequence).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(challenge.timeLimitMs).toBeGreaterThanOrEqual(30_000);
  });

  it('calibration mission 2 is descending, mission 3 is a larger/different mission', () => {
    const profile = createStartingSkillProfile();
    const m1 = selectNextMission({ profile, userStableId: 'user-a', mode: 'next' });
    const p1 = recordMissionAttempt(profile, attempt(m1.challenge)).profile;
    const m2 = selectNextMission({ profile: p1, userStableId: 'user-a', mode: 'next' });
    expect(m2.challenge.family).toBe('descending');
    expect(m2.challenge.targetSequence).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);

    const p2 = recordMissionAttempt(p1, attempt(m2.challenge)).profile;
    const m3 = selectNextMission({ profile: p2, userStableId: 'user-a', mode: 'next' });
    expect(m3.challenge.targetSequence.length).toBeGreaterThan(9);
  });

  it('18/19. complicated mechanics and non-positive numbers are not given to first-time players', () => {
    const profile = createStartingSkillProfile();
    for (let i = 0; i < 3; i++) {
      const { challenge } = selectNextMission({ profile, userStableId: 'user-a', mode: 'next' });
      expect(['ascending', 'descending']).toContain(challenge.family);
      expect(challenge.activeValues.every(v => v > 0)).toBe(true);
    }
  });

  it('2/3. strong repeated performance escalates difficulty one ladder step (one dimension) at a time', () => {
    let profile = playMissions(createStartingSkillProfile(), 'strong-player', 3, () => ({})); // calibration
    const before = profile.ladderIndex;
    profile = playMissions(profile, 'strong-player', 5, challenge => ({
      mistakes: 0,
      correctTaps: challenge.targetSequence.length,
      completionTimeMs: Math.round(challenge.timeLimitMs * 0.3),
      remainingTimeMs: Math.round(challenge.timeLimitMs * 0.7),
    }));
    expect(profile.ladderIndex).toBeGreaterThan(before);
    expect(profile.ladderIndex).toBeLessThanOrEqual(before + 5);

    const changed = changedDirectorDimensions(DIRECTOR_LADDER[before], DIRECTOR_LADDER[before + 1]);
    expect(changed.length).toBe(1);
  });

  it('4. accurate-but-slow is handled differently from fast-but-mistake-prone', () => {
    const accurateSlow = [
      { mistakes: 0, remainingTimeMs: 100, completionTimeMs: 0 },
      { mistakes: 0, remainingTimeMs: 100, completionTimeMs: 0 },
      { mistakes: 0, remainingTimeMs: 100, completionTimeMs: 0 },
    ].map((o, i) => ({ ...attempt(sampleChallenge(), o), completedAt: i })) as unknown as SchulteMissionAttempt[];
    const fastMistakeProne = [
      { mistakes: 2, remainingTimeMs: 20000, completionTimeMs: 5000 },
      { mistakes: 2, remainingTimeMs: 20000, completionTimeMs: 5000 },
      { mistakes: 2, remainingTimeMs: 20000, completionTimeMs: 5000 },
    ].map((o, i) => ({ ...attempt(sampleChallenge(), o), completedAt: i })) as unknown as SchulteMissionAttempt[];

    expect(interpretRecentPerformance(accurateSlow)).toBe('accurateSlow');
    expect(interpretRecentPerformance(fastMistakeProne)).toBe('fastMistakeProne');
    expect(interpretRecentPerformance(accurateSlow)).not.toBe(interpretRecentPerformance(fastMistakeProne));
  });

  it('5/6. first failure holds difficulty; repeated failures step down', () => {
    const failed = attempt(sampleChallenge(), { result: 'failedMistakes', correctTaps: 2 });
    expect(stepDirectionFor('mixed', [failed as SchulteMissionAttempt])).toBe('hold');
    expect(stepDirectionFor('mixed', [failed as SchulteMissionAttempt, failed as SchulteMissionAttempt])).toBe('stepDown');
  });

  it('7. no mission generated by the director ever exceeds 60 seconds', () => {
    for (const vector of DIRECTOR_LADDER) {
      for (const targetCount of [7, 13, 21, 25]) {
        expect(calculateAdaptiveTimeLimit(vector, targetCount)).toBeLessThanOrEqual(60_000);
      }
    }
  });

  it('8/9/10. completed signature never resurfaces; failed mission can be retried exactly; success requests a fresh one', () => {
    const profile = createStartingSkillProfile();
    const { challenge: c0 } = selectNextMission({ profile, userStableId: 'u', mode: 'next' });
    const { profile: afterFail } = recordMissionAttempt(
      profile,
      attempt(c0, { result: 'failedMistakes', correctTaps: 3 }),
    );

    const retried = selectNextMission({ profile: afterFail, userStableId: 'u', mode: 'retry', lastChallenge: c0 });
    expect(retried.challenge.signature).toBe(c0.signature);

    const { profile: afterPass } = recordMissionAttempt(afterFail, attempt(c0));
    expect(afterPass.completedSignatures).toContain(c0.signature);

    const nextAfterSuccess = selectNextMission({ profile: afterPass, userStableId: 'u', mode: 'next' });
    expect(nextAfterSuccess.challenge.signature).not.toBe(c0.signature);
  });

  it('11/12. recent family and grid-shape repetition are avoided when alternatives exist', () => {
    const profile = playMissions(createStartingSkillProfile(), 'novelty-user', 6, () => ({}));
    const meta = profile.recentAttempts.slice(0, 4);
    const allSameFamily = meta.every(a => a.family === meta[0].family);
    const allSameGeometry = meta.every(a => a.rows === meta[0].rows && a.columns === meta[0].columns);
    expect(allSameFamily).toBe(false);
    expect(allSameGeometry).toBe(false);
  });

  it('13. same user + same profile state + same seed input is fully deterministic', () => {
    const profile = createStartingSkillProfile();
    const a = selectNextMission({ profile, userStableId: 'det-user', mode: 'next' });
    const b = selectNextMission({ profile, userStableId: 'det-user', mode: 'next' });
    expect(a.challenge).toEqual(b.challenge);
  });

  it('14. different user identity produces a different board permutation at equivalent difficulty', () => {
    const profile = createStartingSkillProfile();
    const a = selectNextMission({ profile, userStableId: 'user-a', mode: 'next' });
    const b = selectNextMission({ profile, userStableId: 'user-b', mode: 'next' });
    expect(a.challenge.boardPositions).not.toEqual(b.challenge.boardPositions);
  });

  it('15. personal mission history affects future selection (ladder rung persists across calls)', () => {
    const boosted = playMissions(createStartingSkillProfile(), 'history-user', 4, () => ({
      mistakes: 0,
      completionTimeMs: 1000,
      remainingTimeMs: 100000,
    }));
    expect(boosted.ladderIndex).toBeGreaterThan(0);
    const { ladderIndex } = selectNextMission({ profile: boosted, userStableId: 'history-user', mode: 'next' });
    expect(ladderIndex).toBeGreaterThanOrEqual(boosted.ladderIndex - 1);
  });

  it('16. timer tightens gradually for demonstrated mastery, never below the fair floor', () => {
    const vector = DIRECTOR_LADDER[4];
    const fresh = calculateAdaptiveTimeLimit(vector, 12, 0);
    const mastered = calculateAdaptiveTimeLimit(vector, 12, 90);
    expect(mastered).toBeLessThan(fresh);
    expect(mastered).toBeGreaterThanOrEqual(8000);
  });

  it('17. timer is not the only escalation mechanism — a rung-up can leave timePressure unchanged', () => {
    const rungWithoutTimeChange = DIRECTOR_LADDER.findIndex(
      (v, i) => i > 0 && v.timePressure === DIRECTOR_LADDER[i - 1].timePressure,
    );
    expect(rungWithoutTimeChange).toBeGreaterThan(0);
  });

  it('20. negative numbers stay disabled for normal mission selection', () => {
    const profile = { ...createStartingSkillProfile(), missionIndex: 5, ladderIndex: 10 };
    const { challenge } = selectNextMission({ profile, userStableId: 'expert-bound', mode: 'next' });
    expect(challenge.activeValues.every(v => v > 0)).toBe(true);
    expect(profile.allowNegativeNumbers).toBe(false);
  });

  it('21/22/23. every director-selected challenge validates, including odd target counts and neutral cells', () => {
    const targetCounts: number[] = [];
    let profile = createStartingSkillProfile();
    for (let i = 0; i < 15; i++) {
      const { challenge } = selectNextMission({ profile, userStableId: 'validation-user', mode: 'next' });
      expect(validateChallenge(challenge)).toEqual({ valid: true, issues: [] });
      targetCounts.push(challenge.targetSequence.length);
      const cellCount = challenge.boardSize * (challenge.columns ?? challenge.boardSize);
      expect(challenge.targetSequence.length).toBeLessThanOrEqual(cellCount);
      profile = recordMissionAttempt(profile, attempt(challenge)).profile;
    }
    expect(targetCounts.some(c => c > 9)).toBe(true);
  });

  it('24. family mastery updates correctly across attempts', () => {
    const c = sampleChallenge();
    const first = calculateFamilyMastery(undefined, attempt(c, { result: 'completed', mistakes: 0 }) as SchulteMissionAttempt);
    expect(first.plays).toBe(1);
    expect(first.completions).toBe(1);
    expect(first.cleanCompletions).toBe(1);

    const second = calculateFamilyMastery(first, attempt(c, { result: 'failedMistakes', mistakes: 3, correctTaps: 4 }) as SchulteMissionAttempt);
    expect(second.plays).toBe(2);
    expect(second.failures).toBe(1);
    expect(second.currentMasteryScore).toBeLessThan(100);
  });

  it('25. overall rating updates deterministically and never drops on failure', () => {
    const c = sampleChallenge();
    const clean = attempt(c, { mistakes: 0, remainingTimeMs: c.timeLimitMs * 0.5 }) as SchulteMissionAttempt;
    const r1 = calculateOverallRating(0, clean);
    const r2 = calculateOverallRating(0, clean);
    expect(r1).toBe(r2);
    expect(r1).toBeGreaterThan(0);

    const failed = attempt(c, { result: 'failedMistakes', correctTaps: 2 }) as SchulteMissionAttempt;
    expect(calculateOverallRating(r1, failed)).toBe(r1);
  });

  it('novelty scoring penalizes back-to-back repeats and hard-rejects completed signatures', () => {
    const targetSequence = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const semanticKey = createSemanticKey('ascending', targetSequence, 9);
    const meta = { family: 'ascending' as SchulteFamily, geometry: '3x3', targetCount: 9, direction: 'asc' as const, band: 'quick' as const, semanticKey };
    const scoreNoHistory = calculateNoveltyScore(meta, []);
    const scoreWithRepeat = calculateNoveltyScore(meta, [meta, meta, meta]);
    expect(scoreWithRepeat).toBeLessThan(scoreNoHistory);
    expect(shouldRejectCandidate('sig-1', ['sig-1', 'sig-2'])).toBe(true);
    expect(shouldRejectCandidate('sig-3', ['sig-1', 'sig-2'])).toBe(false);
  });

  it('buildPersonalMissionSeed is deterministic per (user, missionIndex, version, salt)', () => {
    expect(buildPersonalMissionSeed('u1', 2, 1, 0)).toBe(buildPersonalMissionSeed('u1', 2, 1, 0));
    expect(buildPersonalMissionSeed('u1', 2, 1, 0)).not.toBe(buildPersonalMissionSeed('u2', 2, 1, 0));
  });
});

function sampleChallenge(): SchulteChallenge {
  const { challenge } = selectNextMission({ profile: createStartingSkillProfile(), userStableId: 'sample', mode: 'next' });
  return challenge;
}
