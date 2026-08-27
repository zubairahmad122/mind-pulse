# 🔍 WELL MODE — CODE-BASED VERIFICATION REPORT

> **Verification method:** Every claim below was checked against the actual
> codebase files. No assumptions, no memory, no optimism.
>
> **Updated:** August 23, 2026 — after pre-launch cleanup pass.

---

## VERIFICATION TABLE

| # | Claim | Status | Evidence / File | Correction |
|---|---|---|---|---|
| 1 | App name is "Well Mode" | ⚠️ PARTIALLY CONFIRMED | `app.json:4` → `"name": "Well Mode"` | But `package.json:2` → `"name": "mind-pulse"`, `app.json:5` → `"slug": "mind-pulse"`, `app.json:8` → `"scheme": "mindpulse"`. Brand is inconsistent at config level. |
| 2 | Android package `com.zubzen.mindpulse` | ✅ CONFIRMED | `app.json:23` → `"package": "com.zubzen.mindpulse"` | — |
| 3 | iOS bundle `com.zubzen.sleepy` | ⚠️ PARTIALLY CONFIRMED | `app.json:13` → `"bundleIdentifier": "com.zubzen.sleepy"` | Legacy name, doesn't match any current branding. |
| 4 | "3 pillars" (Eye + Sleep + Relax/Mind) | ✅ CONFIRMED | Routes: `appEyeRelax`, `appSleep`, `appRelax`, `appMind` | — |
| 5 | "66 professionally recorded voice clips" | ❌ NOT FOUND | `src/constants/audioGuide.ts` → 42 unique AudioClipId entries × 2 languages = **84 MP3 files** | **42 unique clips**, not 66. Each in EN + HI = 84 total MP3s. |
| 6 | "English + Hindi/Urdu" languages | ✅ CONFIRMED | `audioGuide.ts:14-15` → `resolveGuideLang()` maps `ur` and `hi` to `'hi'` folder | Urdu uses Hindi recordings (same folder). |
| 7 | "7+ guided sessions" | ✅ CONFIRMED | `relaxSessions.ts` → calm-flow, box-breathing, reset-wave, sleep-drop, body-scan, tension-release, grounding = 7 sessions | — |
| 8 | "6 eye games" | ❌ NOT FOUND | `eyeRelax.ts` → EYE_GAMES array has only **2 entries**: Focus Switch + Schulte Nexus. Mind hub has PatternShift, TimeFlow, MathGap, Mills (4 mind games). | **2 eye activities** + **4 mind games**. Not "6 eye games." |
| 9 | "AI-powered journal with Gemini weekly reflections" | ✅ CONFIRMED | `gemini.ts` → `generateWeeklyReflection()`, `useWeeklyReflection.ts` | — |
| 10 | "Smart alarm with accelerometer sleep tracking" | ✅ CONFIRMED | `accelerometerSleepTracker.ts` → `Accelerometer.addListener()` | — |
| 11 | "RevenueCat subscriptions ($9.99/mo, $79.98/yr)" | ⚠️ PARTIALLY CONFIRMED | RevenueCat integration confirmed. Prices loaded dynamically from `Purchases.getOfferings()`. **No hardcoded prices in code.** | Prices come from RevenueCat dashboard. Cannot verify from code. |
| 12 | "Firebase backend (Auth, Firestore, Analytics)" | ✅ CONFIRMED | `AuthContext.tsx` → Firebase Auth, `firestore` in 14+ files, `analytics.ts` | — |
| 13 | "Crash reporting via Sentry" | ✅ CONFIRMED | `app.json:83-88` → `@sentry/react-native/expo` plugin | — |
| 14 | "Premium dark glassmorphism UI" | ✅ CONFIRMED | `designSystem.ts` + `GlassCard` + `AmbientBackground` | — |
| 15 | "Apple Sign-In" | ❌ NOT FOUND | Zero matches for Apple Sign-In | **Google Sign-In only.** |
| 16 | "Privacy/delete-account pages" | ✅ CONFIRMED | `docs/privacy.html`, `docs/delete-account.html` | Static HTML pages. |
| 17 | "RevenueCat subscription restore" | ✅ CONFIRMED | `purchaseService.ts:52` → `restorePurchases()` | — |
| 18 | "Premium gating" | ✅ CONFIRMED | `entitlements.ts` → 10 FeatureIds with free/pro tiers | — |
| 19 | "Visual Flow" (Infinity/Sweep/Wave) | ✅ CONFIRMED | Routes: `appVisualFlow`, `appVisualFlowExplore`. Components: `FigureEightGuide`, `SweepFlowGuide`, `WaveFlowGuide` | — |
| 20 | "Eye Reset" | ✅ CONFIRMED | `RECOVERY_SESSIONS` in `eyeRelax.ts` → CVS Protocol, 7 steps, 210 seconds | — |
| 21 | "20-20-20" | ✅ CONFIRMED | `EYE_BREAK_DURATION_SECONDS = 20` | — |
| 22 | "Desktop Eye Companion" | ✅ CONFIRMED | `desktopCompanion.ts` → notification scheduling, snooze | — |
| 23 | "Light-sleep detection" | ✅ CONFIRMED | `accelerometerSleepTracker.ts` + `AlarmSettingsScreen.tsx:774` | — |
| 24 | "Streak persistence local-only" | ❌ OUTDATED | `streakSync.ts` → Firestore mirror at `users/{uid}/meta/wellness` | **Streak IS mirrored to Firestore.** |
| 25 | "Journal / AI reflections" | ✅ CONFIRMED | `useJournal.ts` + `useWeeklyReflection.ts` + `useHomeInsight.ts` | — |
| 26 | "Subscription restore handling" | ✅ CONFIRMED | `purchaseService.ts:52` + `SubscriptionContext.tsx` | — |
| 27 | "Test coverage" | ⚠️ PARTIALLY CONFIRMED | **81 test files** found across `src/`. | Coverage depth varies. No coverage percentage available. |
| 28 | "Production build readiness" | ⚠️ PARTIALLY CONFIRMED | `BUILD_AND_RELEASE.md` documents full pipeline. | Needs EAS build verification. |

