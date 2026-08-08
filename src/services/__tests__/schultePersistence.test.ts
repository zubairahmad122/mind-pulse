import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SchulteChallenge } from '@/engine/core/games/schulteNexus';
import {
  createStartingSkillProfile,
  selectNextMission,
  resolveNextSchulteLevelMission,
  createStartingLevelState,
  type SchulteMissionAttempt,
} from '@/engine/core/games/schulteNexus/director';
import {
  loadSchulteState,
  markMissionCompleted,
  recordPersistedAttempt,
  recordPersistedLevelAttempt,
  resetSchulteState,
  saveSchulteState,
  selectPersistedNextMission,
  SCHULTE_PERSISTENCE_SCHEMA_VERSION,
} from '../schultePersistence';

// jest.mock calls are hoisted above imports regardless of source position —
// see useAudioGuide.test.ts for the same pattern.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const UID = 'test-user';

function sampleChallenge(): SchulteChallenge {
  const { challenge } = selectNextMission({ profile: createStartingSkillProfile(), userStableId: UID, mode: 'next' });
  return challenge;
}

function attemptFor(
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
    difficulty: {
      searchSpeed: 0, targetCount: 0, gridComplexity: 0, sequenceComplexity: 0, ruleSwitching: 0, visualComplexity: 0, timePressure: 0,
    },
    startedAt: 0,
    completedAt: challenge.timeLimitMs,
    ...overrides,
  };
}

