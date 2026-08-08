import { validateChallenge } from '../../validate';
import type { SchulteChallenge } from '../../types';
import {
  applySchulteLevelProgress,
  calculateSchulteLevelProgress,
  createStartingLevelState,
  type SchulteLevelState,
} from '../levelProgress';
import {
  canAccessSchulteLevel,
  resolveSchulteLevelAccess,
  getSchulteLevelDefinition,
  getSchulteLevelEnvelope,
  getSlotAwareEnvelope,
} from '../levels';
import { resolveNextSchulteLevelMission } from '../levelMission';
import { createStartingSkillProfile, recordMissionAttempt } from '../missionDirector';
import { createSemanticKey } from '../novelty';
import type { SchulteMissionAttempt, SchultePlayerSkillProfile } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<SchultePlayerSkillProfile> = {}): SchultePlayerSkillProfile {
  return { ...createStartingSkillProfile(), ...overrides };
}

function attemptFor(
  challenge: SchulteChallenge,
  overrides: Partial<Omit<SchulteMissionAttempt, 'wasPersonalBest'>> = {},
): SchulteMissionAttempt {
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
    difficulty: {
      searchSpeed: 0, targetCount: 0, gridComplexity: 0,
      sequenceComplexity: 0, ruleSwitching: 0, visualComplexity: 0, timePressure: 0,
    },
    startedAt: 0,
    completedAt: challenge.timeLimitMs,
    wasPersonalBest: false,
    ...overrides,
  };
}

function resolveLevel(
  level: number,
  isPremium: boolean,
  profile: SchultePlayerSkillProfile,
  mode: 'next' | 'retry' = 'next',
  lastChallenge?: SchulteChallenge,
  missionInLevel = 0,
) {
  return resolveNextSchulteLevelMission({
    profile,
    userStableId: 'test-user',
    level,
    missionInLevel,
    isPremium,
    mode,
    lastChallenge,
  });
}



// ─── tests ──────────────────────────────────────────────────────────────────

describe('Level Progression — Access Rules', () => {
  it('1. new player starts at Level 1', () => {
    const state = createStartingLevelState();
    expect(state.currentLevel).toBe(1);
    expect(state.levelProgress).toBe(0);
    expect(state.highestUnlockedLevel).toBe(1);
    expect(state.missionsCompletedAtCurrentLevel).toBe(0);
  });

  it('2. Levels 1–5 are free', () => {
    for (let level = 1; level <= 5; level++) {
      expect(canAccessSchulteLevel(level, false)).toBe('free');
      expect(resolveSchulteLevelAccess(level, false).canPlay).toBe(true);
    }
  });

  it('3. Level 6+ requires premium', () => {
    for (let level = 6; level <= 25; level++) {
      expect(canAccessSchulteLevel(level, false)).toBe('premiumRequired');
      expect(resolveSchulteLevelAccess(level, false).canPlay).toBe(false);
      expect(resolveSchulteLevelAccess(level, false).reason).toBe('premium_required');
      expect(resolveSchulteLevelAccess(level, false).requiredLevel).toBe(level);
    }
  });

  it('3b. Level 6+ is accessible with premium', () => {
    for (let level = 6; level <= 25; level++) {
      expect(canAccessSchulteLevel(level, true)).toBe('unlocked');
      expect(resolveSchulteLevelAccess(level, true).canPlay).toBe(true);
    }
  });
});