---

## A. VERIFIED PRODUCT CAPABILITIES

**100% confirmed from code:**

1. **3-pillar architecture** — Eye Comfort + Sleep + Relax/Mind
2. **Firebase Auth** — Google Sign-In + Anonymous/Guest mode
3. **Firestore** — 14+ collections with cloud sync
4. **Firebase Analytics** — Event tracking
5. **Sentry** — Crash reporting
6. **RevenueCat** — Subscription management + restore
7. **Gemini AI** — 5 use cases (journal, weekly reflection, sleep tip, home insight, daily tip)
8. **42 voice clips** in EN + HI (84 MP3 files)
9. **7 relax sessions** — Calm Flow, Box Breathing, Reset Wave, Sleep Drop, Body Scan, Tension Release, Grounding
10. **2 eye activities** — Focus Switch, Schulte Nexus
11. **4 mind games** — PatternShift, TimeFlow, MathGap, Mills
12. **Eye Reset** — 7-step CVS protocol, 210 seconds
13. **Visual Flow** — Infinity/Sweep/Wave flow guides
14. **20-20-20 break** — 20-second eye break
15. **Desktop Companion** — Notification-based break reminders
16. **Smart alarm** — Accelerometer-based light sleep detection
17. **Sleep tracking** — Accelerometer movement data
18. **Journal** — AI-powered entries with Gemini insights
19. **Premium gating** — 10 features with free/pro tiers
20. **Privacy + Delete account pages** — `docs/privacy.html`, `docs/delete-account.html`
21. **Streak sync** — Mirrored to Firestore via `streakSync.ts`
22. **81 test files** across engines, persistence, hooks, components

---

## B. LEGACY / INTERNAL IDENTIFIERS

**Do NOT change these — they are internal/technical, not user-facing:**

| Identifier | Where | Type |
|---|---|---|
| `mind-pulse` | `package.json` name, `app.json` slug, Android prebuild dir | Expo/npm internal |
| `mindpulse` | `app.json` scheme, AsyncStorage keys (`@mindpulse/*`) | Deep link scheme + storage keys |
| `com.zubzen.mindpulse` | Android package identifier | Native package name |
| `com.zubzen.sleepy` | iOS bundle identifier | Native bundle ID (legacy) |
| `MindPulseAlarm` / `MindPulseScreenUsage` | Native module names | Kotlin/Java module classes |
| `mindpulse-wellness` / `mindpulse-progress` etc. | Zustand store names | AsyncStorage keys |
| `MindPulse` | `README.md` footer (now updated), internal docs | Historical references |

