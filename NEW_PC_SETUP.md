# MindPulse — New PC Setup + Signing + APK/AAB Build (single reference)

Ye **ek hi file** hai jo naye PC par project set karne, **signing key** handle karne,
aur **APK / AAB** banane ke liye kaafi hai. Purani `BUILD_AND_RELEASE.md` bhi rakhi hai
(QA checklist + analytics verify us mein hai) — build/signing ke liye **ye file** authority hai.

> **Security note:** is file mein koi real password / token / keystore **nahi** hai, kyunki ye
> file git mein jati hai. Asli secrets (`.env`, keystore, passwords) USB / password manager se
> alag transfer karne hain — Section 2 mein exact list hai.

---

## 0) Ek nazar mein

| Cheez | Value |
|---|---|
| Expo SDK | 56 (`expo ~56.0.18`), React Native 0.85.3, React 19.2.3 |
| Android package | `com.zubzen.mindpulse` |
| iOS bundle id | `com.zubzen.sleepy` (purana id — jaan boojh kar) |
| Expo account (owner) | `zubair1122` |
| EAS project | `Mind pulse` — projectId `e8fbd1ea-ebd9-4a3e-b2fe-0554fe45b18d` |
| Firebase project | `smart-sleepy-ae3ca` |
| Sentry | org `zubzen`, project `react-native` |
| versionCode source | **remote** (`eas.json` → `appVersionSource: "remote"`) — EAS server par store hai, naye PC par khud chalta rahega. Aakhri production build = **versionCode 5**, appVersion 1.0.0 |
| Release signing key | **EAS servers par managed** — is PC par koi release keystore nahi hai (Section 4) |

| Kaam | Command |
|---|---|
| Testing APK (local, debug-signed) | `npm run build:apk` |
| APK install | `npm run install:apk` |
| **Play Store AAB (cloud)** | `npx eas-cli build --platform android --profile production` |
| Local AAB (asli upload key se) | Section 6.2 |
| Native config badle to | `npx expo prebuild --platform android` |

---

## 1) Naye PC par kya install karna hai

Purane PC par jo chal raha tha, bilkul wahi versions:

| Tool | Version (purana PC) | Note |
|---|---|---|
| OS | Ubuntu (Linux 7.0.0) | Windows/Mac bhi chal jayega, sirf paths badlenge |
| Node | **v24.18.0** | nvm se lagao: `nvm install 24 && nvm use 24` |
| npm | Node ke saath | |
| JDK | **OpenJDK 17** (17.0.19) | RN 0.85 + Gradle 9 ke liye 17 hi rakho, 21 par mat jao |
| Gradle | 9.3.1 | install mat karo — wrapper (`./gradlew`) khud download karta hai |
| Android Studio | latest | sirf SDK manager ke liye chahiye |

**Android SDK components (SDK Manager se exactly ye):**

- Platforms: **android-36** (compile target) aur **android-34**
- Build-Tools: **36.0.0** (34.0.0 / 35.0.0 bhi the, optional)
- **NDK: `27.1.12297006`** ← lazmi, `app.json` ke `expo-build-properties` mein hard-coded hai
- CMake (`cmake` folder), Platform-Tools (adb), Emulator + system image (agar emulator chahiye)

