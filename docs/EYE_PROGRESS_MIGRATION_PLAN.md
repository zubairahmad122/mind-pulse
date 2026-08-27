# Eye Progress System — Migration Plan (Phase 1A deliverable)

**Status:** Plan only. Nothing in this document has been merged or deleted.
**Scope:** Eye progress / activity-history systems.
**Out of scope:** Sleep, Mind/Relax, and the app-wide streak (they share infra but
are not part of this migration).

---

## 1. Why migrate

Today, "eye progress" is spread across several systems that each answer a
slightly different version of the same question — *what did the user do for
their eyes, and when?* They mostly agree, but they are:

- persisted in different places (Zustand AsyncStorage slice, dedicated
  AsyncStorage keys, a Firestore subcollection),
- keyed by different identifiers (`'eye-reset'` vs `'cvs-protocol'` were both
  stored, until Phase 1A made them resolve to one activity id at read time),
- counted with different semantics (`useProgressStore` counts feature usage;
  `eyeProgressPersistence` counts sessions; `dailyEyeGoalsPersistence` counts
  breaks and "played today" separately),
- computed independently for the same screen (Eye landing's score comes from
  `useEyeScore`, its week dots/streak from `useEyeProgress`, its "Today X/3"
  from the score breakdown).

Phase 1A fixed the two visible symptom bugs (the `eye-reset → comet-trace`
mapping and the 3:30/5-min duration drift) and introduced the single
`EYE_ACTIVITY_META` metadata source. This plan is the next step: consolidate
the *progress* side without losing history.

## 2. Current systems (inventory)

| System | Where | Persists | Drives |
|--------|-------|----------|--------|
| `useProgressStore` | `src/stores/useProgressStore.ts` | Zustand + AsyncStorage `mindpulse-progress` | Weekly session dots (home), daily completion flags, `hasCompletedAnySession`, last-feature tracking |
| `eyeProgressPersistence` | `src/services/eyeProgressPersistence.ts` | Firestore `users/{uid}/eyeSessions` + AsyncStorage `@mindpulse/eye-sessions:<uid>` | `useEyeProgress` (week dots, eye streak), `useEyeScore` (recovery sessions today), Eye landing "done today" |
| `useEyeProgress` | `src/hooks/useEyeProgress.ts` | (read-only above) | Eye landing week card, CVS completion record |
| `useEyeScore` | `src/hooks/useEyeScore.ts` | (computed) | Eye landing comfort score, recommendation gating |
| `dailyEyeGoalsPersistence` | `src/services/dailyEyeGoalsPersistence.ts` | AsyncStorage `@mindpulse/daily-eye-goals...` | breaks taken, "game played today" |
| `eyeGameProgress` | `src/services/eyeGameProgress.ts` | AsyncStorage + Firestore | game XP / levels |
| `eyeComfortPersistence` | `src/services/eyeComfortPersistence.ts` | AsyncStorage + Firestore | comfort before/after records |
| `useWellnessStore` | `src/stores/useWellnessStore.ts` | AsyncStorage `mindpulse-wellness` + Firestore mirror | app-wide streak, activity log (not eye-specific) |

## 3. Known inconsistencies (verified)

1. **Two type strings for one activity.** `CVSProtocolScreen` records
   `'eye-reset'`; the recovery id is `'cvs-protocol'`. Phase 1A added
   `eyeSessionTypeToRecoveryId()` so reads agree, but **new records are still
   written under the legacy type**. The migration should stop writing
   `'eye-reset'` (or normalize at write).
2. **`useProgressStore.logEyeExercise` appears orphaned.** Eye Reset completion
   goes through `useEyeProgress.recordCompletion`; the store's eye counter is
   not fed by the Eye Reset flow. Verify call sites before deciding whether the
   store's eye counters should be derived from session history instead.
3. **Two "streaks".** The app-wide streak (`useWellnessStore`) and the
   eye-only streak (`useEyeProgress.calcStreak`, 365-day window) can differ.
   The plan keeps both (different meanings) but must state the source of truth
   for each so future screens don't mix them up.
