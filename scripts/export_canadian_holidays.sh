#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

CAL_NAMES="Canadian Holidays,AdamJones.ca"
OUT_PATH="$ROOT_DIR/data/calendar/canadian-holidays.json"

START_DATE="$(date +%Y-%m-%d)"
# macOS `date` supports -v. If you're on another platform, set END_DATE manually.
END_DATE="$(date -v+730d +%Y-%m-%d)"

# Keep Swift/Clang module cache in a writable location for sandboxed runs.
export TMPDIR="${TMPDIR:-/tmp}"
export SWIFT_MODULECACHE_PATH="${SWIFT_MODULECACHE_PATH:-$TMPDIR/swift-module-cache}"
export CLANG_MODULE_CACHE_PATH="${CLANG_MODULE_CACHE_PATH:-$TMPDIR/clang-module-cache}"
mkdir -p "$SWIFT_MODULECACHE_PATH" "$CLANG_MODULE_CACHE_PATH"

# Pin a stable target to avoid arm64e SDK/toolchain interface mismatches.
xcrun swift -target arm64-apple-macosx15.0 \
  "$ROOT_DIR/scripts/export_calendar_json.swift" \
  "$CAL_NAMES" "$START_DATE" "$END_DATE" "$OUT_PATH" >/dev/null
printf '%s\n' "$OUT_PATH"
