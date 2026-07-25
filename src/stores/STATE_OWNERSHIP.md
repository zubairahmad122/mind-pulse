# State Ownership — MindPulse

This document records which system owns each piece of application state.
When adding new state, place it in the correct slice and document it here.

---

## Zustand Stores (`src/stores/`)

| Store | Domain | Persists |
|-------|--------|----------|
| `useSleepStore` | Sleep settings, local sleep sessions (last 30), last-night summary | AsyncStorage (`mindpulse-sleep`) |
| `useUserStore` | Onboarding status, Pro flag, trial end date, language preference | AsyncStorage (`mindpulse-user`) |
| `useProgressStore` | Feature usage counts, weekly/daily session completions, continue-journey tracking | AsyncStorage (`mindpulse-progress`) |
| `useWellnessStore` | Computed wellness/eye/sleep/relax/mind scores (in-memory, derived), unified app-wide streak, streak freeze, activity log, daily challenge, badges, assigned daily-challenge pillar, surprise-badge flags (Perfect Day / Night Owl / Comeback) | Streak/freeze/activity-log/badges/assignedChallenge/surprise-badge flags persisted to AsyncStorage (`mindpulse-wellness`); scores/challenge stay in-memory. The streak/freeze/activity-log slice only is additionally mirrored to Firestore (`users/{uid}/meta/wellness`) via `useWellnessCloudSync` — AsyncStorage remains the source of truth, Firestore is a best-effort "don't lose my streak on reinstall" backup |

---

## React Context (`src/context/`)

| Context / Provider | Domain | Source of truth |
|--------------------|--------|-----------------|
| `AuthContext` | Firebase Auth user, guest mode, loading state | Firebase Auth (`getAuth()`) |
| `SubscriptionContext` | RevenueCat premium status, customer info | RevenueCat SDK + async local cache (`@mindpulse/subscription-cache`) |
| `SleepContext` | Remote sleep sessions (Firestore), guest-mode local sessions | Firestore subcollection `users/{uid}/sleepSessions` with AsyncStorage fallback |
| `RelaxContext` | Active relax session, completed relax history, volumes, selected sound | Firestore subcollection `users/{uid}/relaxSessions` with AsyncStorage fallback |
| `AlarmOverlayContext` | Permission state for Android alarm overlay | Platform / native module |
| `LanguageContext` | Current language code, translations, TTS scripts | AsyncStorage (`@mindpulse/language`) |
| `PillarContext` | Currently selected pillar for tab navigation | Component-local (not persisted) |
| `PaywallProvider` | Soft-paywall visibility and feature gating | Component-local |
| `GlassTabBar` (`TabBarSpaceProvider`) | Bottom tab bar height for safe-area-inset screens | Derived from native dimensions |
| `TabBarSpaceProvider` | Safe area inset for tab bar spacing | Derived from native dimensions |

---

## Custom Hooks (`src/hooks/`)

| Hook | What it manages | Persists |
|------|-----------------|----------|
| `useAlarmSettings` | Smart alarm, ringtone, vibration, snooze, volume, label, dark mode | AsyncStorage (`@mindpulse/alarm-settings`) |
| `useSleepSchedule` | Bedtime, wake time, duration for sleep plan | AsyncStorage (keyed by UID) |
| `useSleepRecommendation` | Gemini AI tip + rule-based fallback, fingerprint + caching | Gemini API + AsyncStorage cache |
| `useDailyTip` | Daily wellness tip (Gemini + cache) | Gemini API + AsyncStorage cache |
| `useHomeInsight` | Home screen insight text (Gemini + cache) | Gemini API + AsyncStorage cache |
| `useEyeScore` | Eye exercise score (computed + cached) | Firestore per-user cache |
| `useMindScore` | Mind score from journal + recovery sessions | Firestore per-user cache |
| `useSleepScore` | Sleep quality score from recent sessions | Firestore per-user cache |
| `useJournal` | Journal entries (time, mood, triggers, text, AI insight) | Firestore store + AsyncStorage per-user cache |
| `useRoastMode` | Toggle for eye-exercise roast intensity | AsyncStorage (`@mindpulse/roast-mode`) |

---

## Cross-cutting Notes

- `user.isPro` lives in **Zustand (`useUserStore`)** — do **not** duplicate in another store.
- Subscription / RevenueCat premium status lives in **SubscriptionContext** — mirror it into Zustand only if cross-hook performance requires it.
- The **unified, app-wide streak** lives in **Zustand (`useWellnessStore`)** — a day counts if *any* pillar (eye/relax/mind/sleep) was completed, sourced from `useProgressStore`'s daily completion flags via the `useStreakSync` hook (`src/hooks/useStreakSync.ts`), called once from `(app)/_layout.tsx`. It replaced two prior, narrower concepts: `useUserStore`'s streak fields (removed — were dead code, never wired to any action) and `calculateStreak()` in `src/utils/sleepUtils.ts` (kept, but now sleep-night-specific only — still used by `SleepScreen`, `achievements.ts`, and `useSleepReadiness`, which legitimately want a sleep-only streak, not the app-wide one).
- Streak paywall dismissal lives in **AsyncStorage** keyed by UID (`@mindpulse/streak-paywall-shown:<uid>`); the paywall's streak threshold now reads `useWellnessStore`'s unified streak, not the old sleep-only one.
- All AsyncStorage keys **must** start with `@mindpulse/` to avoid collisions (Zustand `persist` store names — `mindpulse-user`, `mindpulse-sleep`, `mindpulse-progress`, `mindpulse-wellness` — are the one established exception, predating this convention).
- The daily-challenge target is assigned once per local day and pinned in `useWellnessStore.assignedChallenge` (via `assignDailyChallengeIfNeeded`, called from `useDailyChallengeStatus`) — it does **not** recompute live from current scores, so completing a session mid-day can't silently swap the displayed challenge. Streak crediting is unaffected: any pillar still counts toward the streak regardless of which pillar was assigned.
- Recovery/journal reads for Mind Score & Achievements go through `services/recoveryPersistence.ts` (`loadRecoverySessionsToday`) and `services/journalPersistence.ts` (`loadJournalDateKeys`) — both `useMindScore` and `useUnlockedAchievements` call these instead of duplicating raw AsyncStorage reads.
- Pure date arithmetic (local-day-safe, never UTC-slicing) lives in `utils/dateUtils.ts`; pure wellness-snapshot merge logic (for the Firestore mirror) lives in `utils/streakMerge.ts`; Firestore I/O for that mirror lives in `services/streakSync.ts`.

---

_Last updated: 2026-07-24 — daily challenge pinned per-day, surprise badges (Perfect Day / Night Owl / Comeback) added, evening reminder notification added, Firestore streak mirror added._
