# 🔥 MindPulse — Engagement & Habit-Formation Plan

> **Status:** Reviewed and finalized. Ready to implement in priority order (§9).
>
> **Goal:** Turn one-off sessions into a daily habit using proven psychological
> patterns (endowed progress, streaks, loss aversion, variable reward) —
> without tipping into anxiety-inducing dark patterns, which would contradict
> a *stress-relief* app's core promise. Feel like a premium wellness product,
> not a gamified habit tracker.

---

## 0. The psychology being used (and why it fits here)

| Pattern | Effect | Source example |
|---|---|---|
| **Endowed progress effect** | People are more likely to finish a task if they believe they've already made progress on it, even artificially. A car-wash loyalty card pre-stamped 2/10 gets finished faster than a blank 8-stamp card. | Classic Nunes & Drèze study; used in LinkedIn "Profile strength" |
| **Streaks + loss aversion** | Losing something already owned (a streak) hurts more than never having gained it. Duolingo's "streak wager" showed a **14% boost in Day-14 retention**. | [Duolingo streak breakdown](https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f) |
| **Variable reward** | Unpredictable reward timing keeps dopamine elevated longer than fixed schedules — badges shouldn't all fire on obvious milestones. | [StriveCloud gamification examples](https://www.strivecloud.io/blog/app-engagement-examples) |
| **Identity reinforcement** | Users who see themselves as "a person who does this daily" are more resilient than users who are just afraid of losing a number. Frame copy around identity ("3-day eye-care habit"), not just the raw streak count. | Duolingo "Streak Society" |
| **Progress-over-count** | People respond more to visible *improvement* than to a raw counter — a filling bar per pillar reads as growth, not just attendance. | Informs §5 Weekly Wellness Score |

**Guardrail:** MindPulse's brand is calm/anti-stress. Loss-aversion nudges must
stay gentle (a soft "your streak is waiting" push, never a guilt-trip or a red
warning badge) and streak breaks must never block core content or feel
punitive — a missed day should cost nothing but the number resetting. This is
a deliberate tone tradeoff versus Duolingo's more aggressive style.

**Explicitly out of scope — do not build:** XP, coins, gems, energy systems,
loot boxes, leaderboards, or competitive rankings. MindPulse is a mental
wellness app, not a game — grinding for points makes the experience
transactional instead of calming. Stick to streaks, badges, gentle progress,
and wellness insights.

---

## 1. Current state (from codebase audit)

- **Streak is sleep-only and not unified.** `calculateStreak()` in
  `src/utils/sleepUtils.ts:10` derives a streak live from sleep sessions only
  — ignores eye/relax/mind activity. Shown in `ProfileScreen.tsx:161` and
  `ReportScreen.tsx:186`.
- **A full streak implementation already exists but is dead code.**
  `src/stores/useUserStore.ts` has `streak` / `incrementStreak` /
  `resetStreak` / `streakFreezeUsed`, persisted to AsyncStorage — but nothing
  calls `incrementStreak`/`resetStreak` anywhere. It's only read by an
  orphaned `src/screens/mp/*` tree not wired into the router. **Reusable raw
  material, currently inert.**
- **`useWellnessStore`** already has the right shape for a challenges hub —
  `wellnessScore`, per-pillar scores (`eyeScore`/`sleepScore`/`relaxScore`/
  `mindScore`), `dailyChallenge`, `challengeCompleted`, `badges[]` — but it's
  **in-memory only, not persisted**, so all of this resets on every app
  restart. The per-pillar scores are exactly what §5's Weekly Wellness bars
  need — no new data model required there.
- **`useProgressStore`** already tracks `todaySessions` / `todayDate` per
  feature (eye/eyeGames/relax/mind/sleep) and lifetime completion counts —
  this is the reliable source of truth for "did the user do something today,"
  and `DailyChallenge.tsx:35-39` already reads it this way.
- **Home screen** (`HomeDashboardScreen.tsx`) already renders `DailyTip`,
  `DailyChallenge`, `FeatureGrid`, `ContinueJourney`, and `MPProgressRing`
  (composite score ring, `src/utils/scoring.ts`). No "X% already done" nudge
  exists yet anywhere.
- **Notifications are wired** (`expo-notifications`, dynamically imported) for
  eye-break reminders (`src/services/eyeBreakNotification.ts`) and sleep
  alarms (`src/services/sleepAlarm.ts`) — same pattern can be reused for a
  streak reminder, no new native setup required.
- **Analytics** (`src/services/analytics.ts`, Firebase) tracks relax session
  events and paywall/purchase events — **nothing streak/challenge-related
  yet**.
- **`EYE_REDESIGN.md`** already plans an eye-specific streak flame animation
  (`useEyeProgress`) — this plan should absorb that into the app-wide streak
  rather than duplicate a second, eye-only streak concept.

---

## 2. Feature 1 — "Already in progress" nudge (endowed progress)

