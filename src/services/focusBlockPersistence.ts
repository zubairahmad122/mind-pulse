import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordDailyFocusMinutes } from './screenBalanceHistoryPersistence';

export type FocusBlockStatus = 'active' | 'paused';

export interface ActiveFocusSession {
  startedAt: number;
  durationSeconds: number;
  expectedEndAt: number;
  pausedAt: number | null;
  accumulatedPausedMs: number;
  status: FocusBlockStatus;
  goal: string;
}

export interface FocusBlockStats {
  focusBlocksToday: number;
  focusMinutesToday: number;
  longestFocusBlockMinutes: number;
  lastFocusCompletedAt: number | null;
  lastFocusGoal: string | null;
}

export interface FocusBlockCompletion {
  completedAt: number;
  durationSeconds: number;
  goal: string;
}

export interface FocusBlockState {
  activeFocusSession: ActiveFocusSession | null;
  todayStats: FocusBlockStats;
  pendingCompletion: FocusBlockCompletion | null;
}

interface StoredFocusBlockState {
  version: 1;
  statsDate: string;
  activeFocusSession: ActiveFocusSession | null;
  todayStats: FocusBlockStats;
  pendingCompletion: FocusBlockCompletion | null;
}

const STORAGE_VERSION = 1;
const FOCUS_KEY_PREFIX = '@mindpulse/screen-balance-focus-block:';

const DEFAULT_STATS: FocusBlockStats = {
  focusBlocksToday: 0,
  focusMinutesToday: 0,
  longestFocusBlockMinutes: 0,
  lastFocusCompletedAt: null,
  lastFocusGoal: null,
};

function focusKey(uid?: string): string {
  return `${FOCUS_KEY_PREFIX}${uid ?? 'guest'}`;
}

