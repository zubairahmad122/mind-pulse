import {
  adjustChallengeDifficulty,
  changedDimensions,
  createStartingProfile,
  difficultyVectorAt,
  familyPoolFor,
  generateNextPersonalChallenge,
  SCHULTE_LADDER_MAX_INDEX,
  validateChallenge,
  type SchulteFamily,
  type SchulteNexusProfile,
} from '../index';
import { cleanResult, errorHeavyResult, profileAt, scrappyResult } from './helpers';

describe('generateNextPersonalChallenge — starting out', () => {
  it('gives a new player a gentle challenge', () => {
    const { challenge, ladderIndex } = generateNextPersonalChallenge(
      createStartingProfile(),
      [],
      1,
    );

    expect(ladderIndex).toBe(0);
    expect(challenge.boardSize).toBe(3);
    expect(challenge.difficultyBand).toBe('gentle');
    expect(['ascending', 'descending']).toContain(challenge.family);
    expect(challenge.trapValues).toEqual([]);
    expect(challenge.transformRule.kind).toBe('none');
    expect(challenge.revealBehaviour.mode).toBe('always-visible');
    expect(challenge.phaseRules).toHaveLength(1);
    expect(challenge.targetSequence).toHaveLength(9);
    expect(validateChallenge(challenge)).toEqual({ valid: true, issues: [] });
  });

  it('is deterministic for the same profile and seed', () => {
    const profile = createStartingProfile();
    expect(generateNextPersonalChallenge(profile, [], 77).challenge).toEqual(
      generateNextPersonalChallenge(profile, [], 77).challenge,
    );
  });
});

describe('generateNextPersonalChallenge — completed signatures', () => {
  it('never returns a challenge the player has already completed', () => {
    const completed = new Set<string>();
    const profile = profileAt(4);

    for (let round = 0; round < 60; round++) {
      // Same profile, same seed, every round — the only way to keep producing
      // a fresh challenge is to actually honour the completed set.
      const { challenge } = generateNextPersonalChallenge(profile, completed, 9);

      expect(completed.has(challenge.signature)).toBe(false);
      completed.add(challenge.signature);
    }

    expect(completed.size).toBe(60);
  });

  it('accepts any iterable of signatures, not just a Set', () => {
    const profile = profileAt(6);
    const first = generateNextPersonalChallenge(profile, [], 3).challenge;
    const second = generateNextPersonalChallenge(profile, [first.signature], 3).challenge;

    expect(second.signature).not.toBe(first.signature);
  });
});

describe('generateNextPersonalChallenge — family variety', () => {
  it('never hands out the same family twice in a row', () => {
    let profile: SchulteNexusProfile = profileAt(9);

    for (let round = 0; round < 60; round++) {
      const next = generateNextPersonalChallenge(profile, [], round);
      const previousFamily = profile.recentFamilies[0];

      if (previousFamily !== undefined) {
        expect(next.challenge.family).not.toBe(previousFamily);
      }

      // A "scrappy" result holds the rung, so this loop stays on one pool.
      profile = {
        ladderIndex: next.ladderIndex,
        recentFamilies: next.recentFamilies,
        recentResults: [scrappyResult(next.challenge)],
      };
    }
  });

  it('avoids the last three families whenever the pool is large enough', () => {
    let profile: SchulteNexusProfile = profileAt(SCHULTE_LADDER_MAX_INDEX);
    const poolSize = familyPoolFor(difficultyVectorAt(SCHULTE_LADDER_MAX_INDEX)).length;
    expect(poolSize).toBeGreaterThan(3);

    const history: SchulteFamily[] = [];
    for (let round = 0; round < 60; round++) {
      const next = generateNextPersonalChallenge(profile, [], round * 31);

      expect(history.slice(-3)).not.toContain(next.challenge.family);
      history.push(next.challenge.family);

      profile = {
        ladderIndex: next.ladderIndex,
        recentFamilies: next.recentFamilies,
        recentResults: [scrappyResult(next.challenge)],
      };
    }
  });

  it('keeps a bounded family history', () => {
    let profile: SchulteNexusProfile = profileAt(9);
    for (let round = 0; round < 30; round++) {
      const next = generateNextPersonalChallenge(profile, [], round);
      profile = { ...profile, recentFamilies: next.recentFamilies };
    }
    expect(profile.recentFamilies.length).toBeLessThanOrEqual(8);
  });
});

