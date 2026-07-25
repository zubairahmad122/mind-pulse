# 🔥 MindPulse — Challenges Screen & Streak System

> **Full Plan:** Current architecture (as-built) + known gaps + improvement roadmap.
> **Status:** Core streak system is ALREADY IMPLEMENTED. This doc is the single source
> of truth for how it works and what remains.
>
> Related: `ENGAGEMENT_PLAN.md` (original decisions: unified streak, any pillar counts,
> automatic weekly freeze, no XP/coins/leaderboards).

---

## Part 1 — Current Architecture (As Built)

### 1.1 File Map

| File | Role |
|---|---|
| `app/(app)/(tabs)/challenges.tsx` | Route shim — re-exports the screen |
| `screens/app/ChallengesScreen.tsx` | Main screen: streak hero, week strip, daily challenge, achievements preview, weekly wellness |
| `components/home/DailyChallenge.tsx` | Reusable card (Home + Challenges) + `useDailyChallengeStatus` hook |
| `stores/useWellnessStore.ts` | Persisted streak / freeze / activity-log state (`mindpulse-wellness`) |
| `stores/useProgressStore.ts` | Persisted per-feature session counters + today's completion flags (`mindpulse-progress`) |
| `hooks/useStreakSync.ts` | Glue keeping the two stores in sync — mounted once globally in `app/(app)/_layout.tsx` |
| `hooks/useUnlockedAchievements.ts` | Unlocked/locked computation (shared by preview + full screen) |
| `constants/achievements.ts` | 12 hardcoded achievement definitions |
| `utils/scoring.ts` | Focus-area logic + MindPulse composite score |
| `utils/dateUtils.ts` | Date helpers (incl. `getMondayISO` for weekly freeze anchor) |

### 1.2 Data Flow (One Diagram)

```
Session completes (eye / relax / mind / sleep)
        │
        ▼
logEyeExercise() / logMindSession() / logSleepSession() ...
        │
        ▼
useProgressStore ──► todaySessions.{eye|mind|sleep|relax} = true
        │                    (auto-resets when todayDate ≠ today)
        │
        ▼
useStreakSync (global, _layout.tsx)
  derives: completedToday = ANY pillar done today
        │
        ▼
useWellnessStore.checkAndUpdateStreak(completedToday)
        │
        ├─ already credited today ──► no-op (refresh freeze bookkeeping)
        ├─ nothing done today ─────► no-op
        ├─ gap = 1 day (or first) ─► streak +1        event: incremented
        ├─ gap = 2 days + freeze ──► streak +1, freeze consumed   event: frozen
        └─ otherwise ──────────────► streak = 1       event: reset
        │
        ▼
activityLog (last 35 dates) appended ──► "This Week" dot strip
lastStreakEvent set ──► StreakCelebrationBanner toast (~2.8s)
                        └─► acknowledgeStreakEvent() clears it
```

### 1.3 Daily Challenge Selection

- 3 hardcoded challenges keyed by **weakest pillar** (`getFocusArea(eye, sleep, mind)` — min score, ties → Eyes):

| Weakest | Challenge | Route |
|---|---|---|
| Eyes | Eye Reset (CVS protocol) | `/(app)/cvs-protocol` |
| Sleep | Sleep Session (track tonight) | `/(app)/(tabs)/sleep?tab=tonight` |
| Mind | Box Breathing | `ROUTES.appBoxBreathing` |

- **Not persisted** — recalculated live every render from current scores.
- "Done today" = `useDailyChallengeStatus(worstArea)` reads `useProgressStore`:
  `hasAnySession && todayDate === today && todaySessions[featureKey]`.
- Single source of truth shared by Home card + Challenges hero (cannot disagree).

### 1.4 Streak Freeze

- **1 automatic grace day per calendar week** (Monday-anchored via `getMondayISO`).
- Auto-refills when a new week starts.
- Consumed silently when gap = exactly 2 days; user sees "🧊 Streak Saved" toast + badge pill state change.
- Matches ENGAGEMENT_PLAN decision: automatic, not earned/equipped. ✅

### 1.5 Achievements (12 total)

Computed live from real data — same hook for preview grid + full screen (counts never drift):

- **Sleep-based** (SleepContext sessions): first session, 3/7/30-night streaks, session counts, 5-star rating, 8+ hour night.
- **Eye-based**: 7-day eye streak (`useEyeProgress`).
- **Extras** (AsyncStorage per-user): `@mindpulse/recovery:{uid}` ≥3 today, `@mindpulse/journal:{uid}` ≥5 entries.

### 1.6 Screen Layout (Top → Bottom)

