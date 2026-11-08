#!/usr/bin/env bash
# USB physical device → Metro over adb reverse (127.0.0.1).
# Expo's default LAN open (http://192.168.x.x:8081) often white-screens on
# USB-only / MIUI devices even when Wi‑Fi looks fine.
set -euo pipefail

PORT="${METRO_PORT:-8081}"
PKG="com.zubzen.mindpulse"
# Dev-client deep link — NOT bare exp:// (that skips the bundler URL).
DEEP_LINK="exp+mind-pulse://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A${PORT}"

echo "== devices =="
adb devices -l
DEVICE=$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')
if [[ -z "${DEVICE:-}" ]]; then
  echo "No authorized device. Unlock phone, accept USB debugging, retry."
  exit 1
fi
echo "Using $DEVICE"

echo "== metro =="
if ! curl -sf --max-time 2 "http://127.0.0.1:${PORT}/status" >/dev/null; then
  echo "Metro not reachable on 127.0.0.1:${PORT}."
  echo "Start it first:  npm run start:usb"
  exit 1
fi
curl -s --max-time 2 "http://127.0.0.1:${PORT}/status"; echo

echo "== adb reverse =="
adb -s "$DEVICE" reverse --remove-all || true
adb -s "$DEVICE" reverse "tcp:${PORT}" "tcp:${PORT}"
adb -s "$DEVICE" reverse tcp:8082 tcp:8082 || true
adb -s "$DEVICE" reverse tcp:8097 tcp:8097 || true
adb -s "$DEVICE" reverse --list

echo "== package =="
if ! adb -s "$DEVICE" shell pm path "$PKG" >/dev/null 2>&1; then
  echo "APP NOT INSTALLED — run: npm run android:usb"
  exit 1
fi

echo "== launching (localhost via reverse) =="
adb -s "$DEVICE" shell am force-stop "$PKG" || true
adb -s "$DEVICE" shell am start -n "$PKG/.MainActivity" \
  -a android.intent.action.VIEW \
  -d "$DEEP_LINK"

sleep 4
echo "== focus =="
adb -s "$DEVICE" shell dumpsys window 2>/dev/null | grep -E "mCurrentFocus" | head -2 || true
echo "== recent js =="
PID=$(adb -s "$DEVICE" shell pidof "$PKG" | tr -d '\r' || true)
if [[ -n "${PID:-}" ]]; then
  adb -s "$DEVICE" logcat -d --pid="$PID" -t 120 2>/dev/null \
    | grep -iE "ReactNativeJS|Unable to load|Unable to connect|Loading from|Running \"main\"|Bundl|TypeError|Invariant" \
    | tail -40 || true
else
  echo "(app process not found yet)"
fi

echo
echo "Done. If the screen is still blank: keep USB plugged, run this script again."
echo "Do NOT press Expo's 'a' / Open Android — it reopens the LAN IP and breaks USB."
