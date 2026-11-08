// ──────────────────────────────────────────────────────────────────────────────
// useActivityStore — in-memory view of the CURRENT account's unified activity
// log. Deliberately NOT zustand-persisted: persistence is per-account in
// services/activityPersistence.ts, and this store only ever holds the events
// of `ownerKey`, so switching accounts can't surface another user's activity.
// ──────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import {
  activityOwnerKey,
  appendActivityEvent,
  loadActivityLog,
} from '@/services/activityPersistence';
import type { ActivityEvent, ActivityInput } from '@/types/activity.types';
import { activityDateKey } from '@/utils/activityQueries';

interface ActivityState {
  /** Account whose events are loaded (`uid` or 'guest'); null before the first hydrate. */
  ownerKey: string | null;
  /** True once `events` reflects `ownerKey`'s stored log. */
  hydrated: boolean;
  /** Oldest → newest. */
  events: ActivityEvent[];
}

export const useActivityStore = create<ActivityState>()(() => ({
  ownerKey: null,
  hydrated: false,
  events: [],
}));

/** Loads the given account's log into the store. Call whenever the signed-in user changes. */
export async function hydrateActivityLog(uid?: string | null): Promise<void> {
  const ownerKey = activityOwnerKey(uid);
  const current = useActivityStore.getState();
  if (current.ownerKey !== ownerKey) {
    // Drop the previous account's events immediately — never show them under the new one.
    useActivityStore.setState({ ownerKey, hydrated: false, events: [] });
  }
  const events = await loadActivityLog(uid);
  if (useActivityStore.getState().ownerKey === ownerKey) {
    useActivityStore.setState({ events, hydrated: true });
  }
}

/**
 * Records one genuinely completed activity for `uid`'s account. Call ONLY from
 * an existing completion point — never on open/start/abandon. Idempotent by
 * `input.id`. Returns the stored event, or null if that id was already logged.
 */
export async function recordActivity(
  uid: string | null | undefined,
  input: ActivityInput,
): Promise<ActivityEvent | null> {
  const timestamp = input.timestamp ?? Date.now();
  const event: ActivityEvent = {
    ...input,
    timestamp,
    date: activityDateKey(timestamp),
    durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
    completed: true,
  };
  const ownerKey = activityOwnerKey(uid);
  const { added, events } = await appendActivityEvent(uid, event);
  if (useActivityStore.getState().ownerKey === ownerKey) {
    useActivityStore.setState({ events });
  }
  if (!added) return null;
  try {
    // Lazy: keeps every completion point importable without native Firebase
    // Analytics (unit tests, first run before a rebuild). Never breaks a flow.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const analytics = require('@/services/analytics') as typeof import('@/services/analytics');
    analytics.trackActivityCompleted(event);
    if (events.length === 1) analytics.trackFirstSessionDone(event.type);
  } catch {
    // analytics unavailable — skip
  }
  return event;
}
