# 🧠 MindPulse

**The daily screen-recovery coach.** One app for **eye health, sleep, and relaxation** — built for people who live on screens.

MindPulse helps screen-heavy people build healthier visual habits, reduce discomfort, sleep better, and wind down — with high-quality voice guidance in **English, Hindi, and Urdu**. It is a safety-first wellness product: it supports comfort and habits, never claims to cure, diagnose, or "train your eyesight" (see [EYE_HEALTH_PRODUCT_PLAN.md](./EYE_HEALTH_PRODUCT_PLAN.md)).

> 📱 Android + iOS (Expo / React Native), with a web build and a desktop/browser break companion prototype.

---

## The Three Pillars

| Pillar | What it does |
|---|---|
| 👁️ **Eye Health** | 20-20-20 break reminders (configurable 20/30/45/60-min intervals, workday/weekend schedules, snooze), audio-first **Eye Reset** sessions, 6 gamified eye games with XP & levels, symptom check-ins, and a personalized weekly eye-comfort report with safety-aware escalation guidance |
| 😴 **Sleep** | Smart alarm that wakes you in a light sleep phase, accelerometer sleep tracking, bed/wake scheduling, sleep history & trends, sleep stories, and AI-generated sleep-plan insights |
| 🧘 **Mind / Relax** | Guided breathing & relaxation sessions (Box Breathing, Calm Flow, Body Scan, Muscle Release, Grounding, Bedtime…) fully voiced in **English + Hindi/Urdu**, mood-based session recommendations, and an AI-powered journal with weekly reflections |

Plus an **engagement layer**: a unified daily streak (any pillar counts), a daily challenge, 12 achievements/badges, and a weekly wellness score — all persisted locally.

---

## Feature Highlights

- **6 eye games** with seeded-random fairness and accessibility modes: Focus Sprint, Signal Ops, Neon Cipher, Pulse Switch, Path Lock, Peripheral Alert
- **Break reminders that respect your day** — custom hours, selectable days, snooze action, and follow-through tracking
- **Multilingual voice guidance** — 66 professionally recorded clips across English and Hindi/Urdu
- **AI personalization** — daily tips, sleep-plan insights, journal analysis, and weekly reflections (Google Gemini)
- **Monetization** — RevenueCat subscriptions ($9.99/mo, $79.98/yr) with a 7-day free trial and a polished paywall
- **Guest mode** — no mandatory account to start
- **Desktop/browser companion** — synchronized screen-break prototype

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 56 · React Native 0.85 · TypeScript |
| Navigation | Expo Router (file-based) |
| UI | NativeWind (Tailwind) + StyleSheet, dark glassmorphism design system, React Native Reanimated 4, Skia, expo-audio |
| State | Zustand + AsyncStorage persistence (see [STATE_OWNERSHIP.md](./src/stores/STATE_OWNERSHIP.md)) |
| Backend | Firebase Auth · Firestore · Analytics |
| Payments | RevenueCat (`react-native-purchases`) |
| AI | Google Gemini API |
| Observability | Sentry (`@sentry/react-native`) + `src/utils/errorLogger.ts` |
| Testing | Jest + jest-expo, React Native Testing Library |

---

## Project Structure

```
src/
├── app/                  # Expo Router routes (file-based)
│   ├── (app)/            # Authenticated app: tabs, eye games, sessions, premium…
│   │   └── (tabs)/       # Home · Sleep · Relax · Eye · Challenges · Profile
│   └── (auth)/           # Onboarding, sign in, create account
├── components/           # UI components (ui/, layout/, home/, eye/, auth/, paywall/)
├── constants/            # Design system, content, entitlements, translations
├── context/              # React contexts (Auth, Subscription, Sleep, Language…)
├── hooks/                # Feature hooks (streaks, sleep, eye progress, paywall…)
├── services/             # Firebase, RevenueCat, Gemini, notifications, persistence
├── stores/               # Zustand stores (sleep, progress, wellness, user)
├── types/                # Shared TypeScript types
└── utils/                # Pure logic: engines, scoring, dates, formatters
```

Key docs: [PRODUCT_REVIEW.md](./PRODUCT_REVIEW.md) · [STRATEGY_2026.md](./STRATEGY_2026.md) · [MARKETING_PLAN.md](./MARKETING_PLAN.md) · [ENGAGEMENT_PLAN.md](./ENGAGEMENT_PLAN.md) · [EYE_HEALTH_PRODUCT_PLAN.md](./EYE_HEALTH_PRODUCT_PLAN.md) · [CHALLENGES_PLAN.md](./CHALLENGES_PLAN.md)

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- An [Expo account](https://expo.dev) and the Expo CLI
- Firebase project with **Auth**, **Firestore**, and **Analytics** enabled
- RevenueCat account (App Store + Play Store IAP)
- A Google Gemini API key
- (Optional) Sentry account for crash reporting

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root (or export the variables):

```bash
# RevenueCat — from app.mixpanel… no, from app.revenuecat.com → App settings → API keys
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxx

# Google Gemini — https://aistudio.google.com/apikey
EXPO_PUBLIC_GEMINI_API_KEY=AIza...
```

> ⚠️ Any variable prefixed `EXPO_PUBLIC_` is inlined into the client bundle — never put secrets there.

### 3. Firebase config

- **Android:** place your `google-services.json` in the project root (referenced in `app.json`).
- **iOS:** add `GoogleService-Info.plist` to the iOS project (via your EAS build profile or Xcode).
- The Google Sign-In web client ID is configured in `src/context/AuthContext.tsx`.

### 4. Run the app

```bash
npx expo start            # dev server (Expo Go / dev client)
npm run android           # native Android build & run (requires Android SDK)
npm run ios               # native iOS build & run (requires macOS + Xcode)
npm run web               # web build via Metro
```

### 5. Build & release

```bash
npm run build:apk         # local Android release APK (see scripts/build-apk.sh)
npm run install:apk       # adb install of the built APK
```

For full store/submission guidance see [BUILD_AND_RELEASE.md](./BUILD_AND_RELEASE.md). EAS builds are configured in `eas.json` / `app.json`.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm test` | Run the Jest test suite |
| `npm run lint` | Run ESLint (`expo lint`) |
| `npm run android` / `npm run ios` | Native builds |
| `npm run web` | Web build |
| `npm run build:apk` | Android release APK |
| `npm run validate:eye-reminders:android` | Validate eye-reminder scheduling on Android |

---

## Testing

```bash
npm test
```

Unit tests live alongside the code in `src/**/__tests__/` — covering the game engines (signal ops, neon cipher, path lock, pulse switch, peripheral alert), seeded randomness, date handling, scoring, and accessibility hooks. Test setup lives in `jest.config`-equivalent config inside `package.json` (jest-expo preset, `@/` path alias, asset stubs).

---

## License

See [LICENSE](./LICENSE).

---

*MindPulse — built with Expo, Firebase, and a whole lot of screen-recovery love.*
