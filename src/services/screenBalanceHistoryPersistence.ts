import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Weekly Trends V1 — small, date-keyed daily aggregates for the metrics
 * that only MindPulse itself ever records (Focus, Offline, Resets). Screen
 * time itself is NOT stored here — it's queried live per day from Android's
 * UsageStatsManager (`getScreenTimeHistory` in `screenUsageService.ts`),
 * since the OS already retains that history independently of MindPulse.
 *
 * Local-only, like the rest of Screen Balance: no backend, no analytics,
 * only the small daily totals below — never raw usage events.
 */

export interface DailyAggregate {
  focusMinutes: number;
  offlineMinutes: number;
  resetsCompleted: number;
}

export type DailyHistoryMap = Record<string, DailyAggregate>;

const EMPTY_DAY: DailyAggregate = { focusMinutes: 0, offlineMinutes: 0, resetsCompleted: 0 };

const HISTORY_VERSION = 1;
const HISTORY_KEY_PREFIX = '@mindpulse/screen-balance-history:';

/** Local aggregates older than this are pruned on every write — V1 only displays 7 days, but keeps a longer buffer for future comparisons. */
export const SCREEN_BALANCE_HISTORY_RETENTION_DAYS = 30;

interface StoredHistory {
  version: number;
  days: DailyHistoryMap;
}

function historyKey(uid?: string): string {
  return `${HISTORY_KEY_PREFIX}${uid ?? 'guest'}`;
}

/** Local date string (device timezone), matching `screenBalancePersistence.ts`'s `todayKey()` format. */
function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isDailyAggregate(value: unknown): value is DailyAggregate {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<DailyAggregate>;
  return (
    typeof v.focusMinutes === 'number' &&
    typeof v.offlineMinutes === 'number' &&
    typeof v.resetsCompleted === 'number'
  );
}

/** Drops any malformed entry rather than letting corrupt state break the whole map — a bad single day is worth losing, the rest isn't. */
function sanitizeDays(raw: unknown): DailyHistoryMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: DailyHistoryMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key) && isDailyAggregate(value)) out[key] = value;
  }
  return out;
}

function pruneOldEntries(days: DailyHistoryMap, now: Date): DailyHistoryMap {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - SCREEN_BALANCE_HISTORY_RETENTION_DAYS);
  const cutoffKey = localDateKey(cutoff);
  const pruned: DailyHistoryMap = {};
  for (const [key, value] of Object.entries(days)) {
    if (key >= cutoffKey) pruned[key] = value;
  }
  return pruned;
}

/**
 * Loads the full stored history, migrating/recovering safely from anything
 * unexpected (missing version, corrupt JSON, pre-versioning shape) rather
 * than throwing or silently wiping a user's existing days.
 */
async function loadHistory(uid?: string): Promise<DailyHistoryMap> {
  try {
    const raw = await AsyncStorage.getItem(historyKey(uid));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<StoredHistory> | DailyHistoryMap;
    if (parsed && typeof parsed === 'object' && 'version' in parsed) {
      return sanitizeDays((parsed as Partial<StoredHistory>).days);
    }
    // No `version` field: either pre-versioning state or unrelated corrupt
    // data. Attempt a best-effort recovery — any well-formed day entries
    // are kept, anything else is safely dropped.
    return sanitizeDays(parsed);
  } catch {
    return {};
  }
}

async function saveHistory(uid: string | undefined, days: DailyHistoryMap, now = new Date()): Promise<void> {
  const stored: StoredHistory = { version: HISTORY_VERSION, days: pruneOldEntries(days, now) };
  try {
    await AsyncStorage.setItem(historyKey(uid), JSON.stringify(stored));
  } catch {
    // Best-effort — the completed action itself already happened.
  }
}

async function addToDay(
  uid: string | undefined,
  date: string,
  delta: Partial<DailyAggregate>,
): Promise<void> {
  const days = await loadHistory(uid);
  const existing = days[date] ?? EMPTY_DAY;
  days[date] = {
    focusMinutes: existing.focusMinutes + (delta.focusMinutes ?? 0),
    offlineMinutes: existing.offlineMinutes + (delta.offlineMinutes ?? 0),
    resetsCompleted: existing.resetsCompleted + (delta.resetsCompleted ?? 0),
  };
  await saveHistory(uid, days);
}

/** Called once per completed reset (any type) — see `recordResetCompleted` in `screenBalancePersistence.ts`. */
export async function recordDailyReset(uid?: string, date: string = localDateKey(new Date())): Promise<void> {
  await addToDay(uid, date, { resetsCompleted: 1 });
}

/** Called when a Go Offline session completes — see `recordResetCompleted` in `screenBalancePersistence.ts`. */
export async function recordDailyOfflineMinutes(
  uid: string | undefined,
  minutes: number,
  date: string = localDateKey(new Date()),
): Promise<void> {
  if (minutes <= 0) return;
  await addToDay(uid, date, { offlineMinutes: minutes });
}

/** Called when a Focus Block completes — see `completeFocusBlock` in `focusBlockPersistence.ts`. */
export async function recordDailyFocusMinutes(
  uid: string | undefined,
  minutes: number,
  date: string = localDateKey(new Date()),
): Promise<void> {
  if (minutes <= 0) return;
  await addToDay(uid, date, { focusMinutes: minutes });
}

/**
 * The last [days] local calendar days (today + previous days), oldest
 * first. Missing days default to zero — every one of these three metrics
 * is generated entirely by MindPulse, so "no entry" and "confirmed zero
 * activity" are the same fact, unlike OS-sourced screen time.
 */
export async function getDailyHistory(
  uid?: string,
  days = 7,
): Promise<({ date: string } & DailyAggregate)[]> {
  const stored = await loadHistory(uid);
  const now = new Date();
  const out: ({ date: string } & DailyAggregate)[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const date = localDateKey(d);
    out.push({ date, ...(stored[date] ?? EMPTY_DAY) });
  }
  return out;
}
