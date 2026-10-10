#!/bin/bash
set -euo pipefail
# Rebuild the Intel-only helpers from upstream source; do not edit their code.
ROOT="$(cd "$(dirname "$0")" && pwd)"
WORK="$ROOT/.arm64-build"
mkdir -p "$WORK" "$WORK/output/aria2" "$WORK/output/xdelta"
if [[ "$(uname -m)" != arm64 ]]; then
  echo "Build these helpers on an Apple Silicon Mac." >&2
  exit 1
fi
curl -fL https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0.tar.xz -o "$WORK/aria2.tar.xz"
echo "60a420ad7085eb616cb6e2bdf0a7206d68ff3d37fb5a956dc44242eb2f79b66b  $WORK/aria2.tar.xz" | shasum -a 256 -c -
tar -xf "$WORK/aria2.tar.xz" -C "$WORK"
pushd "$WORK/aria2-1.37.0"
./configure --disable-nls --without-libcares --without-libxml2 \
  --without-libexpat --without-sqlite3 --without-libgmp --without-libgcrypt \
  --without-openssl --without-libnettle --with-appletls --without-libssh2 \
  --without-libz CFLAGS='-O2 -arch arm64' CXXFLAGS='-O2 -arch arm64'
make -j"${YAAGL_BUILD_JOBS:-$(sysctl -n hw.logicalcpu)}"
cp src/aria2c "$WORK/output/aria2/aria2c"
popd

# This upstream revision reports the same 3.1.1 version as the bundled helper
# and includes a CMake build; it is not a claim of identical binary provenance.
if [[ ! -d "$WORK/xdelta/.git" ]]; then
  git init "$WORK/xdelta"
fi
git -C "$WORK/xdelta" fetch --depth=1 https://github.com/jmacd/xdelta.git 83af88c87a1a2f5d163738dc5a779abf008d4811
git -C "$WORK/xdelta" checkout --detach FETCH_HEAD
XZ_PREFIX="$(brew --prefix xz)"
cmake -S "$WORK/xdelta/xdelta3" -B "$WORK/xdelta/build-arm64" \
  -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DXD3_BUILD_TESTS=OFF -DXD3_LZMA_MODE=on \
  -DLIBLZMA_LIBRARY="$XZ_PREFIX/lib/liblzma.a" \
  -DLIBLZMA_INCLUDE_DIR="$XZ_PREFIX/include"
cmake --build "$WORK/xdelta/build-arm64" --target xdelta3 \
  -j"${YAAGL_BUILD_JOBS:-$(sysctl -n hw.logicalcpu)}"
cp "$WORK/xdelta/build-arm64/xdelta3" "$WORK/output/xdelta/xdelta3"
lipo -verify_arch arm64 "$WORK/output/aria2/aria2c"
lipo -verify_arch arm64 "$WORK/output/xdelta/xdelta3"
echo "Set YAAGL_SIDECAR_DIR=$WORK/output when packaging."
