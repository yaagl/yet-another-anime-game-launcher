#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

version=2.10.1
checksum=1a856d2a9edb8e628de88121d7be04cf0e2167f8641650b78fca00b14244cf27
sdk="$PWD/bin/sparkle-$version"
archive="$sdk.tar.xz"
mkdir -p "$(dirname "$sdk")"
if [ ! -f "$archive" ]; then
  curl --fail --silent --show-error --location --retry 3 \
    "https://github.com/sparkle-project/Sparkle/releases/download/$version/Sparkle-$version.tar.xz" \
    --output "$archive.download"
  mv "$archive.download" "$archive"
fi
printf '%s  %s\n' "$checksum" "$archive" | shasum -a 256 --check --status
if [ ! -d "$sdk/Sparkle.framework" ]; then
  mkdir -p "$sdk"
  tar -xJf "$archive" -C "$sdk"
fi
xcrun clang -arch arm64 -arch x86_64 -mmacosx-version-min=10.15 \
  -fobjc-arc -Wall -Wextra -Wno-unused-parameter \
  -framework Cocoa -framework Sparkle -F "$sdk" \
  -Wl,-rpath,@executable_path/../Frameworks \
  native/updater.m -o "$sdk/yaagl-updater"
codesign --force --sign - "$sdk/yaagl-updater" >&2
printf '%s\n' "$sdk"
