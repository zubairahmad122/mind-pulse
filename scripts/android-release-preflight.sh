#!/bin/bash
# Release-readiness checks for the Android build, run before every Play
# Store upload. Fails loudly on anything that would break a Play submission;
# warns on things that need a human decision (versionCode, signing).
#
# Usage:
#   bash scripts/android-release-preflight.sh            # full check, builds bundleRelease
#   bash scripts/android-release-preflight.sh --no-bundle # skip the slow bundleRelease step
#
# No secrets are read or printed here — signing is EAS-managed (see
# BUILD_AND_RELEASE.md §3). This script only inspects generated build output.
set -euo pipefail
cd "$(dirname "$0")/.."

RUN_BUNDLE=1
for arg in "$@"; do
  case "$arg" in
    --no-bundle) RUN_BUNDLE=0 ;;
  esac
done

REQUIRED_TARGET_SDK=36
EXPECTED_PACKAGE="com.zubzen.mindpulse"
FAIL=0
WARN=0

pass() { echo "  OK   $1"; }
fail() { echo "  FAIL $1"; FAIL=1; }
warn() { echo "  WARN $1"; WARN=1; }

echo "== Android release preflight =="

if [ ! -d "android" ]; then
  echo "android/ not found — running expo prebuild first..."
  npx expo prebuild --platform android
fi

cd android

echo
echo "-- SDK / toolchain versions (resolved) --"
PROPS=$(./gradlew -q :app:properties 2>/dev/null | grep -E "^(compileSdkVersion|minSdkVersion|targetSdkVersion|buildToolsVersion|ndkVersion):")
echo "$PROPS" | sed 's/^/  /'

TARGET_SDK=$(echo "$PROPS" | awk -F': ' '/^targetSdkVersion:/ {print $2}')
COMPILE_SDK=$(echo "$PROPS" | awk -F': ' '/^compileSdkVersion:/ {print $2}')

if [ -n "$TARGET_SDK" ] && [ "$TARGET_SDK" -ge "$REQUIRED_TARGET_SDK" ]; then
  pass "targetSdk=$TARGET_SDK (>= required $REQUIRED_TARGET_SDK)"
else
  fail "targetSdk=$TARGET_SDK is below the required $REQUIRED_TARGET_SDK"
fi

if [ -n "$COMPILE_SDK" ] && [ -n "$TARGET_SDK" ] && [ "$COMPILE_SDK" -ge "$TARGET_SDK" ]; then
  pass "compileSdk=$COMPILE_SDK (>= targetSdk)"
else
  fail "compileSdk=$COMPILE_SDK is lower than targetSdk=$TARGET_SDK"
fi

echo
echo "-- Package identity --"
ACTUAL_PACKAGE=$(grep -m1 "applicationId" app/build.gradle | sed -E "s/.*applicationId ['\"]([^'\"]+)['\"].*/\1/")
if [ "$ACTUAL_PACKAGE" = "$EXPECTED_PACKAGE" ]; then
  pass "applicationId=$ACTUAL_PACKAGE"
else
  fail "applicationId=$ACTUAL_PACKAGE does not match expected $EXPECTED_PACKAGE"
fi

echo
echo "-- Versioning --"
VERSION_CODE=$(grep -m1 "versionCode" app/build.gradle | grep -oE "[0-9]+" || echo "")
VERSION_NAME=$(grep -m1 "versionName" app/build.gradle | sed -E 's/.*versionName ["'"'"']([^"'"'"']+)["'"'"'].*/\1/')
if [ -n "$VERSION_CODE" ] && [ "$VERSION_CODE" -gt 0 ]; then
  pass "versionCode=$VERSION_CODE versionName=$VERSION_NAME (local build.gradle placeholder)"
else
  fail "versionCode missing or not a positive integer"
fi
if grep -q '"appVersionSource": *"remote"' ../eas.json 2>/dev/null; then
  pass "eas.json appVersionSource=remote — EAS assigns the real, monotonically increasing versionCode for Play uploads"
  warn "the versionCode above is only this LOCAL build.gradle's placeholder — it is NOT what gets uploaded to Play unless you build outside EAS. Production releases must go through 'eas build --profile production'."