**Where:** Top of Home screen, above `DailyChallenge`, and once during
onboarding completion.

**Mechanic:** On first app open after onboarding, seed real progress instead
of showing 0% — e.g. "You're already 20% toward today's wellness goal" by
crediting completing onboarding + setting a bedtime goal as legitimate partial
progress (not fake). On every subsequent open, show *today's* real completion
percentage across the 3 pillars (eye/sleep/mind), e.g.
`doneToday / totalDailyTargets`.

**Implementation:**
- New derived selector in `useWellnessStore`: `todayProgressPercent`, computed
  from `useProgressStore.todaySessions` (3 possible slots: eye, relax/mind,
  sleep → each done = +33%).
- Reuse existing `GlassCard` + a horizontal progress bar component (new,
  small — `src/components/home/TodayProgressBar.tsx`) rather than the
  circular `MPProgressRing` (that's the lifetime/composite score, this is
  today-only — keep them visually distinct so users don't confuse "today"
  with "overall").
- Onboarding-completion seed: in `useUserStore`'s onboarding-complete action,
  stamp one `todaySessions` slot as pre-credited (e.g. "profile setup" counts
  toward the mind pillar) so Day 1 never starts at a discouraging 0%.

---

## 3. Feature 2 — Unify the streak system (fix + expand, don't rebuild)

**Decision:** Retire the dead `useUserStore` streak fields and the
sleep-only `calculateStreak()` display value. Build one **app-wide streak**
in `useWellnessStore`, counting a day as "kept" if **any** pillar
(eye/relax/mind/sleep) was completed that day — sourced from
`useProgressStore`'s existing daily completion tracking, which already
distinguishes per-feature.

**New state in `useWellnessStore`:**
```ts
streak: number;
longestStreak: number;
lastActiveDate: string | null; // yyyy-mm-dd
streakFreezeAvailable: boolean; // resets true every Monday
```
Persist this store (currently it isn't — add `zustand/persist`, key
`mindpulse-wellness`, matching the pattern already used in
`useSleepStore`/`useProgressStore`).

**Update trigger:** a single `checkAndUpdateStreak()` call, invoked once per
app foreground (in `src/app/(app)/_layout.tsx`, alongside the existing
notification-response wiring) — compares `lastActiveDate` to today/yesterday,
increments/resets/applies streak-freeze accordingly. This replaces
`calculateStreak()`'s sleep-only read in `ProfileScreen.tsx` and
`ReportScreen.tsx` with the unified value.

**Streak freeze — finalized: automatic, 1/week, never user-managed.** No
equip/earn step. On a missed day, silently consume the week's freeze and
surface a supportive line:

> "We've protected your streak this time. Your weekly streak freeze was used."

Never a warning-toned message. Users should feel supported, not punished —
wellness apps should reduce stress, not create it.

---

## 4. Feature 3 — New 6th tab: **Challenges**

**Nav change:** `src/constants/navigation.ts` — add
`{ name: 'challenges', title: 'Challenges', icon: Flame, iconFocused: Flame }`
to `MAIN_APP_TABS`, plus a matching `src/app/(app)/(tabs)/challenges.tsx`
route (following the same re-export pattern as `home.tsx`).

**Daily Challenge card placement — finalized: both, at different depths.**
- **Home:** keep the existing compact `DailyChallenge.tsx` card — title,
  one-line description, % complete — just enough to remind, tapping through
  to the Challenges tab.
- **Challenges tab:** the full experience — challenge detail, progress,
  reward, and history.
- *Reason: Home motivates, Challenges manages.*

**Screen content (top to bottom):**
1. **Streak hero** — large flame + streak count, longest streak, "streak
   freeze available" indicator (reusing the unified streak from §3).
2. **Weekly Wellness Score** — see §5 below.
3. **Today's Journey** — see §6 below.
4. **Weekly calendar strip** — 7 day-dots, filled/empty based on
   `useProgressStore` history, so users see the week taking shape (a second,
   smaller endowed-progress surface).
5. **Daily Challenge (full)** — detail, progress, reward, history.
6. **Badges grid** — render `useWellnessStore.badges`, locked vs. unlocked
   states, using variable-reward timing (§7) rather than one badge per
   round-number milestone.

**Why a new tab and not just a Home section:** the existing Home screen is
already dense (tip, challenge, feature grid, continue-journey). A dedicated
tab gives streaks/badges a permanent, discoverable "home base," and gives you
a single screen to point future notifications/deep-links at.

---

## 5. Feature — Weekly Wellness Score (new, high-impact addition)

Rather than surfacing only the streak count, show *improvement* — people
respond more to visible growth than to a raw counter.

```
🔥 16 Day Streak

Weekly Wellness
████████░░ 82%

Mind
██████████

Sleep
███████░░░

Eyes
████████░░
```

