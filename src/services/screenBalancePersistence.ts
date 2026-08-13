import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Screen Balance MVP — local-only stats and the Go Offline timer's
 * persisted session record. No cloud sync, no analytics backend: this is
 * intentionally the simplest storage that survives app backgrounding
 * (see `useOfflineSession`) and a same-day relaunch.
 */

export type ResetType = 'eye-break' | 'breathe' | 'move' | 'offline';

export interface ScreenBalanceStats {
  resetsCompletedToday: number;
  offlineMinutesToday: number;
  lastResetType: ResetType | null;
  lastResetCompletedAt: number | null;
}

interface StoredStats extends ScreenBalanceStats {
  /** YYYY-MM-DD the daily counters were last reset on. */
  statsDate: string;
}

const DEFAULT_STATS: ScreenBalanceStats = {
  resetsCompletedToday: 0,
  offlineMinutesToday: 0,
  lastResetType: null,
  lastResetCompletedAt: null,
};

const STATS_KEY_PREFIX = '@mindpulse/screen-balance-stats:';
const SESSION_KEY_PREFIX = '@mindpulse/screen-balance-offline-session:';

function statsKey(uid?: string): string {
  return `${STATS_KEY_PREFIX}${uid ?? 'guest'}`;
}

function sessionKey(uid?: string): string {
  return `${SESSION_KEY_PREFIX}${uid ?? 'guest'}`;
}

/** Local date string (device timezone) — daily counters roll over on this. */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function loadScreenBalanceStats(uid?: string): Promise<ScreenBalanceStats> {
  try {
    const raw = await AsyncStorage.getItem(statsKey(uid));
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw) as Partial<StoredStats>;
    if (parsed.statsDate !== todayKey()) {
      // New day — only the daily counters reset; "last reset" stays visible.
      return {
        ...DEFAULT_STATS,
        lastResetType: parsed.lastResetType ?? null,
        lastResetCompletedAt: parsed.lastResetCompletedAt ?? null,
      };
    }
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return DEFAULT_STATS;
  }
}

/** Records one completed reset. `offlineMinutes` only applies to 'offline' resets. */
export async function recordResetCompleted(
  uid: string | undefined,
  type: ResetType,
  offlineMinutes = 0,
): Promise<ScreenBalanceStats> {
  const current = await loadScreenBalanceStats(uid);
  const next: ScreenBalanceStats = {
    resetsCompletedToday: current.resetsCompletedToday + 1,
    offlineMinutesToday: current.offlineMinutesToday + offlineMinutes,
    lastResetType: type,
    lastResetCompletedAt: Date.now(),
  };
  const stored: StoredStats = { ...next, statsDate: todayKey() };
  try {
    await AsyncStorage.setItem(statsKey(uid), JSON.stringify(stored));
  } catch {
    // Best-effort — the completed session itself already happened.
  }
  return next;
}

// ──────────────────────────────────────────────
// Go Offline session — elapsed-time-safe, survives backgrounding
// ──────────────────────────────────────────────

export type OfflineSessionStatus = 'active' | 'completed' | 'cancelled';

export interface OfflineSession {
  startedAt: number;
  durationSeconds: number;
  expectedEndAt: number;
  status: OfflineSessionStatus;
}

export async function loadOfflineSession(uid?: string): Promise<OfflineSession | null> {
  try {
    const raw = await AsyncStorage.getItem(sessionKey(uid));
    if (!raw) return null;
    return JSON.parse(raw) as OfflineSession;
  } catch {
    return null;
  }
}

export async function startOfflineSession(
  uid: string | undefined,
  durationSeconds: number,
): Promise<OfflineSession> {
  const startedAt = Date.now();
  const session: OfflineSession = {
    startedAt,
    durationSeconds,
    expectedEndAt: startedAt + durationSeconds * 1000,
    status: 'active',
  };
  try {
    await AsyncStorage.setItem(sessionKey(uid), JSON.stringify(session));
  } catch {
    // Best-effort — the in-memory session still runs for this app session.
  }
  return session;
}

export async function clearOfflineSession(uid?: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(sessionKey(uid));
  } catch {
    // Nothing left to clear.
  }
}