1. `StreakCelebrationBanner` — floating toast (absolute), post-event only
2. **Streak hero** — 🔥 N Days, weekly progress bar (weeklyDaysActive/7), CTA → today's challenge OR green "Completed today" pill, freeze badge, longest-streak footnote (≥3 only)
3. **This Week strip** — 7 dots Mon–Sun from `activityLog`
4. **Daily Challenge card** — shared Home component; reward badge pill OR "DONE" pill
5. **Achievements card** — unlockedCount/total, progress bar, 12-badge grid preview → `/(app)/achievements`
6. **Weekly Wellness row** — composite score `0.35·eye + 0.35·sleep + 0.30·mind` → `/(app)/report`

### 1.7 Persistence Model

| Store | AsyncStorage key | Persists |
|---|---|---|
| `useWellnessStore` | `mindpulse-wellness` | streak, badges, activityLog (NOT raw scores) |
| `useProgressStore` | `mindpulse-progress` | everything (counters + today flags) |

**No backend/server sync — per-device only.**

---

## Part 2 — Known Gaps & Issues

### 🔴 P0 — Real bugs / user-visible problems

**G1. Daily challenge can switch mid-day.**
Because the challenge is recalculated live from scores, completing an eye session can flip
the weakest pillar to Sleep — the card silently changes target within the same day.
User confusion: "I did today's challenge, why is it showing a new one?"
→ Fix in Part 3.1.

**G2. Completion is decoupled from the displayed challenge.**
`todaySessions` flags are independent booleans. If the card showed "Eye Reset" but the
user did Box Breathing, the Mind flag flips — and if Mind was the weakest pillar at that
render, the challenge shows DONE even though the *displayed* challenge was never done.
Combined with G1 this makes "challenge complete" semantics fuzzy.
→ Same fix: persist the assigned challenge (Part 3.1).

**G3. No timezone/day-boundary hardening documented.**
`todayDate === today` comparisons + `getMondayISO` — verify all date math uses **local
device date consistently** (never UTC ISO slicing like `toISOString().slice(0,10)`,
which shifts the day for UTC+5 Pakistan evenings). Audit `dateUtils.ts`.
→ Part 3.2.

### 🟡 P1 — Data integrity

**G4. No backend sync.**
Reinstall / new device = streak wiped. For v1 (local-only) acceptable, but Firestore
mirror is the single most requested "don't lose my streak" safeguard.
→ Part 3.3.

**G5. Achievements extras live outside the store pattern.**
Recovery/journal counts read ad-hoc AsyncStorage keys, breaking the 3-layer rule
(services/ → domain/ → store/). Works, but fragile — key naming is duplicated at call sites.
→ Part 3.4 (low priority refactor).

**G6. `activityLog` capped at 35 dates.**
Fine for the week strip, but blocks any future "monthly calendar" or insights view.
Cheap to raise to ~370 (1 year ≈ 4 KB). → Part 3.5.

### 🟢 P2 — UX polish (from ENGAGEMENT_PLAN, not yet built)

**G7. Loss-aversion evening notification** — planned, not implemented.
Rules already decided: after 7 PM local, max 1/day, skip if goal done, calm copy
("🌙 Your wellness streak is waiting"), never guilt language.

**G8. Variable-reward surprise badges** — current 12 are all predictable milestones.
Plan called for surprise ones (Night Owl, Comeback, Perfect Week).

**G9. Perfect Day / Today's Journey** — completing all 4 pillars in one day ⇒ ⭐ Perfect Day.
Data already exists (`todaySessions` has all flags) — this is UI + 1 achievement.

---

## Part 3 — Improvement Plan

### 3.1 Persist the assigned daily challenge (fixes G1 + G2) — ~half day

Add to `useWellnessStore` (or a tiny new slice):

```ts
dailyChallenge: {
  date: string;            // local YYYY-MM-DD
  pillar: 'eye' | 'sleep' | 'mind';
  completedAt?: string;    // set when THAT pillar's session completes
}
```

Logic:

1. On first read of the day (or app open): if `dailyChallenge.date !== today`,
   assign ONCE from `getFocusArea(...)` and persist. It does not change again
   that day, regardless of score shifts.
2. `useDailyChallengeStatus` checks `todaySessions[dailyChallenge.pillar]`
   (the assigned pillar — not the live-recomputed weakest one).
3. Streak crediting stays as-is: **any pillar still counts for the streak**
   (ENGAGEMENT_PLAN decision). Only the *challenge card's* target is pinned.
   Two distinct concepts, now cleanly separated:
   - Streak = "did anything today" ✅ unchanged
   - Daily Challenge = "did the specific assigned thing" ✅ now stable