describe('adjustChallengeDifficulty', () => {
  const challenge = generateNextPersonalChallenge(profileAt(8), [], 5).challenge;

  it('holds at the gentlest setup when there is no history', () => {
    expect(adjustChallengeDifficulty([])).toMatchObject({ direction: 'hold', delta: 0 });
  });

  it('advances one rung after a clean run', () => {
    expect(adjustChallengeDifficulty([cleanResult(challenge)])).toMatchObject({
      direction: 'advance',
      delta: 1,
    });
  });

  it('holds after a single error-heavy run', () => {
    expect(
      adjustChallengeDifficulty([errorHeavyResult(challenge), cleanResult(challenge)]),
    ).toMatchObject({ direction: 'hold', delta: 0 });
  });

  it('steps down after repeated error-heavy runs', () => {
    expect(
      adjustChallengeDifficulty([errorHeavyResult(challenge), errorHeavyResult(challenge)]),
    ).toMatchObject({ direction: 'step-down', delta: -1 });
  });

  it('treats overrunning the time limit as error-heavy even when completed', () => {
    const overtime = { ...cleanResult(challenge), durationMs: challenge.timeLimitMs + 1 };
    expect(adjustChallengeDifficulty([overtime])).toMatchObject({ direction: 'hold', delta: 0 });
    expect(adjustChallengeDifficulty([overtime, overtime])).toMatchObject({
      direction: 'step-down',
      delta: -1,
    });
  });

  it('holds a finished-but-messy run without stepping down', () => {
    expect(adjustChallengeDifficulty([scrappyResult(challenge)])).toMatchObject({
      direction: 'hold',
      delta: 0,
    });
  });

  it('only ever moves by a single rung', () => {
    const histories = [
      [],
      [cleanResult(challenge)],
      [scrappyResult(challenge)],
      [errorHeavyResult(challenge)],
      [errorHeavyResult(challenge), errorHeavyResult(challenge)],
      [errorHeavyResult(challenge), errorHeavyResult(challenge), errorHeavyResult(challenge)],
    ];
    for (const history of histories) {
      expect(Math.abs(adjustChallengeDifficulty(history).delta)).toBeLessThanOrEqual(1);
    }
  });
});

describe('escalation, holding and de-escalation end to end', () => {
  it('climbs exactly one rung per clean run, changing one dimension at a time', () => {
    let profile: SchulteNexusProfile = createStartingProfile();
    let previousIndex = 0;

    for (let round = 0; round < SCHULTE_LADDER_MAX_INDEX; round++) {
      const next = generateNextPersonalChallenge(profile, [], round);

      expect(next.ladderIndex).toBe(previousIndex + (round === 0 ? 0 : 1));
      if (round > 0) {
        expect(
          changedDimensions(difficultyVectorAt(previousIndex), difficultyVectorAt(next.ladderIndex)),
        ).toHaveLength(1);
      }

      previousIndex = next.ladderIndex;
      profile = {
        ladderIndex: next.ladderIndex,
        recentFamilies: next.recentFamilies,
        recentResults: [cleanResult(next.challenge)],
      };
    }
  });

  it('stops at the top rung instead of running off the ladder', () => {
    let profile: SchulteNexusProfile = profileAt(SCHULTE_LADDER_MAX_INDEX);
    for (let round = 0; round < 5; round++) {
      const next = generateNextPersonalChallenge(profile, [], round);
      expect(next.ladderIndex).toBe(SCHULTE_LADDER_MAX_INDEX);
      profile = {
        ladderIndex: next.ladderIndex,
        recentFamilies: next.recentFamilies,
        recentResults: [cleanResult(next.challenge)],
      };
    }
  });

  it('holds the rung after one error-heavy run', () => {
    const startIndex = 7;
    const played = generateNextPersonalChallenge(profileAt(startIndex), [], 1).challenge;

    const next = generateNextPersonalChallenge(
      profileAt(startIndex, { recentResults: [errorHeavyResult(played)] }),
      [],
      2,
    );

    expect(next.adjustment.direction).toBe('hold');
    expect(next.ladderIndex).toBe(startIndex);
    expect(next.challenge.boardSize).toBe(difficultyVectorAt(startIndex).boardSize);
  });

  it('steps down one rung at a time while error-heavy runs keep coming', () => {
    let profile: SchulteNexusProfile = profileAt(SCHULTE_LADDER_MAX_INDEX);
    const seen: number[] = [];

    for (let round = 0; round < 6; round++) {
      const next = generateNextPersonalChallenge(profile, [], round);
      seen.push(next.ladderIndex);

      const result = errorHeavyResult(next.challenge);
      profile = {
        ladderIndex: next.ladderIndex,
        recentFamilies: next.recentFamilies,
        recentResults: [result, ...profile.recentResults].slice(0, 4),
      };
    }

    // First round has no history (hold), the second holds on one bad run, then
    // every further round steps down by exactly one.
    expect(seen).toEqual([15, 15, 14, 13, 12, 11]);
  });

  it('never steps below the gentlest rung', () => {
    let profile: SchulteNexusProfile = profileAt(1);
    for (let round = 0; round < 10; round++) {
      const next = generateNextPersonalChallenge(profile, [], round);
      expect(next.ladderIndex).toBeGreaterThanOrEqual(0);
      profile = {
        ladderIndex: next.ladderIndex,
        recentFamilies: next.recentFamilies,
        recentResults: [
          errorHeavyResult(next.challenge),
          errorHeavyResult(next.challenge),
        ],
      };
    }
    expect(profile.ladderIndex).toBe(0);
  });
});