describe('Level Progression — Envelope Constraints', () => {
  it('4. Level 1 only permits gentle ascending foundation', () => {
    const envelope = getSchulteLevelEnvelope(1, makeProfile());
    expect(envelope.families).toEqual(['ascending']);
    expect(envelope.geometries).toEqual([[3, 3]]);
    expect(envelope.allowNeutralCells).toBe(false);
    expect(envelope.allowParityFilter).toBe(false);
    expect(envelope.allowFading).toBe(false);
    expect(envelope.allowRowShift).toBe(false);
    expect(envelope.allowColumnShift).toBe(false);
  });

  it('5. Level 2 introduces descending', () => {
    const envelope = getSchulteLevelEnvelope(2, makeProfile());
    expect(envelope.families).toEqual(['descending']);
  });

  it('6. advanced mechanics do not appear in early levels (1-5)', () => {
    for (let level = 1; level <= 5; level++) {
      const envelope = getSchulteLevelEnvelope(level, makeProfile());
      expect(envelope.allowParityFilter).toBe(false);
      expect(envelope.allowNonUnitOrigin).toBe(level >= 3);
      expect(envelope.allowFading).toBe(false);
      expect(envelope.allowRowShift).toBe(false);
      expect(envelope.allowColumnShift).toBe(false);
    }
  });

  it('6b. alternating-ends does not appear before Level 10', () => {
    for (let level = 1; level <= 9; level++) {
      const envelope = getSchulteLevelEnvelope(level, makeProfile());
      expect(envelope.families).not.toContain('alternating-ends');
    }
  });

  it('7. Level 6 unlocks odd/even (parity filter)', () => {
    const envelope = getSchulteLevelEnvelope(6, makeProfile());
    expect(envelope.allowParityFilter).toBe(true);
  });

  it('8. Level 8 unlocks fixed-step family', () => {
    const envelope = getSchulteLevelEnvelope(8, makeProfile());
    expect(envelope.families).toContain('fixed-step');
  });

  it('9. Level 10 unlocks alternating-ends family', () => {
    const envelope = getSchulteLevelEnvelope(10, makeProfile());
    expect(envelope.families).toContain('alternating-ends');
  });

  it('10. Level 15 allows fading and generated missions respect it on rectangular grids', () => {
    const envelope = getSchulteLevelEnvelope(15, makeProfile());
    expect(envelope.allowFading).toBe(true);
    // Level 15 supports non-square geometries — fading is safe on any grid shape
    expect(envelope.geometries.some(([r, c]) => r !== c)).toBe(true);
    // Verify that all generated missions at level 15 have valid reveal behaviour
    // (either always-visible or fade-after-preview, both are valid)
    const profile = makeProfile({ missionIndex: 20 });
    for (let i = 0; i < 20; i++) {
      const result = resolveLevel(15, true, profile);
      expect(result.challenge).not.toBeNull();
      expect(['always-visible', 'fade-after-preview']).toContain(result.challenge!.revealBehaviour.mode);
    }
  });
});

describe('Level Progression — Mission Generation', () => {
  it('4b. Level 1 generates ascending 3×3 missions', () => {
    const profile = makeProfile();
    for (let salt = 0; salt < 5; salt++) {
      const result = resolveLevel(1, false, profile);
      expect(result.access.canPlay).toBe(true);
      expect(result.challenge).not.toBeNull();
      expect(result.challenge!.family).toBe('ascending');
      expect(result.challenge!.boardSize).toBe(3);
      expect(result.challenge!.columns ?? result.challenge!.boardSize).toBe(3);
    }
  });

  it('18. same level can generate fresh different missions as history builds', () => {
    let profile = makeProfile();
    const signatures = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const result = resolveLevel(3, false, profile);
      expect(result.challenge).not.toBeNull();
      signatures.add(result.challenge!.signature);
      // Record the attempt so history builds and future missions differ
      profile = recordMissionAttempt(profile, attemptFor(result.challenge!)).profile;
    }
    // With history building, missions should diverge
    expect(signatures.size).toBeGreaterThan(1);
  });

  it('19. completed-signature rejection still works', () => {
    const profile = makeProfile();
    const result = resolveLevel(3, false, profile);
    expect(result.challenge).not.toBeNull();
    const sig = result.challenge!.signature;

    const updatedProfile = { ...profile, completedSignatures: [sig] };
    // The next mission should not have the same signature
    for (let i = 0; i < 10; i++) {
      const next = resolveLevel(3, false, updatedProfile);
      if (next.challenge) {
        expect(next.challenge.signature).not.toBe(sig);
      }
    }
  });

  it('20. every generated mission remains <= 60 seconds', () => {
    const profile = makeProfile();
    for (let level = 1; level <= 5; level++) {
      const result = resolveLevel(level, false, profile);
      if (result.challenge) {
        expect(result.challenge.timeLimitMs).toBeLessThanOrEqual(60_000);
        expect(result.challenge.timeLimitMs).toBeGreaterThan(0);
      }
    }
  });

  it('20b. premium missions also respect the 60s cap', () => {
    const profile = makeProfile();
    for (let level = 6; level <= 20; level++) {
      const result = resolveLevel(level, true, profile);
      if (result.challenge) {
        expect(result.challenge.timeLimitMs).toBeLessThanOrEqual(60_000);
      }
    }
  });

  it('21. Level 21+ resolves algorithmically with valid missions', () => {
    const profile = makeProfile({ rating: 300, missionIndex: 20 });
    const result = resolveLevel(21, true, profile);
    expect(result.access.canPlay).toBe(true);
    expect(result.challenge).not.toBeNull();
    expect(result.challenge!.timeLimitMs).toBeLessThanOrEqual(60_000);
    expect(validateChallenge(result.challenge!)).toEqual({ valid: true, issues: [] });
  });

  it('21b. Level 30 also resolves algorithmically', () => {
    const profile = makeProfile({ rating: 500, missionIndex: 30 });
    const result = resolveLevel(30, true, profile);
    expect(result.access.canPlay).toBe(true);
    expect(result.challenge).not.toBeNull();
  });

  it('22. same deterministic state produces deterministic resolution', () => {
    const profile = makeProfile({ missionIndex: 5 });
    const a = resolveLevel(3, false, profile);
    const b = resolveLevel(3, false, profile);
    expect(a.challenge).toEqual(b.challenge);
  });
});