4. **Score recomputes from raw sessions on every load.** `useEyeScore` reads
   the last 300 session records. Once session history grows, this should read a
   derived daily summary rather than replay raw events.

## 4. Target design (proposal)

**One eye-activity history service** as the single source of truth:

- A unified record:
  ```ts
  type EyeActivityRecord = {
    activityId: string;     // 'cvs-protocol' | 'focus-switch' | 'eye-break'
    source: 'session' | 'game' | 'break' | 'companion';
    dateKey: string;        // 'sv' locale date
    completedAt: number;
    extra?: {              // optional, activity-specific
      comfortBefore?: EyeComfortRating;
      comfortAfter?: EyeComfortRating;
      score?: number;
    };
  };
  ```
- Written **only** by the flow that completes the activity (CVS completion,
  game end, break complete), in one place.
- Read through derived selectors: `todayDone`, `weekDots`, `eyeStreak`,
  `recoverySessionsToday`, `breaksToday`, `gamePlayedToday` — no reader
  recomputes raw records.
- Metadata (title/subtitle/duration/accent) comes from `EYE_ACTIVITY_META`
  (already centralized in Phase 1A); records store only `activityId`.

## 5. Phased execution (each phase lands independently)

### Phase A — Write-side normalization
- Stop writing `'eye-reset'`; write `'cvs-protocol'` directly.
- Keep `eyeSessionTypeToRecoveryId()` as a compatibility shim for old rows.
- Add `source` to new records (optional field; old rows remain valid).

### Phase B — Derived-read consolidation
- Build a single `getEyeActivitySummary(uid, dateKey)` (local cache first,
  Firestore merge, same offline-first pattern as today).
- Repoint `useEyeProgress`, `useEyeScore`, `useDailyEyeGoals`, and the Eye
  landing screen to it. Delete no store yet — keep both implementations
  side-by-side and compare in dev (a "dual-write + diff" check).

### Phase C — Backfill & key migration
- One-time migration: read legacy `@mindpulse/eye-sessions:*` +
  `mindpulse-progress` eye counters, write unified records, mark migration
  version. Idempotent; safe on reinstall.
- Firestore: leave the existing subcollection, add `activityId`/`source`
  going forward. Do **not** rewrite cloud history in one shot — chunk and
  verify.

### Phase D — Cleanup
- Remove `useProgressStore` eye counters only after confirming no reader
  depends on them (home weekly dots, challenges, continue-journey).
- Update `src/stores/STATE_OWNERSHIP.md` and this plan to "completed".
- Regression suite: streak continuity, week dots across a migration, offline
  write → online merge, guest vs signed-in.

## 6. Non-goals (do not do in this effort)

- Do **not** merge `useProgressStore` and `eyeProgressPersistence` into one
  store in a single step (risk: one regression breaks every pillar).
- Do **not** delete any progress store or Firestore logic during migration.
- Do **not** change the app-wide streak semantics.
- Do **not** introduce a separate "tracking activity" screen.

## 7. Risks & rollback

| Risk | Mitigation |
|------|-----------|
| Offline writes lost during key migration | Write to both old and new keys until Phase D; dedupe on read |
| Streak drift across migration | Keep `calcStreak` semantics; golden-test with the existing streak tests (`streakMerge.test.ts`) |
| Dual-write divergence | Dev-only diff logger; assert equal counts in CI |
| Guest → signed-in history merge | Reuse `mergeSessions` pattern from `eyeProgressPersistence` |
| Rollback | Every phase is additive (new key + shim reads) until the final cleanup, so reverting = stop writing new keys and keep old readers |

## 8. Success criteria

- One module answers "eye activity history" for every consumer.
- No `'eye-reset'` writes after Phase A ships (reads still tolerate legacy rows).
- No UI card derives duration or accent from a local literal (all via
  `EYE_ACTIVITY_META`).
- Full jest + tsc + lint green after each phase.