describe('Schulte Nexus persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('1. first run creates a clean default state', async () => {
    const state = await loadSchulteState(UID);
    expect(state.schemaVersion).toBe(SCHULTE_PERSISTENCE_SCHEMA_VERSION);
    expect(state.profile.missionIndex).toBe(0);
    expect(state.profile.rating).toBe(0);
    expect(state.profile.completedSignatures).toEqual([]);
    expect(state.profile.recentAttempts).toEqual([]);
  });

  it('2. save → load preserves player rating/profile', async () => {
    const loaded = await loadSchulteState(UID);
    const withRating = { ...loaded, profile: { ...loaded.profile, rating: 42 } };
    await saveSchulteState(UID, withRating);
    const reloaded = await loadSchulteState(UID);
    expect(reloaded.profile.rating).toBe(42);
  });

  it('3/4. completed signatures survive reload and are deduplicated', async () => {
    const challenge = sampleChallenge();
    await recordPersistedAttempt(UID, attemptFor(challenge));
    await markMissionCompleted(UID, challenge.signature); // duplicate

    const state = await loadSchulteState(UID);
    const occurrences = state.profile.completedSignatures.filter(s => s === challenge.signature).length;
    expect(occurrences).toBe(1);
  });

  it('5. a failed mission is not added to completedMissionSignatures', async () => {
    const challenge = sampleChallenge();
    await recordPersistedAttempt(UID, attemptFor(challenge, { result: 'failedMistakes', correctTaps: 2 }));
    const state = await loadSchulteState(UID);
    expect(state.profile.completedSignatures).not.toContain(challenge.signature);
  });

  it('6. recent attempts stay bounded across many recordings', async () => {
    let uidState = UID;
    for (let i = 0; i < 30; i++) {
      const challenge = sampleChallenge();
      await recordPersistedAttempt(uidState, attemptFor(challenge));
    }
    const state = await loadSchulteState(uidState);
    expect(state.profile.recentAttempts.length).toBeLessThanOrEqual(50);
    expect(state.profile.recentAttempts.length).toBeGreaterThan(0);
  });

  it('7. personal mission index survives reload', async () => {
    const challenge = sampleChallenge();
    await recordPersistedAttempt(UID, attemptFor(challenge));
    await recordPersistedAttempt(UID, attemptFor(sampleChallenge()));
    const state = await loadSchulteState(UID);
    expect(state.profile.missionIndex).toBe(2);
  });

  it('8. personal best survives reload', async () => {
    const challenge = sampleChallenge();
    const { attempt } = await recordPersistedAttempt(UID, attemptFor(challenge));
    expect(attempt.wasPersonalBest).toBe(true);

    const state = await loadSchulteState(UID);
    const key = `${challenge.boardSize}x${challenge.columns ?? challenge.boardSize}:${challenge.family}:${challenge.targetSequence.length}`;
    expect(state.profile.personalBests[key]?.signature).toBe(challenge.signature);
  });

  it('9. corrupted stored state falls back safely', async () => {
    await AsyncStorage.setItem('@mindpulse/schulte-nexus:test-user', 'not json{{{');
    const state = await loadSchulteState(UID);
    expect(state.profile.missionIndex).toBe(0);
    expect(state.schemaVersion).toBe(SCHULTE_PERSISTENCE_SCHEMA_VERSION);
  });

  it('10. an unsupported schema version falls back to a safe fresh state', async () => {
    await AsyncStorage.setItem(
      '@mindpulse/schulte-nexus:test-user',
      JSON.stringify({ schemaVersion: 999, profile: createStartingSkillProfile(), updatedAt: 0 }),
    );
    const state = await loadSchulteState(UID);
    expect(state.schemaVersion).toBe(SCHULTE_PERSISTENCE_SCHEMA_VERSION);
    expect(state.profile.missionIndex).toBe(0);
  });

  it('11. persisted state can be passed back into selectNextMission', async () => {
    const challenge = sampleChallenge();
    await recordPersistedAttempt(UID, attemptFor(challenge));
    const result = await selectPersistedNextMission(UID, { userStableId: UID, mode: 'next' });
    expect(result.challenge).toBeDefined();
  });

  it('12. after restart, a previously completed exact mission is never re-served', async () => {
    const challenge = sampleChallenge();
    await recordPersistedAttempt(UID, attemptFor(challenge));

    // Simulate app restart — nothing but a fresh load.
    const reloaded = await loadSchulteState(UID);
    expect(reloaded.profile.completedSignatures).toContain(challenge.signature);

    const next = await selectPersistedNextMission(UID, { userStableId: UID, mode: 'next' });
    expect(next.challenge.signature).not.toBe(challenge.signature);
  });

  it('resetSchulteState clears persisted history (internal seam)', async () => {
    await recordPersistedAttempt(UID, attemptFor(sampleChallenge()));
    await resetSchulteState(UID);
    const state = await loadSchulteState(UID);
    expect(state.profile.missionIndex).toBe(0);
    expect(state.profile.completedSignatures).toEqual([]);
  });

  // ─── Level Progression Persistence ──────────────────────────────────────

  it('LP-1. fresh state includes level state', async () => {
    const state = await loadSchulteState(UID);
    expect(state.levelState).toEqual(createStartingLevelState());
    expect(state.levelState.currentLevel).toBe(1);
    expect(state.levelState.levelProgress).toBe(0);
    expect(state.levelState.highestUnlockedLevel).toBe(1);
    expect(state.levelState.missionsCompletedAtCurrentLevel).toBe(0);
  });

  it('LP-2. level progress survives save/load cycle', async () => {
    const initial = await loadSchulteState(UID);
    // Resolve a mission at level 1
    const result = resolveNextSchulteLevelMission({
      profile: initial.profile,
      userStableId: UID,
      level: 1,
      missionInLevel: 0,
      isPremium: false,
      mode: 'next',
    });
    expect(result.challenge).not.toBeNull();
    await recordPersistedLevelAttempt(UID, attemptFor(result.challenge!));

    const reloaded = await loadSchulteState(UID);
    expect(reloaded.levelState.levelProgress).toBeGreaterThan(0);
    expect(reloaded.levelState.missionsCompletedAtCurrentLevel).toBe(1);
    expect(reloaded.schemaVersion).toBe(SCHULTE_PERSISTENCE_SCHEMA_VERSION);
  });

  it('LP-3. migration from v1 schema preserves user history', async () => {
    // Manually store a v1 schema payload (no levelState)
    const v1Payload = {
      schemaVersion: 1,
      profile: {
        rating: 42,
        missionIndex: 7,
        ladderIndex: 3,
        familyMastery: {},
        personalBests: { '3x3:ascending:9': { classKey: '3x3:ascending:9', timeMs: 5000, signature: 'old-sig', achievedAt: 1000 } },
        recentAttempts: [],
        completedSignatures: ['sig-1', 'sig-2', 'sig-3'],
        recentFamilies: ['ascending', 'descending'],
        recentGeometries: ['3x3', '4x4'],
        allowNegativeNumbers: false,
      },
      updatedAt: 12345,
    };

    await AsyncStorage.setItem('@mindpulse/schulte-nexus:level-migration-test', JSON.stringify(v1Payload));

    const loaded = await loadSchulteState('level-migration-test');

    // Schema upgraded
    expect(loaded.schemaVersion).toBe(SCHULTE_PERSISTENCE_SCHEMA_VERSION);

    // Profile preserved
    expect(loaded.profile.rating).toBe(42);
    expect(loaded.profile.missionIndex).toBe(7);
    expect(loaded.profile.completedSignatures).toEqual(['sig-1', 'sig-2', 'sig-3']);
    expect(loaded.profile.personalBests).toEqual(v1Payload.profile.personalBests);
    expect(loaded.profile.recentFamilies).toEqual(['ascending', 'descending']);

    // Level state initialized fresh (not wiped)
    expect(loaded.levelState.currentLevel).toBe(1);
    expect(loaded.levelState.levelProgress).toBe(0);
  });

  it('LP-4. level state and profile are persisted independently', async () => {
    const initial = await loadSchulteState(UID);
    const result = resolveNextSchulteLevelMission({
      profile: initial.profile,
      userStableId: UID,
      level: 1,
      missionInLevel: 0,
      isPremium: false,
      mode: 'next',
    });
    await recordPersistedLevelAttempt(UID, attemptFor(result.challenge!));

    const state = await loadSchulteState(UID);
    // Profile has the attempt recorded
    expect(state.profile.missionIndex).toBe(1);
    expect(state.profile.rating).toBeGreaterThanOrEqual(0);
    // Level state also updated
    expect(state.levelState.missionsCompletedAtCurrentLevel).toBe(1);
    expect(state.levelState.levelProgress).toBeGreaterThan(0);
  });
});