**Env vars** (`~/.bashrc` ya `~/.zshrc` mein):

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/emulator
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64   # apne path se badlo
```

**Linux file-watcher fix** (Metro ka `ENOSPC` error) — `/etc/sysctl.conf` mein:

```
fs.inotify.max_user_watches=524288
```
phir `sudo sysctl -p`

---

## 2) Purane PC se kya copy karna hai (git mein NAHIN hai)

Ye files `.gitignore` mein hain — clone karne par **nahi** aayengi. USB ya encrypted
transfer se le jao:

| File | Zaroori? | Kya hai |
|---|---|---|
| `.env` | **Lazmi** | Gemini key, RevenueCat Android/iOS keys, Clerk key, `SENTRY_AUTH_TOKEN`, `DB_URI`. Template `.env.example` repo mein hai. |
| `google-services.json` (project root) | **Lazmi** | Firebase Android config. Kho jaye to Firebase Console → Project settings → `com.zubzen.mindpulse` app → download. |
| Play Console service-account JSON | Agar `eas submit` use karna hai | Abhi is PC par nahi tha — Play Console → Setup → API access se banega |
| Release keystore | Section 4 dekho | **Is PC par nahi hai — EAS par hai.** Copy karne ki zaroorat nahi, sirf `eas login`. |
| `.claude/settings.local.json` | Optional | Sirf local tooling |

**Copy karne ki zaroorat NAHIN:** `node_modules/`, `android/`, `ios/`, `.expo/`, Gradle caches —
ye sab `npm ci` + `npx expo prebuild` se dobara ban jate hain.

**Uncommitted kaam:** naye PC par jane se pehle purane PC par ye zaroor karo, warna
work-in-progress reh jayega:

```bash
git status              # abhi modified: src/screens/app/Eye*.tsx, untracked: src/engine/core/games/
git add -A && git commit -m "wip: transfer to new pc"
git push
```

---

## 3) Naye PC par project setup (order matters)

```bash
git clone <repo-url> mind-pulse
cd mind-pulse

npm ci                                   # package-lock ke exact versions

# ab copy ki hui files jagah par rakho:
#   ./.env
#   ./google-services.json

npx expo prebuild --platform android     # android/ folder generate karega
npx expo prebuild --platform ios         # sirf agar Mac par ho

npm test                                 # sanity
npx tsc --noEmit
npx expo run:android                     # device/emulator par dev build
```

`android/` aur `ios/` **generated** folders hain (git-ignored). Jab bhi `app.json` plugins
badlein ya naya native package aaye — `npx expo prebuild --platform android` dobara chalao.

---

## 4) SIGNING KEY — sab kuch yahan

### 4.1 Abhi asal situation kya hai

| Key | Kahan hai | Kis kaam ke liye |
|---|---|---|
| **Release / upload keystore** | **EAS servers par** (account `zubair1122`, project `mind-pulse`) — local machine par copy nahi | Play Store AAB signing |
| **Debug keystore** | `android/app/debug.keystore` (prebuild khud banata hai) | Dev builds + `npm run build:apk` |

Important: `android/app/build.gradle` ka **`release` buildType bhi `signingConfigs.debug`** use
karta hai (Expo prebuild ka default). Iska matlab **local `assembleRelease` APK debug-signed hai** —
sirf testing/sharing ke liye, Play Store par upload nahi ho sakti. Asli signing sirf EAS build mein
hoti hai.

**Debug keystore fingerprints** (ye standard Android debug key hai, har machine par same):

```
alias:         androiddebugkey
store pass:    android
key pass:      android
SHA-1:         5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
SHA-256:       FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
```
Yahi SHA-1 `google-services.json` mein `com.zubzen.mindpulse` ke against registered hai — isi liye
Google Sign-In dev/debug builds mein chalta hai. (⚠️ Section 8 dekho: release key ka SHA-1 abhi
Firebase mein register nahi lagta.)

### 4.2 Naye PC par release key kaise milegi

Kuch copy nahi karna — bas login:

```bash
npx eas-cli login          # account: zubair1122
npx eas-cli whoami         # confirm
```

Iske baad `npx eas-cli build --profile production` **automatically wahi purani keystore** use
karega jo pehli build (versionCode 1–5) mein use hui thi. Naya PC = naya keystore **nahi** banta.

### 4.3 Keystore ka backup lena (STRONGLY recommended, ek dafa)

Agar Expo account kabhi lock ho jaye aur keystore ka backup na ho, to **app ki koi update kabhi
publish nahi ho sakti**. Isliye ek offline backup rakho:

```bash
npx eas-cli credentials --platform android
```

Menu path:

```
→ production            (build profile chuno)
→ Keystore: Manage everything needed to build your project
→ Download existing keystore
```

Ye `.jks` file download karega aur terminal par **keystore password, key alias, key password**
print karega. In teenon ko **password manager** mein daalo (is file mein mat likho — ye git mein
jati hai) aur `.jks` ko 2 jagah offline rakho (USB + encrypted cloud).

Backup ke baad fingerprints nikaalo (Firebase / Google Sign-In ke liye chahiye honge):

```bash
keytool -list -v -keystore <downloaded>.jks -alias <alias>
# SHA1: aur SHA256: lines note kar lo
```

Isi menu se `Set up a new keystore` bhi dikhta hai — **isko kabhi mat chuno** existing app par.
Naya keystore = Play Store update reject ("upload certificate mismatch").

### 4.4 Play App Signing (samajhna zaroori)

Play Console par app enroll hoti hai to **do** keys hoti hain:

- **Upload key** = EAS wali keystore. Isi se AAB sign hoti hai jo tum upload karte ho.
- **App signing key** = Google apne paas rakhta hai, users ko wahi signature milta hai.

Upload key kho jaye to Play Console → Setup → App integrity se **reset** ho sakti hai (support
request). App signing key kabhi nahi kho sakti (Google ke paas hai). Firebase / Google Sign-In ke
liye **dono** ke SHA-1 register karne hote hain — App signing key ka SHA-1
Play Console → **Setup → App integrity → App signing** page par milta hai.

---

## 5) APK banana (testing ke liye)

```bash
npm run build:apk        # = bash scripts/build-apk.sh → cd android && ./gradlew assembleRelease
npm run install:apk      # adb install -r ...
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