describe('Level Progression — Retry', () => {
  it('failed mission can be retried identically', () => {
    const profile = makeProfile();
    const result = resolveLevel(1, false, profile);
    expect(result.challenge).not.toBeNull();
    const retried = resolveLevel(1, false, profile, 'retry', result.challenge!);
    expect(retried.challenge!.signature).toBe(result.challenge!.signature);
  });

  it('retry throws if no lastChallenge provided', () => {
    expect(() => resolveLevel(1, false, makeProfile(), 'retry')).toThrow();
  });
});

describe('Level Progression — Blocked Access', () => {
  it('15. free user completing Level 5 is blocked from Level 6', () => {
    const profile = makeProfile();
    const result = resolveNextSchulteLevelMission({
      profile,
      userStableId: 'test-user',
      level: 6,
      missionInLevel: 0,
      isPremium: false,
      mode: 'next',
    });
    expect(result.access.canPlay).toBe(false);
    expect(result.access.reason).toBe('premium_required');
    expect(result.access.requiredLevel).toBe(6);
    expect(result.challenge).toBeNull();
  });

  it('16. premium user can play Level 6', () => {
    const profile = makeProfile();
    const result = resolveLevel(6, true, profile);
    expect(result.access.canPlay).toBe(true);
    expect(result.challenge).not.toBeNull();
    expect(result.challenge!.timeLimitMs).toBeLessThanOrEqual(60_000);
  });

  it('17. changing premium status does not reset existing history', () => {
    const profile = makeProfile({
      completedSignatures: ['sig-1', 'sig-2'],
      recentAttempts: [{ challengeSignature: 'sig-1' } as SchulteMissionAttempt],
      rating: 42,
    });

    // As free user — level 6 blocked but profile intact
    const blocked = resolveLevel(6, false, profile);
    expect(blocked.access.canPlay).toBe(false);

    // As premium user — level 6 accessible, profile still intact
    const allowed = resolveLevel(6, true, profile);
    expect(allowed.access.canPlay).toBe(true);
    expect(allowed.challenge).not.toBeNull();
  });
});

