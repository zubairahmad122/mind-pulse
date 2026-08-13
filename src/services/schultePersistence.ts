import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createStartingLevelState,
  createStartingSkillProfile,
  applySchulteLevelProgress,
  recordMissionAttempt as directorRecordMissionAttempt,
  resolveNextSchulteLevelMission,
  selectNextMission as directorSelectNextMission,
  type ResolveLevelMissionInput,
  type ResolveLevelMissionResult,
  type SchulteLevelState,
  type SchulteMissionAttempt,
  type SchultePlayerSkillProfile,
  type SelectNextMissionInput,
  type SelectNextMissionResult,
} from '@/engine/core/games/schulteNexus/director';

/**
 * Local persistence for the Schulte Nexus Adaptive Mission Director + Level
 * Progression. Storage only — every difficulty/rating/mastery/level decision
 * stays inside the pure director module. AsyncStorage-only (no Firestore/
 * cloud sync), matching this task's "local persistence only" scope.
 */

/**
 * v1: `{ schemaVersion, profile, updatedAt }` (no level progression).
 * v2: adds `levelState`. Loading a v1 payload fills in a fresh
 * `levelState` and upgrades it in place — profile/history are never wiped.
 */
export const SCHULTE_PERSISTENCE_SCHEMA_VERSION = 2;
const KNOWN_SCHEMA_VERSIONS = new Set([1, 2]);

/**
 * `profile` already contains `completedSignatures`, `recentAttempts`,
 * `personalBests` and `missionIndex` (see `director/types.ts`), so this is
 * the full equivalent of the requested persisted shape without duplicating
 * any of those fields at a second level.
 */
export interface SchultePersistedState {
  readonly schemaVersion: number;
  readonly profile: SchultePlayerSkillProfile;
  readonly levelState: SchulteLevelState;
  readonly updatedAt: number;
}

/** Loosened shape a stored payload of *any* known schema version must satisfy. */
interface StoredPayloadLike {
  readonly schemaVersion: number;
  readonly profile: SchultePlayerSkillProfile;
  readonly levelState?: unknown;
  readonly updatedAt: number;
}

function storageKey(uid: string | undefined): string {
  return `@mindpulse/schulte-nexus:${uid ?? 'guest'}`;
}

function freshState(): SchultePersistedState {
  return {
    schemaVersion: SCHULTE_PERSISTENCE_SCHEMA_VERSION,
    profile: createStartingSkillProfile(),
    levelState: createStartingLevelState(),
    updatedAt: Date.now(),
  };
}

/** Minimal structural guard — enough to catch corrupted/foreign JSON without a full schema validator. */
function isPlausibleStoredPayload(value: unknown): value is StoredPayloadLike {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredPayloadLike>;
  const profile = candidate.profile as Partial<SchultePlayerSkillProfile> | undefined;
  return (
    typeof candidate.schemaVersion === 'number' &&
    typeof candidate.updatedAt === 'number' &&
    !!profile &&
    typeof profile.rating === 'number' &&
    Array.isArray(profile.recentAttempts) &&
    Array.isArray(profile.completedSignatures)
  );
}

function isPlausibleLevelState(value: unknown): value is SchulteLevelState {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<SchulteLevelState>;
  return (
    typeof c.currentLevel === 'number' &&
    typeof c.levelProgress === 'number' &&
    typeof c.highestUnlockedLevel === 'number' &&
    typeof c.missionsCompletedAtCurrentLevel === 'number'
    // missionInLevel may be missing from v2 migration — we backfill it below
  );
}

/** v1 → v2 (and any future forward-normalization): profile/history pass through untouched. */
function normalizeToCurrentSchema(payload: StoredPayloadLike): SchultePersistedState {
  const rawLevelState = payload.levelState;
  let levelState = isPlausibleLevelState(rawLevelState) ? rawLevelState : createStartingLevelState();

  // Backfill missionInLevel for v2 state that predates the mission-in-level feature
  if (typeof (rawLevelState as Record<string, unknown> | undefined)?.missionInLevel !== 'number') {
    levelState = { ...levelState, missionInLevel: 0 };
  }

  return {
    schemaVersion: SCHULTE_PERSISTENCE_SCHEMA_VERSION,
    profile: payload.profile,
    levelState,
    updatedAt: payload.updatedAt,
  };
}

/** Validates+normalizes an arbitrary payload the same way regardless of which store it came from. */
function readStoredPayload(parsed: unknown): SchultePersistedState | null {
  if (!isPlausibleStoredPayload(parsed)) return null;
  if (!KNOWN_SCHEMA_VERSIONS.has(parsed.schemaVersion)) return null;
  return normalizeToCurrentSchema(parsed);
}

/**
 * Loads persisted Schulte state, falling back to a fresh default on missing
 * data, corrupted JSON, a structurally invalid payload, or a schema version
 * this build doesn't know how to read. A recognized older version (v1) is
 * migrated forward in place — never wiped. Never throws — gameplay must
 * never crash on storage.
 */