- Release mode hai → **Sentry crash reporting ACTIVE** hai.
- **Debug-signed** hai → Play Store par upload nahi ho sakti, sirf side-load/sharing.
- Pehli build par Gradle sab kuch download karega (~10–20 min), baad mein ~5 min.

Cloud se APK chahiye (kisi ko link bhejna ho):

```bash
npx eas-cli build --platform android --profile preview     # internal distribution APK
```

Signature verify karna ho:

```bash
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs app-release.apk
```

---

## 6) AAB banana (Play Store)

### 6.1 EAS cloud build — recommended

Ek dafa ka setup (secrets cloud build ko `.env` nahi milti):

```bash
npx eas-cli login

npx eas-cli secret:list      # pehle dekho ke ye pehle se set hain ya nahi
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_GEMINI_API_KEY --value "..."
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "..."
npx eas-cli secret:create --scope project --name SENTRY_AUTH_TOKEN --value "..."
npx eas-cli secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
```

(`app.config.js` `GOOGLE_SERVICES_JSON` env var ko padhta hai, warna local file use karta hai.)

Build:

```bash
npx eas-cli build --platform android --profile production
```

- `production` profile = **app-bundle (.aab)** + `autoIncrement: true`
- versionCode EAS server se aata hai (`appVersionSource: remote`) → agli build **6** hogi
- ~15–20 min, aakhir mein download link
- Keystore ka koi sawal nahi poochega (already managed)

### 6.2 Local AAB asli upload key ke saath (optional)

Sirf tab jab cloud build na chalani ho. Section 4.3 wali downloaded `.jks` chahiye.

```bash
mkdir -p android/keystores
cp <downloaded>.jks android/keystores/release.keystore
```

Project root par `credentials.json` (⚠️ git-ignore karo — `.gitignore` mein `credentials.json`
line add karo, abhi nahi hai):

```json
{
  "android": {
    "keystore": {
      "keystorePath": "android/keystores/release.keystore",
      "keystorePassword": "KEYSTORE_PASSWORD",
      "keyAlias": "KEY_ALIAS",
      "keyPassword": "KEY_PASSWORD"
    }
  }
}
```

`eas.json` ke `production` profile mein `"credentialsSource": "local"` add karo, phir:

```bash
npx eas-cli build --platform android --profile production --local
```

Output project root mein `.aab` file. **Yaad rakho:** versionCode local build mein
auto-increment nahi hoti jis tarah cloud par hoti hai — upload se pehle version check kar lo.

