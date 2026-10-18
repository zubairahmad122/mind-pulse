# Well Mode — Build & Release Guide

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
| **Play Store AAB** (local → Downloads) | `npx eas-cli build --platform android --profile production --local --output "$HOME/Downloads/mindpulse-production.aab"` |
| Play Store AAB (cloud fallback) | `npx eas-cli build --platform android --profile production` |
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

## 3) Play Store AAB

Play Store ko `.aab` (app bundle) + proper release signing chahiye.
EAS local aur cloud dono modes mein production profile aur signing credentials
use karta hai. Pure Gradle ka `bundleRelease` command use na karo: current
native project mein woh debug keystore se sign hota hai aur Play Store upload
ke liye valid nahi hai.

### 3.1) Ek dafa: EAS secrets set karo

EAS environment ko required secrets do:

```bash
npx eas-cli login    # Expo account: zubair1122

npx eas-cli secret:create --name EXPO_PUBLIC_GEMINI_API_KEY --value "..."
npx eas-cli secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "..."
npx eas-cli secret:create --name SENTRY_AUTH_TOKEN --value "..."
npx eas-cli secret:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
```

### 3.2) Local AAB — Play Store upload

Project root se ye command chalao:

```bash
npx eas-cli build --platform android --profile production --local --output "$HOME/Downloads/mindpulse-production.aab"
```

Successful build ke baad upload-ready file:

```text
~/Downloads/mindpulse-production.aab
```

Important:

- EAS login aur Android upload credentials configured hone chahiye.
- Existing Play app update kar rahe ho to confirm karo ke EAS ka remote
  `versionCode` Play Console ke latest version se bara hai.
- Command dobara chalane se pehle existing Downloads wali AAB ko rename ya
  move kar do.

### 3.3) Cloud AAB — fallback

Local build environment issue aaye to:

```bash
npx eas-cli build --platform android --profile production
```

- Build complete hone par EAS download link deta hai.
- `production` profile AAB aur remote auto-increment ke liye configured hai.
- Pehli build par managed keystore generate ho to usi signing identity ko
  future updates ke liye preserve karo.

### 3.4) Play Console par upload

