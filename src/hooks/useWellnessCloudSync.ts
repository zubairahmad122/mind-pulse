import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchWellnessSnapshot, pushWellnessSnapshot, WellnessSnapshot } from '@/services/streakSync';
import { useWellnessStore } from '@/stores/useWellnessStore';
import { mergeWellnessSnapshots } from '@/utils/streakMerge';

const DEBOUNCE_MS = 5000;

function snapshotFromStore(): WellnessSnapshot {
  const s = useWellnessStore.getState();
  return {
    streak: s.streak,
    longestStreak: s.longestStreak,
    lastActiveDate: s.lastActiveDate,
    streakFreezeAvailable: s.streakFreezeAvailable,
    freezeWeekStart: s.freezeWeekStart,
    activityLog: s.activityLog,
  };
}

function snapshotsEqual(a: WellnessSnapshot, b: WellnessSnapshot): boolean {
  return (
    a.streak === b.streak &&
    a.longestStreak === b.longestStreak &&
    a.lastActiveDate === b.lastActiveDate &&
    a.streakFreezeAvailable === b.streakFreezeAvailable &&
    a.freezeWeekStart === b.freezeWeekStart &&
    a.activityLog === b.activityLog
  );
}

/**
 * Mirrors the streak/freeze/activity-log slice of useWellnessStore to
 * Firestore (`users/{uid}/meta/wellness`) — the "don't lose my streak on
 * reinstall" safeguard from CHALLENGES_PLAN.md §3.3. AsyncStorage remains the
 * source of truth for everything else (in-memory scores, surprise-badge
 * flags, etc. are deliberately not mirrored).
 *
 * On first becoming ready for a given uid: fetch the remote snapshot, merge
 * it with whatever's already local (see utils/streakMerge.ts), apply the
 * merged result locally, and push it back so both sides converge. After
 * that, local changes are pushed with a debounce so rapid updates (e.g. a
 * session completing right after app open) collapse into one write.
 *
 * Entirely offline-safe: every Firestore call is best-effort (see
 * services/streakSync.ts) — a failed read/write just leaves AsyncStorage as
 * the only copy until the next sync attempt.
 */
export function useWellnessCloudSync(): void {
  const { user } = useAuth();
  const uid = user?.uid;

  /** uid currently being (or already) hydrated — guards against re-running
   * for the same uid, while still re-triggering when uid changes (e.g. a
   * guest account converting to a real one mid-session). */
  const hydratingForRef = useRef<string | null>(null);
  /** uid for which hydration has completed — gates the debounced push so we
   * never overwrite Firestore with pre-merge local state. */
  const readyForRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uid || hydratingForRef.current === uid) return;
    hydratingForRef.current = uid;

    void (async () => {
      // Wait for useWellnessStore's own AsyncStorage rehydration to finish
      // first — otherwise snapshotFromStore() would capture the store's
      // default (zeroed) initial state instead of the real local streak,
      // and the merge below could wrongly let a stale/empty remote "win".
      if (!useWellnessStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useWellnessStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      }

      const remote = await fetchWellnessSnapshot(uid);
      if (remote) {
        const merged = mergeWellnessSnapshots(snapshotFromStore(), remote);
        useWellnessStore.setState(merged);
        await pushWellnessSnapshot(uid, merged);
      } else {
        await pushWellnessSnapshot(uid, snapshotFromStore());
      }
      readyForRef.current = uid;
    })();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    const unsub = useWellnessStore.subscribe((state, prevState) => {
      if (readyForRef.current !== uid) return;

      const next: WellnessSnapshot = {
        streak: state.streak,
        longestStreak: state.longestStreak,
        lastActiveDate: state.lastActiveDate,
        streakFreezeAvailable: state.streakFreezeAvailable,
        freezeWeekStart: state.freezeWeekStart,
        activityLog: state.activityLog,
      };
      const prev: WellnessSnapshot = {
        streak: prevState.streak,
        longestStreak: prevState.longestStreak,
        lastActiveDate: prevState.lastActiveDate,
        streakFreezeAvailable: prevState.streakFreezeAvailable,
        freezeWeekStart: prevState.freezeWeekStart,
        activityLog: prevState.activityLog,
      };
      if (snapshotsEqual(next, prev)) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void pushWellnessSnapshot(uid, next);
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [uid]);
}