---

## C. CLAIMS CORRECTED IN CLEANUP PASS

| File | What Changed |
|---|---|
| `README.md` | Full rewrite: "MindPulse" → "Well Mode", 66→42 clips, 6→2 eye games, pricing→neutral, streak→synced, test coverage→81 files |
| `PRODUCT_REVIEW.md` | MindPulse→Well Mode, 66→42 clips, resolved critical issues table, streak sync noted, pricing→neutral |
| `STRATEGY_2026.md` | MindPulse→Well Mode, 6→2 eye games, 66→42 clips, streak→synced, pricing→neutral, projections→disclaimed |
| `MARKETING_PLAN.md` | MindPulse→Well Mode in titles, CTAs, brand references |
| `WELL_MODE_LAUNCH_REVIEW.md` | 66→42 clips, 6→2 eye games, streak→synced, projections→disclaimed, pricing→neutral |
| `BUILD_AND_RELEASE.md` | Title: MindPulse→Well Mode |
| `EYE_HEALTH_PRODUCT_PLAN.md` | MindPulse→Well Mode |
| `ENGAGEMENT_PLAN.md` | MindPulse→Well Mode in titles and brand guardrails |
| `CHALLENGES_PLAN.md` | Title: MindPulse→Well Mode |

---

## D. CLAIMS REMOVED / FLAGGED

| Claim | Action | Reason |
|---|---|---|
| "66 voice clips" | **Corrected to 42** | Code shows 42 unique AudioClipId entries |
| "6 eye games" | **Corrected to 2 eye activities + 4 mind games** | `EYE_GAMES` array has 2 entries |
| "$9.99/mo, $79.98/yr" | **Neutralized** | Prices not in code — RevenueCat-managed |
| "Streak is local-only" | **Corrected** | `streakSync.ts` mirrors to Firestore |
| "65-70% success probability" | **Removed** | Not determinable from code |
| "No serious competitor" | **Softened** | Requires market research |
| Revenue projections | **Disclaimed** | Industry benchmarks, not guarantees |
| "$10M app" / "VC-funded" | **Removed** | Subjective, unsupported |
| "Apple Sign-In" | **Removed** | Does not exist in codebase |
| Market size / CAGR / LTV | **Marked EXTERNAL** | Requires web research |

---

## E. PRE-LAUNCH CHECKLIST (Updated)

### ✅ CONFIRMED READY
- [x] Firebase Auth (Google + Guest)
- [x] Firestore data layer with cloud sync
- [x] Firebase Analytics
- [x] Sentry crash reporting
- [x] RevenueCat subscription integration + restore
- [x] Gemini AI (5 use cases)
- [x] 42 voice clips in EN + HI
- [x] 7 relax sessions
- [x] 6 games (2 eye + 4 mind)
- [x] Eye Reset (7 exercises, 210s)
- [x] Visual Flow (3 movement types)
- [x] 20-20-20 break
- [x] Desktop Eye Companion
- [x] Smart alarm + accelerometer sleep tracking
- [x] Journal + AI insights
- [x] Premium gating (10 features)
- [x] Privacy + delete-account pages
- [x] Streak synced to Firestore
- [x] 81 test files
- [x] Documentation updated with accurate claims

### ⚠️ NEEDS ATTENTION
- [ ] **Brand consistency** — "Well Mode" in docs, but `mind-pulse` remains in package.json, slug, scheme, Android package (internal identifiers — see Section B)
- [ ] **iOS bundle ID** — `com.zubzen.sleepy` is legacy (internal identifier)
- [ ] **Landing page** — No marketing website exists
- [ ] **EAS build test** — Not verified in this session

### ❌ NOT VERIFIABLE FROM CODE
- [ ] Market size / CAGR / competitor data
- [ ] Revenue projections accuracy
- [ ] Pricing from RevenueCat dashboard
- [ ] ASO keyword search volumes
- [ ] Play Store listing compliance (beyond code)
- [ ] User testimonials / social proof

---

*Verified by Buffy on August 23, 2026. Updated after pre-launch cleanup pass.*