Migration: none needed — field is additive; first launch after update assigns fresh.

### 3.2 Date-handling audit (fixes G3) — ~1–2 hours

- Grep for `toISOString` in date-comparison paths; replace with a single
  `getLocalDateISO()` helper in `dateUtils.ts` (local year-month-day).
- Unit tests (jest): day rollover at 23:59→00:01 local, week rollover Sunday→Monday
  for freeze refill, and the gap=2 freeze path across a month boundary.
- Special case worth a test: sleep sessions that START before midnight and END after —
  decide which day they credit (recommendation: **the day the session ends**, i.e.
  waking up "completes" last night). Document the decision in code.

### 3.3 Firestore streak mirror (fixes G4) — ~1 day, AFTER 3.1

Follow the 3-layer rule:

```
services/streakSync.ts   → Firestore I/O only (users/{uid}/wellness doc)
domain/streak.ts         → pure merge logic (see below)
stores/useWellnessStore  → unchanged shape; hydrate/persist hooks call service
```

Merge policy (conflict = local vs remote):
- `currentStreak`: take the record with the **later lastActiveDate**; if equal dates, take max.
- `longestStreak`: always max(local, remote).
- `activityLog`: set-union of dates, sorted, capped.
- Write-behind: debounce writes (e.g. 5s after change), read once on auth ready.
- Offline = fine; AsyncStorage remains source of truth until next sync.

### 3.4 Achievements extras → store pattern (fixes G5) — ~half day, low priority

Move `@mindpulse/recovery:{uid}` / `@mindpulse/journal:{uid}` reads behind
`useProgressStore` (or a small `useExtrasStore`) so `useUnlockedAchievements`
reads only from stores. No behavior change — pure refactor. Do this only when
touching achievements anyway (e.g. while adding G8 badges).

### 3.5 Raise activityLog cap (fixes G6) — ~15 min

`35 → 370`. Unblocks future monthly calendar + insights without migration pain later.

### 3.6 Evening notification (G7) — ~half day

- Reuse existing notification infra (eye-break + sleep alarm channels exist).
- Schedule daily local notification at ~19:30; on fire-time check
  (via notification handler or background task):
  - skip if `todaySessions` has any true flag
  - max 1/day guaranteed by single scheduled id
- Copy pool (rotate): calm variants only — per ENGAGEMENT_PLAN, never
  "don't lose your streak" phrasing.

### 3.7 Surprise badges + Perfect Day (G8 + G9) — ~1 day

New definitions in `constants/achievements.ts` (data-driven, same hook):

| Badge | Condition | Data source |
|---|---|---|
| ⭐ Perfect Day | all 4 pillars in one day | `todaySessions` all true → log date |
| 🦉 Night Owl | session completed 00:00–04:00 | session timestamp |
| 🔄 Comeback | new streak ≥3 after a reset | wellness store events |
| 💯 Perfect Week | 7/7 days in one Mon–Sun week | activityLog |

Perfect Day also gets a one-shot celebration (reuse `StreakCelebrationBanner`
with a new event type).

---

## Part 4 — Build Order

| # | Task | Effort | Depends on |
|---|---|---|---|
| 1 | 3.2 Date audit + tests | 1–2 h | — |
| 2 | 3.1 Persist daily challenge | 0.5 d | 1 |
| 3 | 3.5 activityLog cap | 15 min | — |
| 4 | 3.6 Evening notification | 0.5 d | — |
| 5 | 3.7 Perfect Day + surprise badges | 1 d | 2 |
| 6 | 3.3 Firestore mirror | 1 d | 2 |
| 7 | 3.4 Extras refactor | 0.5 d | opportunistic |

**Total: ~4 focused days** for the entire remaining streak/engagement roadmap.

---

## Part 5 — Invariants (Do Not Break)

1. **Any pillar counts toward the streak** — never restrict streak to the assigned challenge.
2. **Freeze is automatic** — never make users earn/equip it.
3. **No XP, coins, leaderboards, competitive anything.**
4. **All copy stays calm** — no guilt, no red badges, no "your progress is disappearing."
5. **One source of truth per fact** — challenge status hook is shared; achievements hook is shared. Any new surface reuses the same hooks.
6. Missed day (no freeze) costs exactly one thing: the number resets. Nothing else is lost.
7. All date math is **local-time**, never UTC.

---

*Last updated: 24 Jul 2026 — reflects as-built code traced via Claude Code + planned work from ENGAGEMENT_PLAN.md.*