1. [Play Console](https://play.google.com/console) → apni app → **Testing → Internal testing**
2. **Create new release** → `.aab` upload karo
3. Pehle trusted testers ke saath internal smoke test complete karo.
4. Agar personal Play developer account 13 November 2023 ke baad bana tha,
   **Closed testing** mein minimum 12 opted-in testers ko 14 continuous days
   tak run karna Google ki production-access requirement hai.
5. Sab theek chale to **usi release ko Production track par promote** kar do —
   nayi build nahi banani parti

**Pehli baar Play Console par ye bhi chahiye hoga:**
- App listing: title, description, screenshots, feature graphic
- **Privacy policy URL** (lazmi — app data collect karti hai)
- **Data safety form** mein declare karo:
  - Crash logs (Sentry)
  - Analytics/app interactions (Firebase Analytics)
  - Account info (Firebase Auth email)
  - **Advertising ID / AdMob** (ab app mein live ads hain — see below)
- Content rating questionnaire (Health & Fitness category)

### 3.5) AdMob ke liye Data Safety + Ads declaration (ab zaroori hai)

Since real AdMob ad units went live (§ "Update AdMob to new account"), two Play
Console settings need updating to match:

**Easiest path — let Play Console auto-fill it:** Play Console → your app →
**App content → Data safety → SDKs tab**. Once the app is linked to the
AdMob account, Google flags the AdMob SDK there with a **"Apply suggested
answers"** button — use it; it's less error-prone than typing values by hand
and stays current if Google updates AdMob's own disclosure.

**Manual fallback** (if the SDKs tab doesn't show AdMob yet, or you want to
verify the auto-filled values) — **App content → Ads declaration**: answer
**"Yes, my app contains ads"**. Then in **Data safety → Device or other IDs**:

| Field | Answer |
|---|---|
| Data type | Device or other IDs → **Advertising ID** |
| Collected? | Yes |
| Shared with third parties? | Yes (Google AdMob + its ad network partners) |
| Purpose | Advertising or marketing |
| Processed ephemerally? | No |
| Required or optional? | Optional — users can limit ad tracking in device Settings, and the app's own UMP consent flow (EEA/UK) lets users decline personalized ads |
| Data encrypted in transit? | Yes |

Don't declare anything beyond Advertising ID for AdMob specifically — Firebase
Analytics/Auth/Sentry stay as their own separate rows, already listed above.

---

## 4) Release se pehle QA checklist

Har release build par ye flows device par test karo:

- [ ] `npm test` — saare tests green
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

## 7) Android/Gradle toolchain (required for local `bundleRelease`/`assembleDebug`)

Resolved via `expo-build-properties` in `app.json` (compileSdk/targetSdk) and
React Native 0.85.3's own bundled Gradle version catalog (everything else) —
this is the single source of truth; nothing below should be hand-pinned
anywhere else. Check what's actually resolved with:
`cd android && ./gradlew -q :app:properties | grep -E "compileSdk|targetSdk|minSdk|buildTools|ndk"`.

| Tool | Required version | Where it's pinned |
|---|---|---|
| targetSdk / compileSdk | 36 (Android 16) | `app.json` → `plugins` → `expo-build-properties` → `android` |
| minSdk | 24 | RN 0.85.3's bundled catalog (not overridden — see §8 QA below for why) |
| AGP | 8.12.0 | RN 0.85.3's bundled catalog (`node_modules/react-native/gradle/libs.versions.toml`) |
| Kotlin | 2.1.20 | same catalog — flows automatically into `mind-pulse-alarm`/`mind-pulse-screen-usage` too |
| Gradle wrapper | 9.3.1 | `android/gradle/wrapper/gradle-wrapper.properties` |
| JDK | 17 | required to run AGP 8.x/Gradle 9.x — same JDK for local dev, CI, and release builds |
| NDK | 27.1.12297006 | `app.json` → `expo-build-properties` |

**Google Play's target API deadline**: new apps and updates must target API 36
(Android 16) — Google's enforcement window is late August–November 2026, so
this project is already at the required level; don't let a future `expo
upgrade` silently drop it back down.

**CI steps** (same toolchain as local): `pnpm install --frozen-lockfile` → `npx tsc --noEmit` →
`npm test` → `npx expo config --type prebuild --json` (validates config) →
`npm run android:release:check` (Gradle release checks + `bundleRelease` +
manifest/permission/16 KB report — see `scripts/android-release-preflight.sh`).
Actual Play-bound signing/versioning happens on EAS (§3), not in this repo's CI.

## 8) Play policy notes specific to this app

- **Exact alarms**: the manifest declares `SCHEDULE_EXACT_ALARM` only, not
  `USE_EXACT_ALARM`. Play restricts `USE_EXACT_ALARM`'s auto-grant to apps
  whose *core* function is an alarm-clock or calendar app — Well Mode is a
  broad wellness app with the wake alarm as one feature among several, so it
  doesn't clearly qualify. `SCHEDULE_EXACT_ALARM` (special access, granted via
  Settings — `MindPulseAlarmModule.requestPermissions()` already opens that
  screen) is the compliant path and is all `AlarmScheduler.setAlarmClock()`
  needs; nothing in the code ever checked for `USE_EXACT_ALARM`.
- **Full-screen intent**: `USE_FULL_SCREEN_INTENT` is used only by the wake
  alarm's ringing notification (`AlarmService.buildNotification`). Do not add
  it to Smart Reset, Digital Sunset, or any other reminder — Play restricts
  this permission to calling/alarm apps and will flag broader use.
- **`SYSTEM_ALERT_WINDOW`**: removed — it's Expo's own bare-project template
  boilerplate ("OPTIONAL PERMISSIONS, REMOVE WHATEVER YOU DO NOT NEED"), never
  used by any code in this repo, and a Play-sensitive permission. Removed via
  `app.json` → `android.blockedPermissions` (the same mechanism already used
  for `ACTIVITY_RECOGNITION`) rather than hand-editing
  `android/app/src/main/AndroidManifest.xml` directly — it's tracked in git
  but still gets overwritten by every `expo prebuild`, so edits belong in
  `app.json`/`.env`, not the generated file.
- **Microphone and legacy storage**: the app only plays bundled/remote audio;
  it does not record audio or browse shared storage. `RECORD_AUDIO`,
  `READ_EXTERNAL_STORAGE`, and `WRITE_EXTERNAL_STORAGE` are blocked in Expo
  config so dependencies cannot silently reintroduce them during prebuild.
- **Battery optimization**: wake alarms use `AlarmManager.setAlarmClock()`,
  which is already allowed through Doze. The app opens the general battery
  optimization settings instead of declaring
  `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` and directly requesting a Play-
  restricted exemption.
- **`ACCESS_NOTIFICATION_POLICY`** (Focus's "Silence Notifications" toggle,
  added via `mind-pulse-screen-usage`'s native module): a **normal**
  permission, not one of Play's restricted/"Permissions Declaration Form"
  permissions (that list is things like SMS, Call Log, Accessibility
  Service, All Files Access) — declaring it needs no extra Play Console
  justification. Actually toggling system DND still requires the user to
  separately grant "Do Not Disturb access" from Android Settings (special
  access, same shape as Usage Access — no runtime popup exists for this on
  Android, by OS design). Uses `INTERRUPTION_FILTER_PRIORITY` ("Priority
  only", the standard DND mode), never `FILTER_NONE` — alarms and the
  user's own starred contacts still get through. Opt-in only, toggle lives
  on the Focus Block setup screen. No Data Safety form changes needed: this
  is a local device-setting toggle, not data collection or sharing.
- **Data Safety**: `AD_ID` / `ACCESS_ADSERVICES_*` permissions and the
  `google_analytics_default_allow_ad_*` meta-data flags in the merged
  manifest come from Firebase Analytics' own defaults (bundled with
  `@react-native-firebase/app`). Well Mode now also shows AdMob ads
  (`react-native-google-mobile-ads`, IDs in `.env` under `EXPO_PUBLIC_ADMOB_*`)
  — declare Firebase Analytics + Firebase Auth + Sentry crash reporting +
  AdMob/Advertising ID in the Data Safety form.

## 9) Troubleshooting

| Masla | Hal |
|---|---|
| Metro: `ENOSPC ... file watchers` | `sudo sysctl -p` (limit /etc/sysctl.conf mein already set hai) |
| Build par Sentry sourcemap fail | `.env` mein `SENTRY_AUTH_TOKEN` check karo; token ke baghair bhi build ban jati hai (bas stack traces minified) |
| Naya native package kaam nahi karta | `npx expo prebuild --platform android` phir dobara `run:android` |
| `npm install` par Firebase peer conflict | `@react-native-firebase/*` sab packages ka version EXACT same rakho (abhi 24.1.0) |
| Play Store: "debug signed" reject | APK ya pure Gradle AAB upload mat karo — section 3.2 ka EAS local AAB command use karo |
| React Native DevTools sandbox FATAL (Linux) | Harmless — ignore karo |