function localDateKey(now: number = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeGoal(goal: string): string {
  return goal.trim().replace(/\s+/g, ' ').slice(0, 120);
}

export function isMeaningfulFocusGoal(goal: string): boolean {
  return sanitizeGoal(goal).length > 0;
}

function sanitizeStats(input: Partial<FocusBlockStats> | undefined): FocusBlockStats {
  return {
    focusBlocksToday: Math.max(0, Math.floor(input?.focusBlocksToday ?? 0)),
    focusMinutesToday: Math.max(0, Math.floor(input?.focusMinutesToday ?? 0)),
    longestFocusBlockMinutes: Math.max(0, Math.floor(input?.longestFocusBlockMinutes ?? 0)),
    lastFocusCompletedAt: isFiniteNumber(input?.lastFocusCompletedAt) ? input.lastFocusCompletedAt : null,
    lastFocusGoal: typeof input?.lastFocusGoal === 'string' && input.lastFocusGoal.trim()
      ? sanitizeGoal(input.lastFocusGoal)
      : null,
  };
}

function sanitizeSession(input: Partial<ActiveFocusSession> | null | undefined): ActiveFocusSession | null {
  if (!input) return null;
  if (
    !isFiniteNumber(input.startedAt) ||
    !isFiniteNumber(input.durationSeconds) ||
    !isFiniteNumber(input.expectedEndAt) ||
    !isFiniteNumber(input.accumulatedPausedMs) ||
    (input.pausedAt != null && !isFiniteNumber(input.pausedAt)) ||
    (input.status !== 'active' && input.status !== 'paused') ||
    typeof input.goal !== 'string'
  ) {
    return null;
  }
  const goal = sanitizeGoal(input.goal);
  if (!goal || input.durationSeconds <= 0 || input.expectedEndAt <= input.startedAt) return null;
  return {
    startedAt: input.startedAt,
    durationSeconds: Math.floor(input.durationSeconds),
    expectedEndAt: input.expectedEndAt,
    pausedAt: input.status === 'paused' ? input.pausedAt ?? input.expectedEndAt : null,
    accumulatedPausedMs: Math.max(0, input.accumulatedPausedMs),
    status: input.status,
    goal,
  };
}

function sanitizeCompletion(input: Partial<FocusBlockCompletion> | null | undefined): FocusBlockCompletion | null {
  if (!input) return null;
  if (!isFiniteNumber(input.completedAt) || !isFiniteNumber(input.durationSeconds) || typeof input.goal !== 'string') {
    return null;
  }
  const goal = sanitizeGoal(input.goal);
  if (!goal || input.durationSeconds <= 0) return null;
  return {
    completedAt: input.completedAt,
    durationSeconds: Math.floor(input.durationSeconds),
    goal,
  };
}

function rolloverStats(stats: FocusBlockStats, storedDate: unknown, now: number = Date.now()): FocusBlockStats {
  if (storedDate === localDateKey(now)) return stats;
  return {
    ...DEFAULT_STATS,
    lastFocusCompletedAt: stats.lastFocusCompletedAt,
    lastFocusGoal: stats.lastFocusGoal,
  };
}

async function saveStoredState(uid: string | undefined, state: FocusBlockState, now: number = Date.now()): Promise<void> {
  const stored: StoredFocusBlockState = {
    version: STORAGE_VERSION,
    statsDate: localDateKey(now),
    activeFocusSession: state.activeFocusSession,
    todayStats: state.todayStats,
    pendingCompletion: state.pendingCompletion,
  };
  try {
    await AsyncStorage.setItem(focusKey(uid), JSON.stringify(stored));
  } catch {
    // Best effort; the in-memory session still works for this app run.
  }
}

export async function loadFocusBlockState(uid?: string, now: number = Date.now()): Promise<FocusBlockState> {
  try {
    const raw = await AsyncStorage.getItem(focusKey(uid));
    if (!raw) {
      return {
        activeFocusSession: null,
        todayStats: DEFAULT_STATS,
        pendingCompletion: null,
      };
    }
    const parsed = JSON.parse(raw) as Partial<StoredFocusBlockState>;
    if (parsed.version !== STORAGE_VERSION) {
      return {
        activeFocusSession: null,
        todayStats: DEFAULT_STATS,
        pendingCompletion: null,
      };
    }
    const todayStats = rolloverStats(sanitizeStats(parsed.todayStats), parsed.statsDate, now);
    return {
      activeFocusSession: sanitizeSession(parsed.activeFocusSession),
      todayStats,
      pendingCompletion: sanitizeCompletion(parsed.pendingCompletion),
    };
  } catch {
    return {
      activeFocusSession: null,
      todayStats: DEFAULT_STATS,
      pendingCompletion: null,
    };
  }
}

export async function startFocusBlock(
  uid: string | undefined,
  durationSeconds: number,
  goal: string,
  now: number = Date.now(),
): Promise<ActiveFocusSession | null> {
  const cleanGoal = sanitizeGoal(goal);
  if (!cleanGoal || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
  const session: ActiveFocusSession = {
    startedAt: now,
    durationSeconds: Math.floor(durationSeconds),
    expectedEndAt: now + Math.floor(durationSeconds) * 1000,
    pausedAt: null,
    accumulatedPausedMs: 0,
    status: 'active',
    goal: cleanGoal,
  };
  const state = await loadFocusBlockState(uid, now);
  await saveStoredState(uid, {
    activeFocusSession: session,
    todayStats: state.todayStats,
    pendingCompletion: null,
  }, now);
  return session;
}

export function getFocusRemainingMs(session: ActiveFocusSession, now: number = Date.now()): number {
  const referenceTime = session.status === 'paused' && session.pausedAt != null ? session.pausedAt : now;
  return Math.max(0, session.expectedEndAt - referenceTime);
}

export async function pauseFocusBlock(
  uid: string | undefined,
  session: ActiveFocusSession,
  now: number = Date.now(),
): Promise<ActiveFocusSession> {
  const next: ActiveFocusSession = session.status === 'paused'
    ? session
    : { ...session, status: 'paused', pausedAt: now };
  const state = await loadFocusBlockState(uid, now);
  await saveStoredState(uid, { ...state, activeFocusSession: next }, now);
  return next;
}

export async function resumeFocusBlock(
  uid: string | undefined,
  session: ActiveFocusSession,
  now: number = Date.now(),
): Promise<ActiveFocusSession> {
  if (session.status === 'active') return session;
  const pausedAt = session.pausedAt ?? now;
  const pausedMs = Math.max(0, now - pausedAt);
  const next: ActiveFocusSession = {
    ...session,
    status: 'active',
    pausedAt: null,
    accumulatedPausedMs: session.accumulatedPausedMs + pausedMs,
    expectedEndAt: session.expectedEndAt + pausedMs,
  };
  const state = await loadFocusBlockState(uid, now);
  await saveStoredState(uid, { ...state, activeFocusSession: next }, now);
  return next;
}

export async function completeFocusBlock(
  uid: string | undefined,
  session: ActiveFocusSession,
  now: number = Date.now(),
): Promise<{ stats: FocusBlockStats; completion: FocusBlockCompletion }> {
  const state = await loadFocusBlockState(uid, now);
  const minutes = Math.round(session.durationSeconds / 60);
  const completion: FocusBlockCompletion = {
    completedAt: now,
    durationSeconds: session.durationSeconds,
    goal: session.goal,
  };
  const stats: FocusBlockStats = {
    focusBlocksToday: state.todayStats.focusBlocksToday + 1,
    focusMinutesToday: state.todayStats.focusMinutesToday + minutes,
    longestFocusBlockMinutes: Math.max(state.todayStats.longestFocusBlockMinutes, minutes),
    lastFocusCompletedAt: now,
    lastFocusGoal: session.goal,
  };
  await saveStoredState(uid, {
    activeFocusSession: null,
    todayStats: stats,
    pendingCompletion: completion,
  }, now);
  void recordDailyFocusMinutes(uid, minutes, localDateKey(now));
  return { stats, completion };
}

export async function endFocusBlockEarly(uid?: string, now: number = Date.now()): Promise<FocusBlockStats> {
  const state = await loadFocusBlockState(uid, now);
  await saveStoredState(uid, {
    activeFocusSession: null,
    todayStats: state.todayStats,
    pendingCompletion: null,
  }, now);
  return state.todayStats;
}

export async function acknowledgeFocusCompletion(uid?: string, now: number = Date.now()): Promise<FocusBlockStats> {
  const state = await loadFocusBlockState(uid, now);
  await saveStoredState(uid, { ...state, pendingCompletion: null }, now);
  return state.todayStats;
}
