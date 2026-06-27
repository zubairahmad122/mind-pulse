# State Ownership — MindPulse

This document records which system owns each piece of application state.
When adding new state, place it in the correct slice and document it here.

---

## Zustand Stores (`src/stores/`)

| Store | Domain | Persists |
|-------|--------|----------|
| `useSleepStore` | Sleep settings, local sleep sessions (last 30), last-night summary | AsyncStorage (`mindpulse-sleep`) |
| `useUserStore` | Onboarding status, Pro flag, trial end date, streak, language preference | AsyncStorage (`mindpulse-user`) |
| `useProgressStore` | Feature usage counts, weekly/daily session completions, continue-journey tracking | AsyncStorage (`mindpulse-progress`) |
| `useWellnessStore` | Computed wellness/eye/sleep/relax/mind scores, daily challenge, badges | In-memory only (derived from other stores) |

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
- Streak lives in **Zustand (`useUserStore`)**; streak paywall dismissal lives in **AsyncStorage** keyed by UID (`@mindpulse/streak-paywall-shown:<uid>`).
- All AsyncStorage keys **must** start with `@mindpulse/` to avoid collisions.

---

_Last updated: 2026-06-28 — initial audit after Reason #2 sprint._