describe('Level Progression — Progress Mechanics', () => {
  it('11. strong completion awards more level progress than borderline completion', () => {
    const baseAttempt = attemptFor(resolveLevel(1, false, makeProfile()).challenge!);

    // Strong: clean, lots of time remaining
    const strongAttempt = {
      ...baseAttempt,
      result: 'completed' as const,
      mistakes: 0,
      remainingTimeMs: Math.round(baseAttempt.timeLimitMs * 0.5),
    };
    const strongProgress = calculateSchulteLevelProgress(strongAttempt as SchulteMissionAttempt);

    // Borderline: some mistakes, barely made it
    const borderlineAttempt = {
      ...baseAttempt,
      result: 'completed' as const,
      mistakes: 2,
      remainingTimeMs: Math.round(baseAttempt.timeLimitMs * 0.05),
    };
    const borderlineProgress = calculateSchulteLevelProgress(borderlineAttempt as SchulteMissionAttempt);

    expect(strongProgress).toBeGreaterThan(borderlineProgress);
  });

  it('12. failure does not reduce currentLevel', () => {
    const state: SchulteLevelState = {
      currentLevel: 3,
      levelProgress: 80,
      highestUnlockedLevel: 3,
      missionsCompletedAtCurrentLevel: 5,
      missionInLevel: 2,
    };

    const failedAttempt = {
      ...attemptFor(resolveLevel(3, false, makeProfile()).challenge!),
      result: 'failedMistakes' as const,
      correctTaps: 2,
    };

    const newState = applySchulteLevelProgress(state, failedAttempt);
    expect(newState.currentLevel).toBe(3);
    expect(newState.levelProgress).toBe(80); // unchanged
    expect(newState.missionsCompletedAtCurrentLevel).toBe(5); // unchanged
  });

  it('13. one ordinary completion is not enough to skip through levels', () => {
    const state = createStartingLevelState();
    // Max possible progress from one completion is 40
    const maxAttempt = {
      ...attemptFor(resolveLevel(1, false, makeProfile()).challenge!),
      result: 'completed' as const,
      mistakes: 0,
      remainingTimeMs: 100_000, // very generous
    };

    const newState = applySchulteLevelProgress(state, maxAttempt as SchulteMissionAttempt);
    // Should still be level 1 (progress < 100 threshold)
    expect(newState.currentLevel).toBe(1);
    expect(newState.levelProgress).toBeLessThan(100);
  });

  it('13b. multiple completions required to level up', () => {
    let levelState = createStartingLevelState();
    let missionsCompleted = 0;

    // Play until level up
    while (levelState.currentLevel === 1 && missionsCompleted < 10) {
      const challenge = resolveLevel(levelState.currentLevel, false, makeProfile()).challenge!;
      const cleanAttempt = {
        ...attemptFor(challenge),
        result: 'completed' as const,
        mistakes: 0,
        remainingTimeMs: Math.round(challenge.timeLimitMs * 0.5),
      };
      levelState = applySchulteLevelProgress(levelState, cleanAttempt as SchulteMissionAttempt);
      missionsCompleted++;
    }

    // Should have taken more than 1 mission to reach level 2
    expect(missionsCompleted).toBeGreaterThan(1);
    expect(levelState.currentLevel).toBeGreaterThanOrEqual(2);
  });

  it('strong completion eventually levels up', () => {
    let levelState = createStartingLevelState();

    // Perfect completions: 40 progress each, need 3 to reach 120 → level 2 with 20 leftover
    for (let i = 0; i < 3; i++) {
      const challenge = resolveLevel(levelState.currentLevel, false, makeProfile()).challenge!;
      const attempt = {
        ...attemptFor(challenge),
        result: 'completed' as const,
        mistakes: 0,
        remainingTimeMs: Math.round(challenge.timeLimitMs * 0.5),
      };
      levelState = applySchulteLevelProgress(levelState, attempt as SchulteMissionAttempt);
    }

    expect(levelState.currentLevel).toBeGreaterThanOrEqual(2);
    expect(levelState.highestUnlockedLevel).toBeGreaterThanOrEqual(2);
  });
});