export async function loadSchulteState(uid: string | undefined): Promise<SchultePersistedState> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(uid));
    if (!raw) return freshState();
    return readStoredPayload(JSON.parse(raw)) ?? freshState();
  } catch {
    return freshState();
  }
}

export async function saveSchulteState(uid: string | undefined, state: SchultePersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(uid), JSON.stringify(state));
  } catch {
    // Best-effort — a dropped write shouldn't interrupt gameplay.
  }
}

/**
 * Records one finished attempt against the skill profile only (rating,
 * mastery, completed-signature and personal-best updates — the director's
 * own `recordMissionAttempt`). Leaves `levelState` untouched; use
 * `recordPersistedLevelAttempt` when the attempt should also progress a
 * level. Call at mission end — not per tap.
 */
export async function recordPersistedAttempt(
  uid: string | undefined,
  attemptInput: Omit<SchulteMissionAttempt, 'wasPersonalBest'>,
): Promise<{ state: SchultePersistedState; attempt: SchulteMissionAttempt; previousBestMs: number | null }> {
  const current = await loadSchulteState(uid);
  const { profile, attempt, previousBestMs } = directorRecordMissionAttempt(current.profile, attemptInput);
  const state: SchultePersistedState = { ...current, profile, updatedAt: Date.now() };
  await saveSchulteState(uid, state);
  return { state, attempt, previousBestMs };
}

/**
 * Records one finished attempt against both the skill profile and the
 * current level's progress in a single persisted write. This is the write
 * path Level Progression play should use.
 */
export async function recordPersistedLevelAttempt(
  uid: string | undefined,
  attemptInput: Omit<SchulteMissionAttempt, 'wasPersonalBest'>,
): Promise<{ state: SchultePersistedState; attempt: SchulteMissionAttempt; previousBestMs: number | null }> {
  const current = await loadSchulteState(uid);
  const { profile, attempt, previousBestMs } = directorRecordMissionAttempt(current.profile, attemptInput);
  const levelState = applySchulteLevelProgress(current.levelState, attempt);
  const state: SchultePersistedState = { ...current, profile, levelState, updatedAt: Date.now() };
  await saveSchulteState(uid, state);
  return { state, attempt, previousBestMs };
}

/**
 * Explicit idempotent "mark this signature completed" seam, for callers that
 * need it outside the normal record-attempt flow. Duplicate calls with the
 * same signature are no-ops.
 */
export async function markMissionCompleted(uid: string | undefined, signature: string): Promise<SchultePersistedState> {
  const current = await loadSchulteState(uid);
  if (current.profile.completedSignatures.includes(signature)) return current;

  const state: SchultePersistedState = {
    ...current,
    profile: {
      ...current.profile,
      completedSignatures: [...current.profile.completedSignatures, signature],
    },
    updatedAt: Date.now(),
  };
  await saveSchulteState(uid, state);
  return state;
}

/**
 * Loads persisted state and asks the (unmodified) Mission Director for the
 * next challenge — no difficulty/novelty logic lives here.
 */
export async function selectPersistedNextMission(
  uid: string | undefined,
  input: Omit<SelectNextMissionInput, 'profile'>,
): Promise<SelectNextMissionResult> {
  const state = await loadSchulteState(uid);
  return directorSelectNextMission({ ...input, profile: state.profile });
}

/**
 * Loads persisted state and resolves the next (level-gated, level-envelope)
 * mission — no access/difficulty/novelty logic lives here either. A blocked
 * premium level short-circuits to `access.canPlay === false` with no
 * challenge generated.
 */
export async function selectPersistedNextLevelMission(
  uid: string | undefined,
  input: Omit<ResolveLevelMissionInput, 'profile' | 'missionInLevel'>,
): Promise<ResolveLevelMissionResult> {
  const state = await loadSchulteState(uid);
  // Safeguard: fallback to 0 if missionInLevel is somehow still undefined
  const missionInLevel = typeof state.levelState.missionInLevel === 'number' ? state.levelState.missionInLevel : 0;
  return resolveNextSchulteLevelMission({ ...input, profile: state.profile, missionInLevel });
}

/**
 * Internal/test seam only — do not wire this into normal UI (no reset
 * affordance is exposed to players in this task).
 */
export async function resetSchulteState(uid: string | undefined): Promise<SchultePersistedState> {
  const state = freshState();
  await saveSchulteState(uid, state);
  return state;
}

/**
 * Internal/debug seam only — do not leave a persistent affordance for this in
 * production UI. Jumps `levelState` straight to `level` with a fresh 0/100
 * progress bar, leaving `profile` (rating/mastery/personal bests) untouched.
 */
export async function debugSetSchulteLevel(uid: string | undefined, level: number): Promise<SchultePersistedState> {
  const current = await loadSchulteState(uid);
  const levelState: SchulteLevelState = {
    currentLevel: level,
    levelProgress: 0,
    highestUnlockedLevel: Math.max(current.levelState.highestUnlockedLevel, level),
    missionsCompletedAtCurrentLevel: 0,
    missionInLevel: 0,
  };
  const state: SchultePersistedState = { ...current, levelState, updatedAt: Date.now() };
  await saveSchulteState(uid, state);
  return state;
}