else
  warn "eas.json is not set to appVersionSource=remote — verify versionCode is bumped by hand before every Play upload; this script cannot know the last published versionCode"
fi

echo
echo "-- Signing (release buildType) --"
if grep -A3 "release {" app/build.gradle | grep -q "signingConfig signingConfigs.debug"; then
  warn "release buildType signs with the DEBUG keystore — a plain 'bundleRelease' AAB from this script is NOT Play-uploadable. Real release signing is handled by EAS Build's managed credentials (see BUILD_AND_RELEASE.md §3); this local build is for structural validation only."
else
  pass "release buildType does not use the debug signingConfig"
fi

echo
echo "-- debuggable flag --"
if grep -qE "debuggable\s+true" app/build.gradle; then
  fail "app/build.gradle explicitly sets debuggable true outside the debug buildType"
else
  pass "no explicit debuggable=true found in build.gradle (release buildType defaults to non-debuggable)"
fi

if [ "$RUN_BUNDLE" -eq 1 ]; then
  echo
  echo "-- Building release manifest + AAB (this takes a few minutes) --"
  ./gradlew :app:processReleaseMainManifest :app:bundleRelease --console=plain

  MERGED_MANIFEST="app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml"
  echo
  echo "-- Merged release manifest --"
  if [ -f "$MERGED_MANIFEST" ]; then
    pass "merged manifest generated: $MERGED_MANIFEST"

    if grep -q 'android:debuggable="true"' "$MERGED_MANIFEST"; then
      fail "merged release manifest has android:debuggable=\"true\""
    else
      pass "merged release manifest is not debuggable"
    fi

    if grep -q 'testOnly="true"' "$MERGED_MANIFEST"; then
      fail "merged release manifest has android:testOnly=\"true\""
    else
      pass "merged release manifest is not testOnly"
    fi

    echo
    echo "-- Permission inventory (merged release manifest) --"
    grep -oE 'android:name="[a-zA-Z0-9_.]*permission[a-zA-Z0-9_.]*"' "$MERGED_MANIFEST" \
      | sed -E 's/android:name="(.*)"/\1/' | sort -u | sed 's/^/  /'

    SENSITIVE_WATCHLIST="USE_EXACT_ALARM SYSTEM_ALERT_WINDOW WRITE_SETTINGS MANAGE_EXTERNAL_STORAGE QUERY_ALL_PACKAGES ACCESS_BACKGROUND_LOCATION"
    for perm in $SENSITIVE_WATCHLIST; do
      if grep -q "\"android.permission.$perm\"" "$MERGED_MANIFEST"; then
        fail "restricted/high-scrutiny permission present: android.permission.$perm — confirm this is still intentional and Play-eligible before uploading"
      fi
    done
    pass "no permission on the restricted watchlist ($SENSITIVE_WATCHLIST) found beyond what's expected above"
  else
    fail "merged release manifest not found at $MERGED_MANIFEST"
  fi

  echo
  echo "-- AAB output --"
  AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
  if [ -f "$AAB_PATH" ]; then
    SIZE=$(du -h "$AAB_PATH" | cut -f1)
    pass "AAB built: android/$AAB_PATH ($SIZE)"
  else
    fail "expected AAB not found at android/$AAB_PATH"
  fi

  echo
  echo "-- 16 KB page-size native library check --"
  bash ../scripts/check-16kb-native-libs.sh
else
  echo
  echo "(skipped bundleRelease / manifest / AAB / 16KB checks — run without --no-bundle for the full check)"
fi

echo
if [ "$FAIL" -eq 1 ]; then
  echo "== Preflight FAILED — see FAIL lines above =="
  exit 1
elif [ "$WARN" -eq 1 ]; then
  echo "== Preflight passed with warnings — review WARN lines above before uploading =="
  exit 0
else
  echo "== Preflight passed =="
  exit 0
fi