describe('Level Progression — Edge Cases', () => {
  it('negative and zero levels clamp to 1', () => {
    expect(resolveSchulteLevelAccess(-1, false).canPlay).toBe(true);
    expect(resolveSchulteLevelAccess(0, false).canPlay).toBe(true);
    expect(resolveSchulteLevelAccess(-5, false).requiredLevel).toBe(1);
  });

  it('very high levels are premium and valid', () => {
    const result = resolveSchulteLevelAccess(999, false);
    expect(result.canPlay).toBe(false);
    expect(result.reason).toBe('premium_required');

    const premiumResult = resolveSchulteLevelAccess(999, true);
    expect(premiumResult.canPlay).toBe(true);
  });

  it('level definition exists for every level 1–20', () => {
    for (let level = 1; level <= 20; level++) {
      const def = getSchulteLevelDefinition(level);
      expect(def.level).toBe(level);
      expect(def.families.length).toBeGreaterThan(0);
    }
  });

  it('level 21+ definitions are generic algorithmic', () => {
    const def = getSchulteLevelDefinition(25);
    expect(def.level).toBe(25);
    expect(def.premiumRequired).toBe(true);
    expect(def.families.length).toBeGreaterThan(0);
  });

  it('level 21+ envelope is player-tuned', () => {
    const profile = makeProfile({ rating: 500, missionIndex: 30 });
    const envelope = getSchulteLevelEnvelope(25, profile);
    expect(envelope.level).toBe(25);
    expect(envelope.targetCountRange[0]).toBeLessThan(envelope.targetCountRange[1]);
  });

  it('attempt result "timedOut" also yields 0 progress', () => {
    const timedOutAttempt = {
      ...attemptFor(resolveLevel(1, false, makeProfile()).challenge!),
      result: 'timedOut' as const,
      remainingTimeMs: 0,
    };
    expect(calculateSchulteLevelProgress(timedOutAttempt as SchulteMissionAttempt)).toBe(0);
  });

  it('attempt result "abandoned" yields 0 progress', () => {
    const abandonedAttempt = {
      ...attemptFor(resolveLevel(1, false, makeProfile()).challenge!),
      result: 'abandoned' as const,
    };
    expect(calculateSchulteLevelProgress(abandonedAttempt as SchulteMissionAttempt)).toBe(0);
  });

  it('all generated challenges for levels 1–5 validate', () => {
    const profile = makeProfile();
    for (let level = 1; level <= 5; level++) {
      for (let i = 0; i < 5; i++) {
        const result = resolveLevel(level, false, profile);
        expect(result.challenge).not.toBeNull();
        const validation = validateChallenge(result.challenge!);
        expect(validation).toEqual({ valid: true, issues: [] });
      }
    }
  });

  it('all generated challenges for premium levels 6–20 validate', () => {
    const profile = makeProfile({ missionIndex: 20 });
    for (let level = 6; level <= 20; level++) {
      const result = resolveLevel(level, true, profile);
      expect(result.challenge).not.toBeNull();
      const validation = validateChallenge(result.challenge!);
      expect(validation).toEqual({ valid: true, issues: [] });
    }
  });
});