**Implementation:** this maps directly onto data that already exists —
`useWellnessStore.wellnessScore` for the overall bar, and
`eyeScore`/`sleepScore`/`mindScore` (relax folds into "Mind" for display,
matching the existing 0.3/0.3/0.2/0.2 weighting in
`calculateWellnessScore()`) for the per-pillar bars. New component:
`src/components/challenges/WeeklyWellnessCard.tsx`. No new store fields
needed — this is purely a new rendering of data §1 confirmed already exists.

---

## 6. Feature — Today's Journey (new, high-impact addition)

Encourage using the whole app, not one feature, by presenting today as a
simple timeline instead of independent modules:

```
Morning
✓ Eye Exercise (2 min)

Afternoon
✓ Focus Break

Evening
○ Relax Session

Night
○ Sleep Meditation
```

Completing all four in a day awards a **⭐ Perfect Day** (via the existing
`awardBadge` action).

**Implementation note:** don't add new timestamp tracking — map each
existing `useProgressStore.todaySessions` feature flag to a fixed suggested
slot (`eye → Morning`, `eyeGames`/short break → `Afternoon`, `relax`/`mind` →
`Evening`, `sleep` → `Night`). This is a *suggested routine order* for
display, not a literal completion-time log, so it needs zero new data model
work — just a new component (`src/components/challenges/TodaysJourney.tsx`)
reading data that's already tracked.

---

## 7. Feature — Badges with variable-reward timing

Expand `awardBadge` usage beyond obvious round numbers. Mix:
- **Predictable milestones:** 3-day, 7-day, 30-day streak, ⭐ Perfect Day,
  Perfect Week (users expect these — predictability matters for the identity
  effect).
- **Surprise badges:** e.g. "Night Owl" (session after 11 PM), "Comeback"
  (returned after a 3+ day gap — reframe lapses positively instead of only
  punishing them) — awarded at unpredictable moments to extend engagement.

---

## 8. Feature — Loss-aversion notification (gated intelligently)

Reuse the `eyeBreakNotification.ts` / `sleepAlarm.ts` pattern to add
`src/services/streakReminder.ts`. **Finalized firing rules — all must hold:**
- Today's streak slot is not yet completed.
- After ~7 PM local time.
- Before the user's own bedtime (from `useSleepStore`, if set).
- At most once per day.
- Skipped entirely if today's goal is already done.

**Approved copy (supportive, never loss-framed):**
> 🌙 Your wellness streak is waiting. Take five peaceful minutes before bed.

> You're one session away from keeping today's streak alive.

**Explicitly avoid:**
> ❌ "Don't lose your streak."
> ❌ "Your progress is disappearing."

These create anxiety, which conflicts with MindPulse's purpose.

---

## 9. Feature — Tiny Wins (post-session micro-copy)

Every completed session should end with something affirming, not a flat
"Finished." Rotate through a varied pool so it doesn't become repetitive —
e.g. a small `src/utils/tinyWins.ts` returning a random pick, wired into each
pillar's existing session-complete flow (the relax flow already fires
`relax_session_complete` in `analytics.ts`, giving a ready integration point;
eye/sleep completion flows get the same treatment).

Examples:
- 🌱 Great job. You showed up today.
- 🌙 Your mind feels a little lighter.
- 💙 One small step counts.
- ✨ You're building a healthier routine.

---

## 10. Analytics additions (`src/services/analytics.ts`)

New events alongside the existing relax/paywall events: `streak_incremented`,
`streak_broken`, `streak_freeze_used`, `challenge_completed`,
`badge_unlocked`, `challenges_tab_viewed`, `today_progress_bar_shown` (with
the % value, to correlate with session-start conversion),
`perfect_day_awarded`.

---

## 11. Priority order for implementation

| # | Item | Why this order |
|---|---|---|
| 1 | **Unified streak system** | Foundation — §5–9 all read from it |
| 2 | **Already-in-progress progress bar** | High visibility, low complexity, immediate endowed-progress payoff |
| 3 | **Challenges tab** | Needs #1 done; gives every later feature a home |
| 4 | **Badges** | Needs #3's grid UI |
| 5 | **Evening reminder notification** | Needs #1 (today's-completion signal) and bedtime data |
| 6 | **Weekly Wellness dashboard** | Pure rendering of existing scores — cheap once #3 exists |
| 7 | **Today's Journey timeline** | Same — cheap once #3 exists |
| 8 | **Monthly insights and trends** | Longer-horizon, builds on all of the above being live first |

Each phase is independently shippable and testable — recommended to
implement and review one at a time rather than all at once, given how many
stores this touches (`useWellnessStore`, `useUserStore`, `useProgressStore`,
navigation config, and a new screen).

---

## 12. Note on Tiny Wins / micro-copy location

Not yet confirmed: the exact current implementation of each pillar's
session-complete screen (only the relax flow's analytics hook was confirmed
during the codebase audit). Before building §9, a quick check of the eye and
sleep completion flows is needed to find the right integration point in
each — flagged here so it isn't missed during implementation rather than
assumed.
