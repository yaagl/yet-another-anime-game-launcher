#!/bin/bash
set -euo pipefail

# Keep existing Intel releases unchanged; ARM64 is an explicit local opt-in.
case "${YAAGL_BUILD_ARCH:-x64}" in
  x64) python_target=cpython-3.13-macos-x86_64-none ;;
  arm64) python_target=cpython-3.13-macos-aarch64-none ;;
  *) echo "YAAGL_BUILD_ARCH must be x64 or arm64" >&2; exit 1 ;;
esac
nuitka_options=(--warn-implicit-exceptions --warn-unusual-code)
if [[ "${YAAGL_BUILD_ARCH:-x64}" == arm64 ]]; then
  # Nuitka 2.7's downloaded macOS ccache is Intel-only and can launch Apple's
  # compiler shim under Rosetta, failing with an ARM-only Xcode toolchain.
  nuitka_options+=(--disable-cache=ccache)
fi
if [[ -n "${YAAGL_BUILD_JOBS:-}" ]]; then
  nuitka_options+=("--jobs=$YAAGL_BUILD_JOBS")
fi
cp ./sidecar/hpatchz/hpatchz ./sophon_server/hpatchz

curl -fsSL https://github.com/protocolbuffers/protobuf/releases/download/v31.1/protoc-31.1-osx-universal_binary.zip > protobuf.zip
unzip -o -j protobuf.zip bin/protoc -d bin
rm protobuf.zip

pushd sophon_server
../bin/protoc --python_out=. *.proto
uv sync --frozen --python "$python_target"
NUITKA_CACHE_DIR=./.cache uv run --frozen --python "$python_target" nuitka \
"${nuitka_options[@]}" \
--standalone \
--python-flag=isolated \
--include-data-files=./hpatchz=./hpatchz \
--output-filename=sophon-server \
--output-dir=./build \
--assume-yes-for-downloads \
server.py
rm ./hpatchz
popd
