# Experimental ARM64 macOS builds

The default build remains x64 so existing release filenames and Intel support
are unchanged. Native ARM64 builds are opt-in. No launcher/game implementation
changes are required by these build switches.

This is launcher and sidecar support, **not macOS 28 game compatibility**. Wine,
x86/x64 game CPU translation, graphics backends, and game startup still require
separate work (see #725). There is overlapping launcher-only work in #722.

## Build locally on Apple Silicon

Prerequisites: Xcode Command Line Tools, native ARM64 Node.js, pnpm 10, uv,
CMake, and Homebrew xz (`brew install cmake xz`). The pnpm workspace allowlist
permits the locked dependencies' required installation scripts; dependency
versions and lockfiles are unchanged.

```sh
pnpm install --frozen-lockfile
./configure.sh
./build-arm-sidecars.sh
YAAGL_BUILD_ARCH=arm64 ./build-sophon.sh
YAAGL_BUILD_ARCH=arm64 \
  YAAGL_CHANNEL_CLIENT=hk4eos \
  YAAGL_BUILD_SUFFIX=ARM \
  YAAGL_SIDECAR_DIR="$PWD/.arm64-build/output" \
  YAAGL_VERSION="$(git describe --tags --always)" \
  node ./build-app.js
codesign --force --deep --sign - "Yaagl OS ARM.app"
codesign --verify --deep --strict "Yaagl OS ARM.app"
```

`YAAGL_BUILD_SUFFIX=ARM` gives the bundle its own name, bundle identifier, and
Application Support directory. Existing apps and data are not migrated. Do not
run both launchers together: the unchanged downloader initialization uses port
6868. Official self-updates are unchanged and may replace a local ARM64 build.
The example performs local ad-hoc signing, not Developer ID signing/notarization.

`YAAGL_SIDECAR_DIR` overlays locally rebuilt helpers on the packaged sidecar
directory. The tracked sidecar binaries are not replaced. ARM64 packaging
verifies every regular Mach-O sidecar file with `lipo -verify_arch arm64`;
Windows PE files are intentionally excluded. The existing universal 7zz and
hpatchz are reused. aria2 1.37.0 is rebuilt with AppleTLS and the same enabled
features as the bundled binary, without Homebrew runtime dependencies. xdelta
3.1.1 is built from the pinned upstream revision with static liblzma; identical
version strings do not prove identical source provenance to the old binary.

`build-sophon.sh` selects matching Python with uv without changing the shared
`.python-version`. ARM64 builds disable Nuitka's downloaded Intel ccache,
which can run the compiler shim under Rosetta and fail with an ARM-only Xcode
toolchain. Downloads and compilation failures now stop the build.

## Validation and remaining work

The local precursor build (tag 0.3.18) and the package built from this branch
on macOS 27.0.1 passed:

- All 24 packaged Mach-O components include arm64; deep/strict ad-hoc signature verification.
- aria2 JSON-RPC and WebSocket version queries; HTTP and HTTPS downloads with matching hashes.
- Eight Intel-to-ARM and ARM-to-Intel xdelta encode/decode cases (none, lzma, djw, fgk).
- Packaged Sophon forced to execute as arm64: `/health` and international Genshin online-version lookup.

These are component checks, not proof of full launcher/game startup. Complete
UI/game startup, Intel-host builds, and macOS 28 are untested. The release
workflows remain unchanged: an ARM artifact naming/updater strategy and further
validation are needed before publishing architecture-specific releases.
