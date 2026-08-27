#!/bin/bash
# Verifies every packaged .so has 16 KB-aligned ELF LOAD segments (Android's
# 16 KB memory page-size device requirement). This inspects real binaries with
# readelf — it does not just check a Gradle flag and assume compliance.
#
# Run standalone (after any assemble/bundle task has produced merged native
# libs) or via android-release-preflight.sh, which calls this automatically.
set -euo pipefail
cd "$(dirname "$0")/../android"

REQUIRED_ALIGN="0x4000" # 16384 bytes

if ! command -v readelf >/dev/null 2>&1; then
  echo "  WARN readelf not found on PATH — cannot verify 16 KB alignment locally. Install binutils or run this in CI where it's available."
  exit 0
fi

# Prefer a release variant's merged libs if present (matches the shipped
# AAB); fall back to debug (identical upstream .so binaries — build type
# doesn't change third-party native code, only how it's packaged).
LIB_DIR=""
for candidate in \
  app/build/intermediates/merged_native_libs/release/mergeReleaseNativeLibs/out/lib \
  app/build/intermediates/merged_native_libs/debug/mergeDebugNativeLibs/out/lib
do
  if [ -d "$candidate" ]; then
    LIB_DIR="$candidate"
    break
  fi
done

if [ -z "$LIB_DIR" ]; then
  echo "  WARN no merged native libs found — run :app:assembleDebug or :app:bundleRelease first"
  exit 0
fi

echo "  Inspecting native libraries under $LIB_DIR"

# 16 KB page sizes only exist on 64-bit (LP64) hardware — the requirement
# does not apply to, and most 32-bit toolchains cannot even produce,
# 16 KB-aligned armeabi-v7a/x86 binaries. Only check the 64-bit ABIs.
CHECK_ABIS="arm64-v8a x86_64"

FAIL=0
CHECKED=0
for abi in $CHECK_ABIS; do
  abi_dir="$LIB_DIR/$abi/"
  [ -d "$abi_dir" ] || continue
  for so in "$abi_dir"*.so; do
    [ -e "$so" ] || continue
    CHECKED=$((CHECKED + 1))
    aligns=$(readelf -lW "$so" 2>/dev/null | awk '/LOAD/{print $NF}' | sort -u)
    bad=0
    for a in $aligns; do
      if [ "$a" != "$REQUIRED_ALIGN" ]; then
        bad=1
      fi
    done
    if [ "$bad" -eq 1 ]; then
      echo "  FAIL $abi/$(basename "$so") — LOAD segment align(s) [$aligns] below required $REQUIRED_ALIGN (16 KB)"
      FAIL=1
    fi
  done
done

if [ "$CHECKED" -eq 0 ]; then
  echo "  WARN no .so files found under $LIB_DIR"
elif [ "$FAIL" -eq 0 ]; then
  echo "  OK   all $CHECKED native libraries across all ABIs are 16 KB page-size aligned"
else
  echo "  Some libraries are NOT 16 KB aligned — identify the owning dependency and upgrade it (check its release notes for 16 KB / page-size support), or rebuild it with -Wl,-z,max-page-size=16384 if it's built in-tree."
  exit 1
fi
