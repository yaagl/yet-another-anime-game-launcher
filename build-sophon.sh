#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

sophon_build=(--package-path vendor/SophonClientv3 -c release --product SophonCLI --arch arm64 --arch x86_64)
swift build "${sophon_build[@]}"
sophon_bin="$(swift build "${sophon_build[@]}" --show-bin-path)"
sophon_dist="$PWD/sidecar/sophon"

rm -rf "$sophon_dist"
mkdir -p "$sophon_dist"
cp "$sophon_bin/SophonCLI" "$sophon_dist/SophonCLI"
xcrun swift-stdlib-tool --copy --scan-executable "$sophon_dist/SophonCLI" \
  --destination "$sophon_dist" --platform macosx --sign -
rm -f "$sophon_dist"/*.dylib.original
install_name_tool -add_rpath '@executable_path' "$sophon_dist/SophonCLI"
codesign --force --sign - "$sophon_dist/SophonCLI"
