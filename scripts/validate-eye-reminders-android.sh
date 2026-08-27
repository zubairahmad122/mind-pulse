#!/usr/bin/env bash
set -euo pipefail

APP_ID="com.zubzen.sleepy"

if ! command -v adb >/dev/null 2>&1; then
  echo "adb is not installed or not on PATH."
  exit 1
fi

DEVICE_COUNT="$(adb devices | awk 'NR>1 && $2 == "device" { count += 1 } END { print count + 0 }')"
if [ "$DEVICE_COUNT" -ne 1 ]; then
  echo "Connect exactly one unlocked Android device with USB debugging enabled."
  adb devices
  exit 1
fi

echo "Device"
adb shell getprop ro.product.manufacturer
adb shell getprop ro.product.model
adb shell getprop ro.build.version.release

echo "Notification permission"
adb shell dumpsys package "$APP_ID" | grep -E "POST_NOTIFICATIONS|granted=" | head -20

echo "Battery optimization allowlist"
adb shell dumpsys deviceidle whitelist | grep "$APP_ID" || echo "App is not battery-optimization allowlisted."

echo "Scheduled alarm and notification evidence"
adb shell dumpsys alarm | grep -A 4 -B 2 "$APP_ID" || echo "No app alarm entry found."
adb shell dumpsys notification --noredact | grep -A 5 -B 2 "$APP_ID" || echo "No app notification entry found."

echo "Read docs/ANDROID_EYE_REMINDER_TEST.md and complete the timed test matrix."