Pure Gradle se AAB (`./gradlew bundleRelease`) tab tak **debug-signed** rahegi jab tak
`android/app/build.gradle` mein release `signingConfig` khud add na karo — aur wo edit har
`expo prebuild` par mit jayegi. Isliye ye raasta recommend nahi hai.

### 6.3 Play Console par upload

1. [Play Console](https://play.google.com/console) → app → **Testing → Internal testing**
2. **Create new release** → `.aab` upload → testers add → rollout
3. Theek chale to **usi release ko Production par promote** karo (nayi build nahi banani)

Ya CLI se:

```bash
npx eas-cli submit --platform android --latest    # service-account JSON chahiye hoga
```

---

## 7) Release se pehle quick checklist

- [ ] `npm test` green, `npx tsc --noEmit` 0 errors, `npm run lint` clean
- [ ] `.env` aur `google-services.json` maujood
- [ ] EAS secrets set (`npx eas-cli secret:list`)
- [ ] Package name `com.zubzen.mindpulse` — build logs mein confirm
- [ ] versionCode pichli build se zyada (`npx eas-cli build:list --platform android --limit 3`)
- [ ] Device par install kar ke: Google Sign-In, paywall, notifications, eye games test
- [ ] Detailed QA flows: `BUILD_AND_RELEASE.md` Section 4

---

## 8) Known issues / gotchas (naye PC par sar khayenge)

| Masla | Hal |
|---|---|
| **Release build mein Google Sign-In fail** | `google-services.json` mein `com.zubzen.mindpulse` ke liye sirf **debug** SHA-1 (`5E:8F:…`) registered hai. Release ke liye Firebase Console mein **EAS upload key ka SHA-1** + **Play App signing key ka SHA-1** dono add karo, phir naya `google-services.json` download kar ke replace + prebuild. |
| `npx eas-cli` "could not determine executable" | Locally installed nahi hai — hamesha `npx --yes eas-cli@latest ...` ya `npm i -g eas-cli` |
| NDK not found / CMake error | SDK Manager se **NDK `27.1.12297006`** install karo (exact version, `app.json` mein pinned) |
| Metro `ENOSPC file watchers` | Section 1 ka inotify fix + `sudo sysctl -p` |
| Naya native package kaam nahi karta | `npx expo prebuild --platform android` phir `npx expo run:android` |
| Firebase peer dependency conflict | Saare `@react-native-firebase/*` ka version EXACT same rakho (abhi 24.1.0) |
| Play Store "debug signed" reject | Local `assembleRelease` APK upload mat karo — Section 6.1 wali EAS AAB use karo |
| Gradle OOM | `android/gradle.properties` → `org.gradle.jvmargs=-Xmx4096m` (abhi 2048m) |
| Sentry sourcemap upload fail | `.env` mein `SENTRY_AUTH_TOKEN` (sentry.io → Settings → Organization Tokens). Token ke baghair build ban jati hai, bas stack traces minified rehte hain. |
| `BUILD_AND_RELEASE.md` mein analytics debug command | Wahan `com.zubzen.sleepy` likha hai — Android par sahi package **`com.zubzen.mindpulse`** hai |

---

## 9) File map (kya kahan hai)

| File | Kya hai |
|---|---|
| `.env` / `.env.example` | Local secrets / template |
| `google-services.json` | Firebase Android config (git-ignored) |
| `app.json` | Expo config — package name, plugins, NDK version, EAS projectId |
| `app.config.js` | EAS par `GOOGLE_SERVICES_JSON` secret inject karta hai |
| `eas.json` | Build profiles: development / preview (APK) / production (AAB) |
| `scripts/build-apk.sh` | Local release APK (`npm run build:apk`) |
| `android/app/build.gradle` | signingConfigs (release → debug key) — **generated**, edits prebuild par mit jati hain |
| `android/gradle.properties` | JVM memory, architectures, newArch + Hermes on |
| `android/sentry.properties` | Sentry org/project (token env var se aata hai) — generated |
| `BUILD_AND_RELEASE.md` | QA checklist, Sentry/Analytics verification, Play listing requirements |