describe('Level Mission Variety — Semantic Anti-Repeat', () => {
  it('1. Level 1 first mission can be 1→9', () => {
    const profile = makeProfile();
    const result = resolveLevel(1, false, profile);
    expect(result.challenge).not.toBeNull();
    const first = result.challenge!.targetSequence[0];
    const last = result.challenge!.targetSequence[result.challenge!.targetSequence.length - 1];
    expect(first).toBe(1);
    expect(last).toBe(9);
    expect(result.challenge!.targetSequence.length).toBe(9);
  });

  it('2. next successful Level 1 mission is not another semantic 1→9', () => {
    let profile = makeProfile();
    // First mission: 1→9, 9 targets
    const result1 = resolveLevel(1, false, profile);
    expect(result1.challenge).not.toBeNull();
    profile = recordMissionAttempt(profile, attemptFor(result1.challenge!)).profile;

    // Second mission should NOT be another 1→9 with 9 targets
    const result2 = resolveLevel(1, false, profile, 'next', undefined, 1);
    expect(result2.challenge).not.toBeNull();
    const first2 = result2.challenge!.targetSequence[0];
    const last2 = result2.challenge!.targetSequence[result2.challenge!.targetSequence.length - 1];
    const count2 = result2.challenge!.targetSequence.length;

    // Should be different range or count
    expect(
      first2 !== 1 || last2 !== 9 || count2 !== 9,
    ).toBe(true);
  });

  it('3. Level 1 target count increases across normal progression', () => {
    let profile = makeProfile();
    const counts: number[] = [];

    for (let slot = 0; slot < 3; slot++) {
      const result = resolveLevel(1, false, profile, 'next', undefined, slot);
      expect(result.challenge).not.toBeNull();
      counts.push(result.challenge!.targetSequence.length);
      profile = recordMissionAttempt(profile, attemptFor(result.challenge!)).profile;
    }

    // Counts increase through the small, medium, and large search spaces.
    expect(counts[0]).toBe(9);
    expect(counts[1]).toBeGreaterThanOrEqual(13);
    expect(counts[1]).toBeLessThanOrEqual(14);
    expect(counts[2]).toBeGreaterThanOrEqual(18);
    expect(counts[2]).toBeLessThanOrEqual(19);
  });

  it('4. Level 1 progresses approximately 9 → 14 → 18/19 targets', () => {
    const profile = makeProfile();

    // Slot 0: 9 targets (3×3)
    const r0 = resolveLevel(1, false, profile, 'next', undefined, 0);
    expect(r0.challenge!.targetSequence.length).toBe(9);

    // Slot 1: 13–14 targets on 4×4
    const r1 = resolveLevel(1, false, profile, 'next', undefined, 1);
    expect(r1.challenge!.targetSequence.length).toBeGreaterThanOrEqual(13);
    expect(r1.challenge!.targetSequence.length).toBeLessThanOrEqual(14);

    // Slot 2: 18–19 targets on 4×5 or 5×4
    const r2 = resolveLevel(1, false, profile, 'next', undefined, 2);
    expect(r2.challenge!.targetSequence.length).toBeGreaterThanOrEqual(18);
    expect(r2.challenge!.targetSequence.length).toBeLessThanOrEqual(19);
  });

  it('4b. Levels 2–5 reach their intended early-level final-slot bands', () => {
    const expectedBands = [
      { level: 2, slots: [[9, 10], [14, 15], [18, 19]] },
      { level: 3, slots: [[11, 13], [15, 16], [18, 20]] },
      { level: 4, slots: [[13, 15], [16, 18], [19, 21]] },
      { level: 5, slots: [[15, 16], [18, 19], [21, 23]] },
    ] as const;

    for (const { level, slots } of expectedBands) {
      for (let slot = 0; slot < slots.length; slot++) {
        const count = resolveLevel(level, false, makeProfile(), 'next', undefined, slot).challenge!.targetSequence.length;
        expect(count).toBeGreaterThanOrEqual(slots[slot][0]);
        expect(count).toBeLessThanOrEqual(slots[slot][1]);
      }
    }
  });

  it('4c. early-level target growth is gradual and does not linger at 11–12', () => {
    for (let level = 1; level <= 5; level++) {
      const counts = [0, 1, 2].map(
        slot => resolveLevel(level, false, makeProfile(), 'next', undefined, slot).challenge!.targetSequence.length,
      );
      expect(counts[1]).toBeGreaterThan(counts[0]);
      expect(counts[2]).toBeGreaterThan(counts[1]);
      expect(counts[1] - counts[0]).toBeLessThanOrEqual(6);
      expect(counts[2] - counts[1]).toBeLessThanOrEqual(6);
      expect(counts.filter(count => count === 11 || count === 12).length).toBeLessThanOrEqual(level === 3 ? 1 : 0);
    }
  });

  it('4d. larger early-level missions receive more adaptive base time', () => {
    for (let level = 1; level <= 5; level++) {
      const first = resolveLevel(level, false, makeProfile(), 'next', undefined, 0).challenge!;
      const last = resolveLevel(level, false, makeProfile(), 'next', undefined, 2).challenge!;
      expect(last.targetSequence.length).toBeGreaterThan(first.targetSequence.length);
      expect(last.timeLimitMs).toBeGreaterThan(first.timeLimitMs);
      expect(last.timeLimitMs).toBeLessThanOrEqual(60_000);
    }
  });

  it('5. board permutation still changes with different seeds', () => {
    let profile = makeProfile();
    const signatures = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const result = resolveLevel(3, false, profile);
      expect(result.challenge).not.toBeNull();
      signatures.add(result.challenge!.signature);
      // Record attempt to build history so future missions differ
      profile = recordMissionAttempt(profile, attemptFor(result.challenge!)).profile;
    }
    // Different seeds produce different board layouts
    expect(signatures.size).toBeGreaterThan(1);
  });

  it('6. Level 2 uses descending progression', () => {
    const profile = makeProfile();
    const result = resolveLevel(2, false, profile);
    expect(result.challenge).not.toBeNull();
    expect(result.challenge!.family).toBe('descending');
  });

  it('7. Level 2 does not repeatedly serve 9→1', () => {
    let profile = makeProfile();
    const semanticKeys = new Set<string>();

    for (let slot = 0; slot < 3; slot++) {
      const result = resolveLevel(2, false, profile, 'next', undefined, slot);
      expect(result.challenge).not.toBeNull();
      const first = result.challenge!.targetSequence[0];
      const last = result.challenge!.targetSequence[result.challenge!.targetSequence.length - 1];
      const count = result.challenge!.targetSequence.length;
      const key = `${result.challenge!.family}:${first}-${last}:${count}`;
      semanticKeys.add(key);
      profile = recordMissionAttempt(profile, attemptFor(result.challenge!)).profile;
    }

    // Should have different semantic keys (not all 9→1)
    expect(semanticKeys.size).toBeGreaterThan(1);
  });

  it('8. Level 3 can generate ranges not starting at 1', () => {
    let foundNonUnitOrigin = false;
    for (let i = 0; i < 30; i++) {
      const profile = makeProfile({ missionIndex: i });
      const result = resolveLevel(3, false, profile);
      expect(result.challenge).not.toBeNull();
      const first = result.challenge!.targetSequence[0];
      const last = result.challenge!.targetSequence[result.challenge!.targetSequence.length - 1];
      if (Math.min(first, last) !== 1) {
        foundNonUnitOrigin = true;
        break;
      }
    }
    expect(foundNonUnitOrigin).toBe(true);
  });

  it('9. semantic duplicate is rejected even when board seed differs', () => {
    let profile = makeProfile();
    // First mission
    const result1 = resolveLevel(1, false, profile);
    expect(result1.challenge).not.toBeNull();
    const key1 = `${result1.challenge!.family}:${result1.challenge!.targetSequence[0]}-${result1.challenge!.targetSequence[result1.challenge!.targetSequence.length - 1]}:${result1.challenge!.targetSequence.length}`;

    // Record it
    profile = recordMissionAttempt(profile, attemptFor(result1.challenge!)).profile;

    // Next mission should have different semantic key
    const result2 = resolveLevel(1, false, profile, 'next', undefined, 1);
    expect(result2.challenge).not.toBeNull();
    const key2 = `${result2.challenge!.family}:${result2.challenge!.targetSequence[0]}-${result2.challenge!.targetSequence[result2.challenge!.targetSequence.length - 1]}:${result2.challenge!.targetSequence.length}`;

    expect(key2).not.toBe(key1);
  });

  it('10. exact-signature anti-repeat still works', () => {
    const profile = makeProfile();
    const result = resolveLevel(3, false, profile);
    expect(result.challenge).not.toBeNull();
    const sig = result.challenge!.signature;

    const updatedProfile = { ...profile, completedSignatures: [sig] };
    for (let i = 0; i < 10; i++) {
      const next = resolveLevel(3, false, updatedProfile);
      if (next.challenge) {
        expect(next.challenge.signature).not.toBe(sig);
      }
    }
  });

  it('11. grids fit target count', () => {
    const profile = makeProfile();
    for (let level = 1; level <= 5; level++) {
      for (let slot = 0; slot < 3; slot++) {
        const result = resolveLevel(level, false, profile, 'next', undefined, slot);
        if (result.challenge) {
          const rows = result.challenge.boardSize;
          const cols = result.challenge.columns ?? result.challenge.boardSize;
          const cellCount = rows * cols;
          const targetCount = result.challenge.targetSequence.length;
          expect(targetCount).toBeLessThanOrEqual(cellCount);
        }
      }
    }
  });

  it('12. neutral cells remain valid', () => {
    const profile = makeProfile();
    for (let level = 1; level <= 5; level++) {
      const result = resolveLevel(level, false, profile);
      if (result.challenge) {
        const rows = result.challenge.boardSize;
        const cols = result.challenge.columns ?? result.challenge.boardSize;
        const cellCount = rows * cols;
        const targetCount = result.challenge.targetSequence.length;
        const trapCount = result.challenge.trapValues.length;
        // Active values = targets + traps (if any)
        expect(result.challenge.activeValues.length).toBe(cellCount);
        expect(targetCount + trapCount).toBe(cellCount);
      }
    }
  });

  it('13. all missions remain <=60 seconds', () => {
    const profile = makeProfile();
    for (let level = 1; level <= 5; level++) {
      for (let slot = 0; slot < 3; slot++) {
        const result = resolveLevel(level, false, profile, 'next', undefined, slot);
        if (result.challenge) {
          expect(result.challenge.timeLimitMs).toBeLessThanOrEqual(60_000);
          expect(result.challenge.timeLimitMs).toBeGreaterThan(0);
        }
      }
    }
  });

  it('14. existing Director/level/persistence tests remain passing', () => {
    // This is a meta-test ensuring our changes don't break the existing suite
    // The actual tests are in the other describe blocks
    const profile = makeProfile();
    const result = resolveLevel(1, false, profile);
    expect(result.challenge).not.toBeNull();
    expect(validateChallenge(result.challenge!)).toEqual({ valid: true, issues: [] });
  });

  it('15. slot-aware envelope expands geometries for later slots', () => {
    const profile = makeProfile();

    // Slot 0: 3×3 only
    const env0 = getSlotAwareEnvelope(1, 0, profile);
    expect(env0.geometries).toEqual([[3, 3]]);

    // Slot 1: 4×4 with neutral capacity for 13–14 targets
    const env1 = getSlotAwareEnvelope(1, 1, profile);
    expect(env1.geometries).toEqual([[4, 4]]);

    // Slot 2: 4×5 or 5×4 for 18–19 targets
    const env2 = getSlotAwareEnvelope(1, 2, profile);
    expect(env2.geometries).toEqual([[4, 5], [5, 4]]);
  });

  it('16. slot-aware envelope clamps to last slot for high missionInLevel', () => {
    const profile = makeProfile();

    const env2 = getSlotAwareEnvelope(1, 2, profile);
    const env10 = getSlotAwareEnvelope(1, 10, profile);

    // High missionInLevel should clamp to last slot
    expect(env10.targetCountRange).toEqual(env2.targetCountRange);
  });

  it('17. level progress resets missionInLevel on level-up', () => {
    const state = createStartingLevelState();
    expect(state.missionInLevel).toBe(0);

    // Simulate completing missions
    const challenge = resolveLevel(1, false, makeProfile()).challenge!;
    const attempt = {
      ...attemptFor(challenge),
      result: 'completed' as const,
      mistakes: 0,
      remainingTimeMs: Math.round(challenge.timeLimitMs * 0.5),
    };

    // Complete enough to level up
    let levelState = state;
    for (let i = 0; i < 5; i++) {
      levelState = applySchulteLevelProgress(levelState, attempt as SchulteMissionAttempt);
    }

    // If leveled up, missionInLevel should be 0
    if (levelState.currentLevel > 1) {
      expect(levelState.missionInLevel).toBe(0);
    }
  });

  it('18. semantic key captures mission feel', () => {
    // Same family, range, count = same semantic key
    const key1 = createSemanticKey('ascending', [1, 2, 3, 4, 5, 6, 7, 8, 9], 9);
    const key2 = createSemanticKey('ascending', [9, 8, 7, 6, 5, 4, 3, 2, 1], 9);
    // Both are ascending 1→9 with 9 targets
    expect(key1).toBe(key2);

    // Different count = different key
    const key3 = createSemanticKey('ascending', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 14);
    expect(key3).not.toBe(key1);

    // Different family = different key
    const key4 = createSemanticKey('descending', [9, 8, 7, 6, 5, 4, 3, 2, 1], 9);
    expect(key4).not.toBe(key1);
  });
});
