#!/bin/bash
# Build a release APK locally (no EAS / Expo cloud build).
set -e

cd "$(dirname "$0")/.."

if [ ! -d "android" ]; then
  echo "android/ not found — running expo prebuild..."
  npx expo prebuild --platform android
fi

cd android
./gradlew assembleRelease

APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
  echo ""
  echo "APK ready: android/$APK_PATH"
else
  echo "Build finished but APK not found at expected path."
fi
