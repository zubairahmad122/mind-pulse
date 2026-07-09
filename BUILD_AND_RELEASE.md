# MindPulse — Build & Release Guide

Har build/release ka complete tareeqa — development se le kar Play Store tak.

---

## 0) Ek nazar mein (cheat sheet)

| Kaam | Command |
|---|---|
| Dev run (Metro + device) | `npx expo run:android` |
| Tests | `npm test` |
| TypeScript check | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| **Testing APK** (local) | `npm run build:apk` |
| APK device par install | `npm run install:apk` |
| **Play Store AAB** (cloud) | `npx eas-cli build --platform android --profile production` |
| Native config badli ho to | `npx expo prebuild --platform android` |

---

## 1) Prerequisites (ek dafa ka setup)

- **`.env` file** project root mein (`.env.example` se copy karo) — ye git mein nahi jati:
  - `EXPO_PUBLIC_GEMINI_API_KEY` — Journal AI insights
  - `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` — subscriptions
  - `SENTRY_AUTH_TOKEN` — release builds mein readable crash stack traces
    (banao: sentry.io → Settings → Developer Settings → **Organization Tokens**)
- **`google-services.json`** project root mein (Firebase console se)
- Linux par Metro ka file-watcher error (`ENOSPC`) aaye to: `sudo sysctl -p`

**Kab `prebuild` chalana hai:** jab bhi `app.json` ke plugins badlein ya koi naya
native package install ho (`expo-*`, `@react-native-*`, `@sentry/*` waghera):

```bash
npx expo prebuild --platform android
```

---

## 2) Testing APK (local build, ~5 min)

Apne/doston ke phones par test karne ke liye:

```bash
npm run build:apk
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

Cable-connected device par install:

```bash
npm run install:apk
```

**Yaad rakhna:**
- Ye **release mode** hai — Sentry crash reporting is mein ACTIVE hai
  (dev mode mein jaan-boojh kar off hai).
- Ye APK **debug keystore** se signed hai — testing/sharing ke liye theek,
  **Play Store par upload NAHIN ho sakti.**

---

## 3) Play Store build (AAB via EAS — recommended)

Play Store ko `.aab` (app bundle) + proper release signing chahiye.
EAS ye dono handle karta hai aur **keystore apne paas safe rakhta hai**
(keystore kho jaye to app ka update kabhi publish nahi hota — isliye EAS best hai).

### 3.1) Ek dafa: EAS secrets set karo

Cloud build ko `.env` nahi milti, to secrets upload karo:

```bash
npx eas-cli login    # Expo account: zubair1122

npx eas-cli secret:create --name EXPO_PUBLIC_GEMINI_API_KEY --value "..."
npx eas-cli secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "..."
npx eas-cli secret:create --name SENTRY_AUTH_TOKEN --value "..."
npx eas-cli secret:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
```

### 3.2) Build

```bash
npx eas-cli build --platform android --profile production
```

- Pehli baar poochega **"Generate a new Android Keystore?" → Yes**
- Build cloud mein chalti hai (~15–20 min), aakhir mein download link milta hai
- `production` profile `eas.json` mein already set hai: AAB + auto version increment

### 3.3) Play Console par upload

1. [Play Console](https://play.google.com/console) → apni app → **Testing → Internal testing**
2. **Create new release** → `.aab` upload karo
3. Testers add karo (apna email + 2–4 log) → release out karo
4. Sab theek chale to **usi release ko Production track par promote** kar do —
   nayi build nahi banani parti

**Pehli baar Play Console par ye bhi chahiye hoga:**
- App listing: title, description, screenshots, feature graphic
- **Privacy policy URL** (lazmi — app data collect karti hai)
- **Data safety form** mein declare karo:
  - Crash logs (Sentry)
  - Analytics/app interactions (Firebase Analytics)
  - Account info (Firebase Auth email)
- Content rating questionnaire (Health & Fitness category)

---

## 4) Release se pehle QA checklist

Har release build par ye flows device par test karo:

- [ ] `npm test` — 27 tests green
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] **Calm Flow poora**: countdown → intro narration → orb 5-5 rhythm →
      intro ke baad "Inhale/Exhale" cues → 9:00 par exact completion
- [ ] **Box Breathing**: 5:20 par 20vi cycle ke end par complete
- [ ] **Pause**: countdown ke doran, settling ke doran, breathing ke doran —
      sab kuch freeze ho, resume par wahin se chale
- [ ] **Mute/volume**: mic/music icons + sliders live kaam karein,
      slider drag karte waqt timer na ruke
- [ ] **End button**: har entry point se (Relax tab, Stress→Breathe, Home
      quick action) — wapas wahin jaye jahan se aaye the
- [ ] **Completion screen**: mood select (3+2 grid) → rating → Back to Home
- [ ] Body Scan / Muscle Release / Grounding — narration + zone flow
- [ ] Guest mode + logged-in dono mein sleep tracking
- [ ] Airplane mode mein app crash na kare (offline path)
- [ ] Paywall dikhe gated feature par; RevenueCat sandbox purchase

---

## 5) Verify: Sentry & Analytics (release build mein)

**Sentry** — release/testing APK mein koi crash karao (ya kisi button par
`throw new Error('test')` laga kar) → 1–2 min mein
[zubzen.sentry.io](https://zubzen.sentry.io) → Issues mein dikhega.

**Firebase Analytics** — device ko debug mode mein daalo:

```bash
adb shell setprop debug.firebase.analytics.app com.zubzen.sleepy
```

Phir Firebase Console → Analytics → **DebugView** mein real-time events dikhenge.
Band karna ho to:

```bash
adb shell setprop debug.firebase.analytics.app .none.
```

**Tracked events:** `relax_session_start`, `relax_session_complete`,
`relax_session_abandoned` (percent_done ke saath), `relax_mood_selected`,
`paywall_shown`, `purchase_success` — sab `src/services/analytics.ts` se.

---

## 6) Important files (kya kahan hai)

| File | Kya hai |
|---|---|
| `.env` | Local secrets (git-ignored) — `.env.example` template hai |
| `eas.json` | EAS build profiles (development / preview / production) |
| `app.json` + `app.config.js` | Expo config; config.js EAS par google-services inject karta hai |
| `scripts/build-apk.sh` | Local release APK script (`npm run build:apk`) |
| `src/app/_layout.tsx` | Sentry init + error boundary + providers |
| `src/utils/errorLogger.ts` | Har caught error ka single funnel → Sentry |
| `src/services/analytics.ts` | Har analytics event ka single funnel → Firebase |
| `src/constants/breathingPatterns.ts` | Session timing ka SINGLE SOURCE OF TRUTH (cycles × phases) |
| `assets/audio/guide/` | Recorded voice clips (en + hi folders); scripts: `SCRIPTS.md` |

---

## 7) Troubleshooting

| Masla | Hal |
|---|---|
| Metro: `ENOSPC ... file watchers` | `sudo sysctl -p` (limit /etc/sysctl.conf mein already set hai) |
| Build par Sentry sourcemap fail | `.env` mein `SENTRY_AUTH_TOKEN` check karo; token ke baghair bhi build ban jati hai (bas stack traces minified) |
| Naya native package kaam nahi karta | `npx expo prebuild --platform android` phir dobara `run:android` |
| `npm install` par Firebase peer conflict | `@react-native-firebase/*` sab packages ka version EXACT same rakho (abhi 24.1.0) |
| Play Store: "debug signed" reject | Local APK upload mat karo — EAS production build (AAB) use karo |
| React Native DevTools sandbox FATAL (Linux) | Harmless — ignore karo |
